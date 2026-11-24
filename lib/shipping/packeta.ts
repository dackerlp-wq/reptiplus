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

/**
 * Chybová hláška z odpovědi Zásilkovny včetně detailu po polích
 * (`<detail><attributes><fault><name>addressId</name><fault>…</fault></fault>…`).
 */
export function packetaFault(xml: string): string {
  const base = tag(xml, "string") || tag(xml, "fault") || "neznámá chyba";
  const detail = xml.match(/<detail>([\s\S]*)<\/detail>/)?.[1] ?? "";
  const fields = [...detail.matchAll(/<name>([\s\S]*?)<\/name>\s*<fault>([\s\S]*?)<\/fault>/g)].map(
    (m) => `${m[1].trim()}: ${m[2].trim()}`,
  );
  if (fields.length > 0) return `${base} (${fields.join("; ")})`;
  // Jiné typy detailu (např. <ids>, <message>) — vrátit holý text bez tagů.
  const plain = detail.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain ? `${base} (${plain})` : base;
}

async function postXml(body: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8" },
    body,
    cache: "no-store",
  });
  return res.text();
}

const trackingLang = (locale?: string): string =>
  locale === "en" || locale === "de" ? locale : "cs";

/** Jméno/příjmení: max 32 znaků, jen písmena, číslice, mezera a , . ' - & ( ) (PacketAttributes). */
const cleanName = (v: string): string =>
  v.replace(/[^\p{L}\p{N} ,.'\-&()]/gu, "").replace(/\s+/g, " ").trim().slice(0, 32);

/** Text adresy: max 32 znaků. */
const clip = (v: string | undefined, max = 32): string => (v ?? "").trim().slice(0, max);

/** Telefon jen ve tvaru, který Zásilkovna přijme (jinak odmítne celou zásilku); e-mail stačí. */
export function cleanPhone(v: string | undefined): string | null {
  const p = (v ?? "").replace(/[\s().-]/g, "").replace(/^00/, "+");
  return /^\+?\d{9,15}$/.test(p) ? p : null;
}

/** „Dlouhá 12/3" → ulice „Dlouhá" + číslo „12/3" (pro doručení na adresu jsou povinná zvlášť). */
export function splitStreet(v: string | undefined): { street: string; houseNumber: string } {
  const t = (v ?? "").trim();
  const m = t.match(/^(.*\S)\s+(\d+[\w/-]*)$/u);
  return m ? { street: m[1], houseNumber: m[2] } : { street: t, houseNumber: "" };
}

/** Maximální hodnota zásilky dle podmínek Zásilkovny (pojištění) — vyšší hodnotu API odmítne. */
const MAX_VALUE: Record<string, number> = { CZK: 20000, EUR: 700 };

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
  const split = splitName(r.name);
  const name = cleanName(split.name);
  const surname = cleanName(split.surname);
  if (!name || !surname) return { ok: false, error: "Chybí jméno a příjmení příjemce." };
  const value = Math.min(toMajor(input.valueMinor), MAX_VALUE[input.currency] ?? Infinity);
  // Dobírka v CZK musí být celé číslo.
  const cod = input.currency === "CZK" ? Math.round(toMajor(input.codMinor)) : toMajor(input.codMinor);
  const phone = cleanPhone(r.phone);
  if (!r.email && !phone) return { ok: false, error: "Chybí e-mail i platný telefon příjemce." };
  const addr = splitStreet(r.street);

  // PUDO (výdejní místo) → addressId; jinak doručení na adresu → homeCarrierId + adresa.
  const isPudo = Boolean(r.pickupPointId);
  if (!isPudo && !cfg.homeCarrierId) {
    return {
      ok: false,
      error:
        "Chybí ID dopravce pro doručení na adresu (homeCarrierId v nastavení Zásilkovny). Pro výdejní místa není potřeba.",
    };
  }

  if (!isPudo && !addr.houseNumber) {
    return { ok: false, error: `V adrese „${r.street ?? ""}" chybí číslo popisné — oprav adresu v objednávce.` };
  }

  const attrs = [
    `<number>${esc(input.orderNumber)}</number>`,
    `<name>${esc(name)}</name>`,
    `<surname>${esc(surname)}</surname>`,
    r.email ? `<email>${esc(r.email)}</email>` : "",
    phone ? `<phone>${esc(phone)}</phone>` : "",
    `<cod>${cod}</cod>`,
    `<value>${value}</value>`,
    `<currency>${esc(input.currency)}</currency>`,
    `<weight>${input.weightKg}</weight>`,
    cfg.eshopId ? `<eshop>${esc(cfg.eshopId)}</eshop>` : "",
    isPudo
      ? `<addressId>${esc(r.pickupPointId!)}</addressId>` +
        (r.carrierPickupPoint ? `<carrierPickupPoint>${esc(r.carrierPickupPoint)}</carrierPickupPoint>` : "")
      : [
          `<addressId>${esc(cfg.homeCarrierId)}</addressId>`,
          `<street>${esc(clip(addr.street))}</street>`,
          `<houseNumber>${esc(clip(addr.houseNumber, 16))}</houseNumber>`,
          `<city>${esc(clip(r.city))}</city>`,
          `<zip>${esc((r.zip ?? "").replace(/\s+/g, ""))}</zip>`,
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
    const fault = packetaFault(resp);
    return { ok: false, error: `Zásilkovna odmítla zásilku: ${fault}` };
  }

  const id = tag(resp, "id") ?? "";
  const barcode = tag(resp, "barcode") ?? id;
  return {
    ok: true,
    data: {
      shipmentId: id,
      trackingNumber: barcode,
      // Sledování podle ID zásilky (docs.packeta.com → Packet tracking), v jazyce objednávky.
      trackingUrl: `https://tracking.packeta.com/${trackingLang(input.locale)}/?id=${encodeURIComponent(id)}`,
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
    const fault = packetaFault(resp);
    return { ok: false, error: `Štítek se nepodařilo získat: ${fault}` };
  }
  const pdfBase64 = tag(resp, "result") ?? "";
  if (!pdfBase64) return { ok: false, error: "Zásilkovna nevrátila PDF štítku." };
  return { ok: true, data: { pdfBase64 } };
}

/** Stav zásilky z Packeta API (`packetStatus`). */
export type PacketaStatus = {
  /** Číselný kód stavu (7 = doručeno, 10 = vráceno odesílateli, 11 = zrušeno…). */
  code: number;
  /** Strojový název stavu (např. `delivered`). */
  codeText: string;
  /** Lidsky čitelný popis stavu od Zásilkovny. */
  text: string;
  /** Kdy stav nastal (ISO řetězec od Zásilkovny). */
  at: string | null;
};

export async function getPacketaStatus(packetId: string): Promise<CarrierResult<PacketaStatus>> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: "Zásilkovna není nakonfigurována." };

  const xml = `<packetStatus><apiPassword>${esc(cfg.apiPassword)}</apiPassword><packetId>${esc(packetId)}</packetId></packetStatus>`;
  let resp: string;
  try {
    resp = await postXml(xml);
  } catch (e) {
    return { ok: false, error: `Zásilkovna nedostupná: ${String(e)}` };
  }
  if (tag(resp, "status") !== "ok") {
    const fault = packetaFault(resp);
    return { ok: false, error: `Stav zásilky se nepodařilo zjistit: ${fault}` };
  }
  const code = Number(tag(resp, "statusCode") ?? NaN);
  if (!Number.isFinite(code)) return { ok: false, error: "Zásilkovna nevrátila stav zásilky." };
  return {
    ok: true,
    data: {
      code,
      codeText: tag(resp, "codeText") ?? "",
      text: tag(resp, "statusText") ?? "",
      at: tag(resp, "dateTime"),
    },
  };
}
