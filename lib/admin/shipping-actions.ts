"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createShipmentForOrder } from "@/lib/shipping";

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

/** Vytvoří zásilku u dopravce a uloží tracking + interní ID pro tisk štítku. */
export async function createShipmentAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) return;

  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select(
      "id, number, email, total, currency, shipping_method, payment_method, shipping_address, carrier_shipment_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) return;

  // Zásilka už existuje → nevytvářet znovu (nejdřív je potřeba ji zrušit).
  if (order.carrier_shipment_id) {
    revalidatePath("/", "layout");
    return;
  }

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
      .eq("id", id);
  } else {
    // Chybu uložíme do tracking_status → zobrazí se v panelu u objednávky.
    await svc
      .from("order")
      .update({ tracking_status: `Chyba: ${res.error}` } as never)
      .eq("id", id);
  }
  revalidatePath("/", "layout");
}

/** Zruší evidenci zásilky (umožní opakované vytvoření po opravě nastavení). */
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
