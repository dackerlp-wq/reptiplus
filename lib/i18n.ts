import { routing, type Locale } from "@/i18n/routing";

export const localeCurrency: Record<Locale, "CZK" | "EUR"> = {
  cs: "CZK",
  en: "EUR",
  de: "EUR",
};

const intlLocaleMap: Record<Locale, string> = {
  cs: "cs-CZ",
  en: "en-IE",
  de: "de-DE",
};

/** Normalizuje případný neplatný vstup na podporované locale (fallback na výchozí). */
function safeLocale(locale: Locale): Locale {
  return (routing.locales as readonly string[]).includes(locale)
    ? locale
    : routing.defaultLocale;
}

/** minor units (haléře / eurocenty) → naformátovaná cena podle locale */
export function formatPrice(minor: number, locale: Locale): string {
  const loc = safeLocale(locale);
  const currency = localeCurrency[loc];
  return new Intl.NumberFormat(intlLocaleMap[loc], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CZK" ? 0 : 2,
  }).format(minor / 100);
}

/** vybere cenu produktu/varianty ve správné měně dle locale */
export function priceForLocale(
  row: { price_czk: number | null; price_eur: number | null },
  locale: Locale,
): number {
  return localeCurrency[safeLocale(locale)] === "CZK"
    ? (row.price_czk ?? 0)
    : (row.price_eur ?? 0);
}

/** porovnávací (původní) cena ve správné měně, nebo null */
export function compareForLocale(
  row: { compare_at_czk: number | null; compare_at_eur: number | null },
  locale: Locale,
): number | null {
  return localeCurrency[safeLocale(locale)] === "CZK"
    ? row.compare_at_czk
    : row.compare_at_eur;
}

/** procento slevy (kladné celé číslo) nebo null */
export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round((1 - price / compareAt) * 100);
}

type I18nField = Record<string, string | undefined> | null | undefined;

/** přeložená hodnota s fallbackem na cs, pak na base text */
export function pickI18n(
  field: I18nField,
  locale: Locale,
  fallback: string | null = "",
): string {
  return field?.[locale] ?? field?.cs ?? fallback ?? "";
}
