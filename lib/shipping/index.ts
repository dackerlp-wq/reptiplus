import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type CarrierCode,
  type CarrierResult,
  type LabelResult,
  type ShipmentInput,
  type ShipmentResult,
} from "@/lib/shipping/types";
import { createPacketaShipment, getPacketaLabel } from "@/lib/shipping/packeta";
import { createPplShipment, getPplLabel } from "@/lib/shipping/ppl";

export type { CarrierCode } from "@/lib/shipping/types";

/** Mapuje `carrier` z tabulky shipping_method na podporovaného dopravce. */
export function toCarrierCode(carrier: string | null | undefined): CarrierCode | null {
  if (carrier === "zasilkovna") return "zasilkovna";
  if (carrier === "ppl") return "ppl";
  return null; // balikovna / personal / other → zatím bez API napojení
}

type OrderRow = {
  number: string;
  email: string | null;
  total: number;
  currency: string;
  shipping_method: string | null;
  payment_method: string | null;
  shipping_address: Record<string, string> | null;
};

/** Zjistí dopravce objednávky (z její shipping_method → shipping_method.carrier). */
export async function carrierForOrder(
  shippingMethodCode: string | null,
): Promise<CarrierCode | null> {
  if (!shippingMethodCode) return null;
  const svc = createServiceClient();
  const { data } = await svc
    .from("shipping_method")
    .select("carrier")
    .eq("code", shippingMethodCode)
    .maybeSingle();
  return toCarrierCode(data?.carrier);
}

/** Sestaví vstup pro dopravce z objednávky (adresa, dobírka, hodnota). */
async function buildInput(order: OrderRow): Promise<ShipmentInput> {
  const a = order.shipping_address ?? {};

  // Dobírka: pokud je platba typu „cod" (dobírka) a ještě není zaplaceno.
  let codMinor = 0;
  if (order.payment_method) {
    const svc = createServiceClient();
    const { data: pay } = await svc
      .from("payment_method")
      .select("provider")
      .eq("code", order.payment_method)
      .maybeSingle();
    if (pay?.provider === "cod") codMinor = order.total;
  }

  return {
    orderNumber: order.number,
    recipient: {
      name: a.full_name ?? "",
      street: a.street ?? "",
      city: a.city ?? "",
      zip: a.postal_code ?? "",
      country: a.country ?? "CZ",
      email: order.email ?? "",
      phone: a.phone ?? "",
      pickupPointId: a.pickup_point_id ?? undefined,
    },
    weightKg: 1,
    codMinor,
    valueMinor: order.total,
    currency: order.currency,
  };
}

/** Vytvoří zásilku u příslušného dopravce. */
export async function createShipmentForOrder(
  order: OrderRow,
): Promise<CarrierResult<ShipmentResult & { carrier: CarrierCode }>> {
  const carrier = await carrierForOrder(order.shipping_method);
  if (!carrier)
    return {
      ok: false,
      error: "Zvolený způsob dopravy nemá napojení na API (jen Zásilkovna a PPL).",
    };

  const input = await buildInput(order);
  const res =
    carrier === "zasilkovna"
      ? await createPacketaShipment(input)
      : await createPplShipment(input);

  if (!res.ok) return res;
  return { ok: true, data: { ...res.data, carrier } };
}

/** Získá PDF štítku pro daného dopravce a interní ID zásilky. */
export async function getLabel(
  carrier: CarrierCode,
  shipmentId: string,
): Promise<LabelResult> {
  return carrier === "zasilkovna"
    ? getPacketaLabel(shipmentId)
    : getPplLabel(shipmentId);
}
