/** Cena dopravy podle hmotnosti košíku (čisté funkce, bez server-only — používá je pokladna i testy). */

export type ShippingPriceMethod = {
  price_czk: number;
  price_eur: number | null;
  heavy_from_kg?: number | null;
  heavy_price_czk?: number | null;
  heavy_price_eur?: number | null;
};

/** Hmotnost košíku v kg; položky bez zadané hmotnosti se nepočítají (= lehké). */
export function cartWeightKg(lines: { qty: number; weightKg: number | null | undefined }[]): number {
  const kg = lines.reduce((sum, l) => sum + (l.weightKg ? Number(l.weightKg) * l.qty : 0), 0);
  return Math.round(kg * 1000) / 1000;
}

/** Cena dopravy v minor units pro danou měnu a hmotnost (bez dopravy zdarma). */
export function shippingPriceFor(
  m: ShippingPriceMethod,
  weightKg: number,
  currency: "CZK" | "EUR",
): number {
  const base = (currency === "CZK" ? m.price_czk : m.price_eur) ?? 0;
  const heavy = currency === "CZK" ? m.heavy_price_czk : m.heavy_price_eur;
  if (m.heavy_from_kg && heavy != null && weightKg > Number(m.heavy_from_kg)) return heavy;
  return base;
}
