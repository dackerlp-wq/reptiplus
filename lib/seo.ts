import { routing, type Locale } from "@/i18n/routing";

/** Kanonická adresa webu (bez koncového lomítka). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://reptiplus.cz").replace(
    /\/+$/,
    "",
  );
}

/** Absolutní URL z cesty (path může i nemusí začínat lomítkem). */
export function absoluteUrl(path = ""): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl()}${p === "/" ? "" : p}`;
}

/**
 * Sestaví `alternates` pro Metadata: kanonickou URL v daném jazyce
 * + hreflang varianty pro všechny jazyky (path je bez prefixu jazyka).
 */
export function localizedAlternates(locale: Locale, path = "") {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = absoluteUrl(`/${l}${clean ? `/${clean}` : ""}`);
  }
  languages["x-default"] = absoluteUrl(
    `/${routing.defaultLocale}${clean ? `/${clean}` : ""}`,
  );
  return {
    canonical: absoluteUrl(`/${locale}${clean ? `/${clean}` : ""}`),
    languages,
  };
}
