import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/lib/themes";

export type ShopContact = {
  name: string;
  email: string;
  phone: string;
  ico: string;
  dic: string;
  address: string;
  registration: string;
  /** Bankovní spojení pro platby převodem (LEDX objednávky, faktury). */
  bankAccount: string;
  iban: string;
  bic: string;
  /** Otevírací doba / provozní doba (víceřádkový text, stránka Kontakt). */
  openingHours: string;
};

/** Obecné nastavení obchodu (identifikace prodejce) z app_setting. */
export async function getShopContact(): Promise<ShopContact> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("app_setting")
    .select("value")
    .eq("key", "shop.general")
    .maybeSingle();
  const v = (data?.value ?? {}) as Record<string, string | undefined>;
  return {
    name: v.name ?? "Reptiplus",
    email: v.email ?? "info@reptiplus.cz",
    phone: v.phone ?? "",
    ico: v.ico ?? "",
    dic: v.dic ?? "",
    address: v.address ?? "",
    registration: v.registration ?? "",
    bankAccount: v.bankAccount ?? "",
    iban: v.iban ?? "",
    bic: v.bic ?? "",
    openingHours: v.openingHours ?? "",
  };
}

/** Aktivní barevná varianta webu z app_setting (klíč `appearance.theme`). */
export async function getActiveTheme(): Promise<ThemeKey> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("app_setting")
      .select("value")
      .eq("key", "appearance.theme")
      .maybeSingle();
    const theme = (data?.value as { theme?: string } | null)?.theme;
    return isThemeKey(theme) ? theme : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export type HeroStyle = "light" | "logo" | "logo-dark";

/** Styl hero carouselu na homepage z app_setting (`appearance.hero`). */
export async function getHeroStyle(): Promise<HeroStyle> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("app_setting")
      .select("value")
      .eq("key", "appearance.hero")
      .maybeSingle();
    const style = (data?.value as { style?: string } | null)?.style;
    return style === "logo" || style === "logo-dark" ? style : "light";
  } catch {
    return "light";
  }
}

export type LegalKey = "legal.terms" | "legal.privacy" | "legal.claims";

/** i18n obsah právní stránky z app_setting (editovatelné v adminu). */
export async function getLegalContent(
  key: LegalKey,
): Promise<Record<string, string>> {
  return getContentI18n(key);
}

export type AnalyticsConfig = {
  ga4: string;
  sklik: string;
  metaPixel: string;
};

/** ID analytických/marketingových nástrojů z app_setting (integrations.analytics). */
export async function getAnalyticsConfig(): Promise<AnalyticsConfig> {
  const v = (await getContentI18n("integrations.analytics")) as Record<
    string,
    string
  >;
  return {
    ga4: v.ga4 ?? "",
    sklik: v.sklik ?? "",
    metaPixel: v.metaPixel ?? "",
  };
}

/** Veřejný API klíč Zásilkovny (Packeta) pro widget výdejních míst. */
export async function getPacketaApiKey(): Promise<string> {
  const v = (await getContentI18n("integrations.zasilkovna")) as Record<
    string,
    string
  >;
  return v.apiKey ?? "";
}

/** Obecné i18n textové nastavení z app_setting (např. content.about). */
export async function getContentI18n(
  key: string,
): Promise<Record<string, string>> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("app_setting")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value ?? {}) as Record<string, string>;
}

export type ShippingSettings = { freeFromCzk: number | null; freeFromEur: number | null };

/** Doprava zdarma od částky (minor units) — `app_setting` klíč `shipping.settings`. */
export async function getShippingSettings(): Promise<ShippingSettings> {
  const v = (await getContentI18n("shipping.settings").catch(() => ({}))) as Record<string, unknown>;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.round(x) : null);
  return { freeFromCzk: num(v.freeFromCzk), freeFromEur: num(v.freeFromEur) };
}

/** Limit dopravy zdarma pro měnu (null = vypnuto). */
export function freeShippingThreshold(s: ShippingSettings, currency: "CZK" | "EUR"): number | null {
  return currency === "CZK" ? s.freeFromCzk : s.freeFromEur;
}

export type NewsletterSettings = {
  discountCzk: number; // minor units; 0 = bez slevy
  minOrderCzk: number; // minor units
  validDays: number;
};

/** Nastavení newsletteru (sleva za přihlášení) — `app_setting` klíč `newsletter.settings`. */
export async function getNewsletterSettings(): Promise<NewsletterSettings> {
  const v = (await getContentI18n("newsletter.settings").catch(() => ({}))) as Record<string, unknown>;
  const num = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.round(x) : d);
  return {
    discountCzk: num(v.discountCzk, 10000),
    minOrderCzk: num(v.minOrderCzk, 100000),
    validDays: num(v.validDays, 30),
  };
}
