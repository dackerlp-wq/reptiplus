/** Cena dopravy podle cílové země a hmotnosti košíku (čisté funkce, bez server-only — pokladna, server i testy). */

/** Země, kam obchod doručuje (pořadí = pořadí v pokladně). Základní cena metody platí pro CZ a pro země bez vlastní ceny. */
export const SHIP_COUNTRIES = ["CZ", "SK", "DE", "AT", "PL"] as const;

/** Doprava zdarma (od částky v nastavení) platí jen pro tyto země — do zahraničí je doprava drahá. */
export const FREE_SHIPPING_COUNTRIES: readonly string[] = ["CZ", "SK"];

/** Je metoda (doprava / platba) dostupná pro zemi? `countries` null/prázdné = všude. */
export function availableIn(m: { countries?: string[] | null }, country: string | null | undefined): boolean {
  if (!m.countries || m.countries.length === 0) return true;
  return m.countries.includes((country || "CZ").toUpperCase());
}
export type ShipCountry = (typeof SHIP_COUNTRIES)[number];

export const isShipCountry = (c: unknown): c is ShipCountry =>
  typeof c === "string" && (SHIP_COUNTRIES as readonly string[]).includes(c.toUpperCase());

/** Vlastní ceny pro zemi (minor units); chybějící pole = základní cena metody. */
export type CountryPrice = {
  price_czk?: number | null;
  price_eur?: number | null;
  heavy_price_czk?: number | null;
  heavy_price_eur?: number | null;
};

export type ShippingPriceMethod = {
  price_czk: number;
  price_eur: number | null;
  heavy_from_kg?: number | null;
  heavy_price_czk?: number | null;
  heavy_price_eur?: number | null;
  /** `{"SK": {...}}` — sloupec shipping_method.country_prices. */
  country_prices?: unknown;
};

/** Hmotnost košíku v kg; položky bez zadané hmotnosti se nepočítají (= lehké). */
export function cartWeightKg(lines: { qty: number; weightKg: number | null | undefined }[]): number {
  const kg = lines.reduce((sum, l) => sum + (l.weightKg ? Number(l.weightKg) * l.qty : 0), 0);
  return Math.round(kg * 1000) / 1000;
}

function countryPrice(m: ShippingPriceMethod, country: string | null | undefined): CountryPrice {
  if (!country || !m.country_prices || typeof m.country_prices !== "object") return {};
  const v = (m.country_prices as Record<string, unknown>)[country.toUpperCase()];
  return v && typeof v === "object" ? (v as CountryPrice) : {};
}

const pick = (override: number | null | undefined, base: number | null | undefined) =>
  override != null ? override : base;

/** Cena dopravy v minor units pro zemi, měnu a hmotnost (bez dopravy zdarma). */
export function shippingPriceFor(
  m: ShippingPriceMethod,
  weightKg: number,
  currency: "CZK" | "EUR",
  country?: string | null,
): number {
  const cp = countryPrice(m, country);
  const base = currency === "CZK" ? pick(cp.price_czk, m.price_czk) : pick(cp.price_eur, m.price_eur);
  const heavy =
    currency === "CZK" ? pick(cp.heavy_price_czk, m.heavy_price_czk) : pick(cp.heavy_price_eur, m.heavy_price_eur);
  if (m.heavy_from_kg && heavy != null && weightKg > Number(m.heavy_from_kg)) return heavy;
  return base ?? 0;
}

/** Ceny metody pro všechny doručované země — pro pokladnu, která cenu mění podle zvolené země. */
export function shippingPricesByCountry(
  m: ShippingPriceMethod,
  weightKg: number,
  currency: "CZK" | "EUR",
  freeShipping = false,
): Record<ShipCountry, number> {
  return Object.fromEntries(
    SHIP_COUNTRIES.map((c) => [
      c,
      freeShipping && FREE_SHIPPING_COUNTRIES.includes(c) ? 0 : shippingPriceFor(m, weightKg, currency, c),
    ]),
  ) as Record<ShipCountry, number>;
}
