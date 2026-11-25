/**
 * Parser feedu dodavatele ve formátu Heureka XML (SHOP > SHOPITEM). Čistá funkce bez server-only (testy).
 * Zná standardní pole Heureky i rozšíření z Mergada (LONG_DESCRIPTION_CZ, PRICE_WITHOUT_VAT_VELKOOBCHOD_CZK…).
 */
import { XMLParser } from "fast-xml-parser";

export type FeedItem = {
  itemId: string;
  groupId: string | null;
  name: string;
  url: string | null;
  images: string[];
  vatRate: number | null;
  manufacturer: string | null;
  categoryText: string | null;
  ean: string | null;
  weightG: number | null;
  shortDescription: string | null;
  description: string | null;
  /** Ceny bez DPH v hlavních jednotkách. */
  wholesaleCzk: number | null;
  wholesaleEur: number | null;
  retailCzk: number | null;
  retailEur: number | null;
  deliveryDays: number | null;
};

const text = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "object") {
    const t = (v as Record<string, unknown>)["#text"];
    return t == null ? null : String(t).trim() || null;
  }
  const s = String(v).trim();
  return s || null;
};
const num = (v: unknown): number | null => {
  const s = text(v);
  if (s == null) return null;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const first = (o: Record<string, unknown>, keys: string[]): unknown => {
  for (const k of keys) if (o[k] != null && text(o[k]) != null) return o[k];
  return undefined;
};

export function parseHeurekaFeed(xml: string): FeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
    processEntities: true,
    htmlEntities: true,
    isArray: (name) => name === "SHOPITEM" || name === "IMGURL_ALTERNATIVE",
  });
  const doc = parser.parse(xml) as { SHOP?: { SHOPITEM?: Record<string, unknown>[] } };
  const rows = doc.SHOP?.SHOPITEM ?? [];
  const out: FeedItem[] = [];
  for (const r of rows) {
    const itemId = text(r.ITEM_ID);
    const name = text(first(r, ["PRODUCTNAME", "PRODUCT", "NAME_DISTRIBUTOR", "PRODUCTNAME_SK"]));
    if (!itemId || !name) continue;
    const vat = num(text(r.VAT)?.replace("%", ""));
    const priceVat = num(r.PRICE_VAT);
    const alt = ((r.IMGURL_ALTERNATIVE as unknown[]) ?? []).map(text).filter((x): x is string => Boolean(x));
    const img = text(r.IMGURL);
    out.push({
      itemId,
      groupId: text(r.ITEMGROUP_ID),
      name,
      url: text(r.URL),
      images: [...(img ? [img] : []), ...alt.filter((a) => a !== img)],
      vatRate: vat,
      manufacturer: text(r.MANUFACTURER),
      categoryText: text(r.CATEGORYTEXT)?.replace(/^Heureka\.cz \| /, "") ?? null,
      ean: text(r.EAN),
      weightG: num(r.WEIGHT),
      shortDescription: text(first(r, ["SHORT_DESCRIPTION_CZ", "SHORT_DESCRIPTION"])),
      description: text(first(r, ["LONG_DESCRIPTION_CZ", "DESCRIPTION"])),
      wholesaleCzk: num(r.PRICE_WITHOUT_VAT_VELKOOBCHOD_CZK),
      wholesaleEur: num(r.PRICE_WITHOUT_VAT_VELKOOBCHOD_EUR),
      retailCzk:
        num(r.PRICE_WITHOUT_VAT_VYCHOZI_CZK) ??
        (priceVat != null ? Math.round((priceVat / (1 + (vat ?? 21) / 100)) * 100) / 100 : null),
      retailEur: num(r.PRICE_WITHOUT_VAT_VYCHOZI_EUR),
      deliveryDays: num(r.DELIVERY_DATE),
    });
  }
  return out;
}
