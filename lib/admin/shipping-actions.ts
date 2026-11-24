"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createShipmentForOrder, carrierForOrder } from "@/lib/shipping";
import { assertAdminUser } from "@/lib/admin/auth";
import { afterShipmentCreated } from "@/lib/orders/shipment";
import { syncPacketaOrder, SYNC_ORDER_COLUMNS } from "@/lib/shipping/packeta-sync";
import { checkPackage, GENERIC_RULE, packetaServiceFor, type PackageDims } from "@/lib/shipping/package-rules";
import { paidTierOf } from "@/lib/shipping/paid-tier";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("customer")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    throw new Error("Forbidden");
  }
}

const ORDER_COLUMNS =
  "id, number, email, total, shipping, currency, locale, shipping_method, payment_method, shipping_address, carrier_shipment_id, package_weight_kg, package_length_cm, package_width_cm, package_height_cm";

type OrderForShipment = {
  id: string;
  number: string;
  shipping: number;
  currency: string;
  shipping_method: string | null;
  shipping_address: Record<string, string> | null;
  carrier_shipment_id: string | null;
  package_weight_kg: number | null;
  package_length_cm: number | null;
  package_width_cm: number | null;
  package_height_cm: number | null;
};

const dimsOf = (o: OrderForShipment): PackageDims | null =>
  o.package_weight_kg && o.package_length_cm && o.package_width_cm && o.package_height_cm
    ? {
        weightKg: Number(o.package_weight_kg),
        lengthCm: Number(o.package_length_cm),
        widthCm: Number(o.package_width_cm),
        heightCm: Number(o.package_height_cm),
      }
    : null;

/** Kontrola balíku pro objednávku (služba podle doručení, co zákazník zaplatil). */
async function checkOrderPackage(o: OrderForShipment, p: PackageDims) {
  const carrier = await carrierForOrder(o.shipping_method);
  const addr = o.shipping_address ?? {};
  const rule = carrier === "zasilkovna" ? (packetaServiceFor(addr) ?? GENERIC_RULE) : GENERIC_RULE;
  const { data: method } = o.shipping_method
    ? await createServiceClient()
        .from("shipping_method")
        .select("price_czk, price_eur, heavy_from_kg, heavy_price_czk, heavy_price_eur, country_prices")
        .eq("code", o.shipping_method)
        .maybeSingle()
    : { data: null };
  const country = addr.pickup_point_id ? addr.pickup_point_country || addr.country : addr.country;
  const tier = paidTierOf(method, o.shipping, o.currency === "EUR" ? "EUR" : "CZK", country);
  return { carrier, check: checkPackage(rule, p, tier) };
}

/** Založí zásilku u dopravce a uloží sledování; chyba se zapíše do tracking_status. */
async function createAndRecord(order: OrderForShipment, author: string | null): Promise<boolean> {
  const svc = createServiceClient();
  const res = await createShipmentForOrder(order as never);
  if (res.ok) {
    await svc
      .from("order")
      .update({
        tracking_number: res.data.trackingNumber,
        carrier_shipment_id: res.data.shipmentId,
        tracking_url: res.data.trackingUrl,
        tracking_status: "Zásilka vytvořena",
        status: "shipped",
      } as never)
      .eq("id", order.id);
    // Historie + e-mail „odesláno" se sledováním (u dobírky s fakturou).
    await afterShipmentCreated(order.id, { author, carrier: res.data.carrier });
    return true;
  }
  // Chybu uložíme do tracking_status → zobrazí se v panelu u objednávky.
  await svc.from("order").update({ tracking_status: `Chyba: ${res.error}` } as never).eq("id", order.id);
  return false;
}

