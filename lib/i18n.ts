import type { Locale } from "@/i18n/routing";

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

/** minor units (haléře / eurocenty) → naformátovaná cena podle locale */
export function formatPrice(minor: number, locale: Locale): string {
  const currency = localeCurrency[locale];
  return new Intl.NumberFormat(intlLocaleMap[locale], {
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
  return localeCurrency[locale] === "CZK"
    ? (row.price_czk ?? 0)
    : (row.price_eur ?? 0);
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
