import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getPacketaStatus, type PacketaStatus } from "@/lib/shipping/packeta";
import { logOrderEvent } from "@/lib/orders/events";
import { sendOrderStatusEmail } from "@/lib/orders/notify";

/** Kódy stavů Zásilkovny (docs.packeta.com → Packet tracking → Status codes). */
export const PACKETA_DELIVERED = 7;
/** Problém, o kterém má obchod vědět: vrací se / vráceno / zrušeno / odmítnuto / propadla úložní doba / nesplňuje podmínky. */
export const PACKETA_FINAL_PROBLEM = new Set([9, 10, 11, 17, 18, 19, 20, 21, 22]);

/** Česky pojmenované stavy (Zásilkovna vrací popis v jazyce API účtu, proto vlastní překlad). */
const STATUS_CS: Record<number, string> = {
  1: "Data přijata, čeká na podání",
  2: "Podáno / přijato na pobočce",
  3: "Připraveno k expedici",
  4: "Na cestě",
  5: "Připraveno k vyzvednutí",
  6: "Předáno externímu dopravci",
  7: "Doručeno",
  9: "Na cestě zpět k odesílateli",
  10: "Vráceno odesílateli",
  11: "Zrušeno",
  12: "Svezeno do depa",
  14: "Celní řízení",
  15: "Vratka přijata na pobočce",
  16: "Neúspěšný pokus o doručení domů",
  17: "Odmítnuto příjemcem",
  18: "Odmítnuto příjemcem",
  19: "Nedoručeno domů, v okolí není pobočka — vrací se",
  20: "Uplynula úložní doba — vrací se",
  21: "Zrušeno, ale podáno — vrací se",
  22: "Nesplňuje podmínky přepravy — vrací se",
  23: "Neúspěšný pokus o vložení do Z-BOXu",
  24: "Poslední pokus o Z-BOX, nutná změna doručení",
  25: "První pokus o doručení dopravcem",
  26: "Zásilka se prošetřuje",
  27: "Prošetření uzavřeno",
  28: "Přesměrováno na oblíbené místo",
  29: "Přesměrováno (oblíbená místa plná)",
  30: "Přesměrováno (bez oblíbeného místa)",
  31: "Dopravce přidal sledovací číslo",
  32: "Příjemce změnil místo doručení",
  33: "Prázdná schránka Z-BOXu při svozu",
};

export const packetaStatusLabel = (s: PacketaStatus): string =>
  STATUS_CS[s.code] ?? (s.text || s.codeText || `Stav ${s.code}`);

type SyncOrder = {
  id: string;
  number: string;
  email: string;
  currency: string;
  locale: string | null;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_status: string | null;
  shipping_method: string | null;
  carrier_shipment_id: string | null;
};

export const SYNC_ORDER_COLUMNS =
  "id, number, email, currency, locale, status, tracking_number, tracking_url, tracking_status, shipping_method, carrier_shipment_id";

/** Kódy způsobů dopravy napojených na Zásilkovnu. */
export async function packetaShippingCodes(): Promise<string[]> {
  const { data } = await createServiceClient()
    .from("shipping_method")
    .select("code")
    .eq("carrier", "zasilkovna");
  return (data ?? []).map((m) => m.code);
}

/**
 * Zjistí stav zásilky u Zásilkovny a propíše ho do objednávky:
 * tracking_status vždy, při doručení stav objednávky `delivered` + e-mail zákazníkovi,
 * při vrácení / zrušení / odmítnutí záznam do historie. Nikdy nevyhazuje.
 */
export async function syncPacketaOrder(
  order: SyncOrder,
  author: string | null = null,
): Promise<"delivered" | "problem" | "updated" | "unchanged" | "error"> {
  if (!order.carrier_shipment_id) return "unchanged";
  const res = await getPacketaStatus(order.carrier_shipment_id);
  if (!res.ok) {
    console.error("[packeta] stav zásilky:", order.number, res.error);
    return "error";
  }

  const label = packetaStatusLabel(res.data);
  const svc = createServiceClient();
  const changed = label !== order.tracking_status;
  const delivered = res.data.code === PACKETA_DELIVERED && order.status === "shipped";

  if (changed || delivered) {
    const { error } = await svc
      .from("order")
      .update({ tracking_status: label, ...(delivered ? { status: "delivered" } : {}) } as never)
      .eq("id", order.id);
    if (error) {
      console.error("[packeta] uložení stavu:", order.number, error.message);
      return "error";
    }
  }

  if (delivered) {
    await logOrderEvent(
      order.id,
      "status",
      "Zásilkovna potvrdila doručení.",
      { from: "shipped", to: "delivered", source: "packeta", packeta_code: res.data.code },
      author,
    );
    await sendOrderStatusEmail(order, "delivered", { author });
    return "delivered";
  }
  if (changed) {
    await logOrderEvent(
      order.id,
      "shipment",
      `Zásilkovna: ${label}`,
      { carrier: "zasilkovna", packeta_code: res.data.code, at: res.data.at ?? undefined },
      author,
    );
    return PACKETA_FINAL_PROBLEM.has(res.data.code) ? "problem" : "updated";
  }
  return "unchanged";
}
