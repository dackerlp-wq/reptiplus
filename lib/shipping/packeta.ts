import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type CarrierResult,
  type LabelResult,
  type ShipmentInput,
  type ShipmentResult,
  toMajor,
} from "@/lib/shipping/types";

/**
 * Zásilkovna (Packeta) — REST API s XML tělem.
 * Docs: https://docs.packeta.com/  Endpoint: https://www.zasilkovna.cz/api/rest
 *
 * Konfigurace z app_setting `integrations.zasilkovna`:
 *   { apiKey, apiPassword, eshopId, homeCarrierId? }
 * apiPassword se používá pro backend volání; homeCarrierId je ID dopravce pro
 * doručení na adresu (liší se dle země/služby, doplní se z Packeta portálu).
 */

const ENDPOINT = "https://www.zasilkovna.cz/api/rest";

type PacketaConfig = {
  apiPassword: string;
  eshopId: string;
  /** ID dopravce pro doručení na adresu (home delivery). Pro PUDO se nepoužije. */
  homeCarrierId: string;
};

async function getConfig(): Promise<PacketaConfig | null> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("app_setting")
      .select("value")
      .eq("key", "integrations.zasilkovna")
      .maybeSingle();
    const v = (data?.value ?? {}) as Record<string, string>;
    const apiPassword = v.apiPassword || process.env.PACKETA_API_PASSWORD || "";
    if (!apiPassword) return null;
    return {
      apiPassword,
      eshopId: v.eshopId || process.env.PACKETA_ESHOP_ID || "",
      homeCarrierId: v.homeCarrierId || process.env.PACKETA_HOME_CARRIER_ID || "",
    };
  } catch {
    return null;
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const tag = (xml: string, name: string): string | null => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : null;
};

async function postXml(body: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body,
    cache: "no-store",
  });
  return res.text();
}

/** Rozdělí "Jan Novák" na jméno a příjmení (Packeta chce zvlášť). */
function splitName(full: string): { name: string; surname: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

export async function createPacketaShipment(
  input: ShipmentInput,
): Promise<CarrierResult<ShipmentResult>> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: "Zásilkovna není nakonfigurována (chybí API heslo)." };

  const r = input.recipient;
  const { name, surname } = splitName(r.name);
  const value = toMajor(input.valueMinor);
  const cod = toMajor(input.codMinor);

  // PUDO (výdejní místo) → addressId; jinak doručení na adresu → homeCarrierId + adresa.
  const isPudo = Boolean(r.pickupPointId);
  if (!isPudo && !cfg.homeCarrierId) {
    return {
      ok: false,
      error:
        "Chybí ID dopravce pro doručení na adresu (homeCarrierId v nastavení Zásilkovny). Pro výdejní místa není potřeba.",
    };
  }

  const attrs = [
    `<number>${esc(input.orderNumber)}</number>`,
    `<name>${esc(name)}</name>`,
    `<surname>${esc(surname)}</surname>`,
    r.email ? `<email>${esc(r.email)}</email>` : "",
    r.phone ? `<phone>${esc(r.phone)}</phone>` : "",
    `<cod>${cod}</cod>`,
    `<value>${value}</value>`,
    `<currency>${esc(input.currency)}</currency>`,
    `<weight>${input.weightKg}</weight>`,
    cfg.eshopId ? `<eshop>${esc(cfg.eshopId)}</eshop>` : "",
    isPudo
      ? `<addressId>${esc(r.pickupPointId!)}</addressId>`
      : [
          `<addressId>${esc(cfg.homeCarrierId)}</addressId>`,
          `<street>${esc(r.street ?? "")}</street>`,
          `<city>${esc(r.city ?? "")}</city>`,
          `<zip>${esc(r.zip ?? "")}</zip>`,
        ].join(""),
  ]
    .filter(Boolean)
    .join("");

  const xml = `<createPacket><apiPassword>${esc(cfg.apiPassword)}</apiPassword><packetAttributes>${attrs}</packetAttributes></createPacket>`;

  let resp: string;
  try {
    resp = await postXml(xml);
  } catch (e) {
    return { ok: false, error: `Zásilkovna nedostupná: ${String(e)}` };
  }

  if (tag(resp, "status") !== "ok") {
    const fault = tag(resp, "string") || tag(resp, "fault") || "neznámá chyba";
    return { ok: false, error: `Zásilkovna odmítla zásilku: ${fault}` };
  }

  const id = tag(resp, "id") ?? "";
  const barcode = tag(resp, "barcode") ?? id;
  return {
    ok: true,
    data: {
      shipmentId: id,
      trackingNumber: barcode,
      trackingUrl: `https://tracking.packeta.com/cs/?id=${encodeURIComponent(barcode)}`,
    },
  };
}

export async function getPacketaLabel(packetId: string): Promise<LabelResult> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: "Zásilkovna není nakonfigurována." };

  const xml = `<packetLabelPdf><apiPassword>${esc(cfg.apiPassword)}</apiPassword><packetId>${esc(packetId)}</packetId><format>A6 on A4</format><offset>0</offset></packetLabelPdf>`;

  let resp: string;
  try {
    resp = await postXml(xml);
  } catch (e) {
    return { ok: false, error: `Zásilkovna nedostupná: ${String(e)}` };
  }
  if (tag(resp, "status") !== "ok") {
    const fault = tag(resp, "string") || tag(resp, "fault") || "neznámá chyba";
    return { ok: false, error: `Štítek se nepodařilo získat: ${fault}` };
  }
  const pdfBase64 = tag(resp, "result") ?? "";
  if (!pdfBase64) return { ok: false, error: "Zásilkovna nevrátila PDF štítku." };
  return { ok: true, data: { pdfBase64 } };
}