const num = (fd: FormData, k: string): number => {
  const n = parseFloat(String(fd.get(k) ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Zabalit a odeslat: uloží zváženou hmotnost a změřené rozměry, znovu zkontroluje podmínky
 * služby (stejná pravidla jako panel v prohlížeči) a teprve pak založí zásilku u dopravce.
 */
export async function packAndShipAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  const svc = createServiceClient();
  const { data } = await svc.from("order").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  const order = data as unknown as OrderForShipment | null;
  if (!order || order.carrier_shipment_id) {
    revalidatePath("/", "layout");
    return;
  }

  const p: PackageDims = {
    weightKg: num(fd, "weight_kg"),
    lengthCm: num(fd, "length_cm"),
    widthCm: num(fd, "width_cm"),
    heightCm: num(fd, "height_cm"),
  };
  const packed = {
    package_weight_kg: p.weightKg > 0 ? p.weightKg : null,
    package_length_cm: p.lengthCm > 0 ? p.lengthCm : null,
    package_width_cm: p.widthCm > 0 ? p.widthCm : null,
    package_height_cm: p.heightCm > 0 ? p.heightCm : null,
    packed_at: new Date().toISOString(),
  };
  const { check } = await checkOrderPackage(order, p);
  if (check.errors.length > 0) {
    await svc
      .from("order")
      .update({ ...packed, tracking_status: `Chyba: ${check.errors.join(" ")}` } as never)
      .eq("id", id);
    revalidatePath("/", "layout");
    return;
  }
  await svc.from("order").update(packed as never).eq("id", id);
  await createAndRecord({ ...order, ...packed }, admin.email);
  revalidatePath("/", "layout");
}

/**
 * Hromadné vytvoření zásilek pro vybrané objednávky (podání u dopravce).
 * Odešle jen zabalené objednávky (zadaná hmotnost a rozměry), které splní podmínky služby;
 * ostatní přeskočí. Vrátí souhrn, kolik zásilek vzniklo / selhalo / bylo přeskočeno.
 */
export async function bulkCreateShipmentsAction(
  fd: FormData,
): Promise<{ created: number; failed: number; skipped: number }> {
  const admin = await assertAdminUser();
  const ids = String(fd.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return { created: 0, failed: 0, skipped: 0 };

  const svc = createServiceClient();
  const { data } = await svc.from("order").select(ORDER_COLUMNS).in("id", ids);
  const orders = (data ?? []) as unknown as OrderForShipment[];

  let created = 0;
  let failed = 0;
  let skipped = 0;
  for (const order of orders) {
    if (order.carrier_shipment_id || !(await carrierForOrder(order.shipping_method))) {
      skipped++;
      continue;
    }
    const p = dimsOf(order);
    if (!p) {
      skipped++;
      await svc
        .from("order")
        .update({ tracking_status: "Chyba: nezabaleno — zadej hmotnost a rozměry v detailu objednávky." } as never)
        .eq("id", order.id);
      continue;
    }
    const { check } = await checkOrderPackage(order, p);
    if (check.errors.length > 0) {
      failed++;
      await svc.from("order").update({ tracking_status: `Chyba: ${check.errors.join(" ")}` } as never).eq("id", order.id);
      continue;
    }
    if (await createAndRecord(order, admin.email)) created++;
    else failed++;
  }

  revalidatePath("/", "layout");
  return { created, failed, skipped };
}

/** Zruší evidenci zásilky (umožní opakované vytvoření po opravě nastavení). Zadané balení zůstává. */
export async function resetShipmentAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  const svc = createServiceClient();
  await svc
    .from("order")
    .update({
      carrier_shipment_id: null,
      tracking_number: null,
      tracking_url: null,
      tracking_status: null,
    } as never)
    .eq("id", id);
  revalidatePath("/", "layout");
}

/** Ručně načte aktuální stav zásilky ze Zásilkovny (jinak to dělá denní cron). */
export async function refreshPacketaStatusAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  const svc = createServiceClient();
  const { data: order } = await svc.from("order").select(SYNC_ORDER_COLUMNS).eq("id", id).maybeSingle();
  if (!order || (await carrierForOrder(order.shipping_method)) !== "zasilkovna") return;
  const res = await syncPacketaOrder(order as never, admin.email);
  if (res === "error") {
    await svc
      .from("order")
      .update({ tracking_status: "Chyba: stav zásilky se nepodařilo načíst ze Zásilkovny" } as never)
      .eq("id", id);
  }
  revalidatePath("/", "layout");
}
