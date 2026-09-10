/**
 * Sdílené typy a výchozí hodnoty pro stránku Profi osvětlení (LEDX).
 * Bez "server-only" — používá je i admin formulář.
 */

export type Loc = "cs" | "en" | "de";
export const LOCS: Loc[] = ["cs", "en", "de"];
export type I18nText = Partial<Record<Loc, string>>;

/** Klíč v app_setting pro obsah stránky (statistiky + reference). */
export const LEDX_PAGE_SETTING = "ledx.page";

export type LedxStat = { value: I18nText; label: I18nText };
export type LedxReference = { image: string; caption: I18nText };
export type LedxPageSetting = { stats: LedxStat[]; references: LedxReference[] };

/** Výchozí obsah (odpovídá původně natvrdo zapsaným hodnotám). `*95*` = zvýrazněné číslo. */
export const LEDX_PAGE_DEFAULTS: LedxPageSetting = {
  stats: [
    {
      value: { cs: "CRI až *95*", en: "CRI up to *95*", de: "CRI bis *95*" },
      label: { cs: "Věrné podání barev", en: "True colour rendering", de: "Naturgetreue Farbwiedergabe" },
    },
    {
      value: { cs: "až *74 000* lm", en: "up to *74,000* lm", de: "bis *74.000* lm" },
      label: { cs: "Světelný tok (480 W)", en: "Luminous flux (480 W)", de: "Lichtstrom (480 W)" },
    },
    {
      value: { cs: "IP*65*/*66*", en: "IP*65*/*66*", de: "IP*65*/*66*" },
      label: {
        cs: "Krytí do náročných provozů",
        en: "Protection for demanding environments",
        de: "Schutzart für anspruchsvolle Umgebungen",
      },
    },
    {
      value: { cs: "až *150* lm/W", en: "up to *150* lm/W", de: "bis *150* lm/W" },
      label: { cs: "Světelná účinnost", en: "Luminous efficacy", de: "Lichtausbeute" },
    },
  ],
  references: [
    {
      image: "/ledx/ref-1.jpg",
      caption: { cs: "Teraristická expozice", en: "Terrarium exhibit", de: "Terrarienanlage" },
    },
    {
      image: "/ledx/ref-2.jpg",
      caption: { cs: "Krokodýlí ZOO Protivín", en: "Crocodile Zoo Protivín", de: "Krokodilzoo Protivín" },
    },
    {
      image: "/ledx/ref-3.jpg",
      caption: { cs: "Krokodýlí ZOO Protivín", en: "Crocodile Zoo Protivín", de: "Krokodilzoo Protivín" },
    },
  ],
};

const text = (v: unknown): I18nText => {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: I18nText = {};
  for (const l of LOCS) {
    const s = typeof o[l] === "string" ? (o[l] as string).trim() : "";
    if (s) out[l] = s.slice(0, 300);
  }
  return out;
};

/** Validuje a normalizuje uložené/odeslané nastavení (neznámé klíče zahodí). */
export function normalizeLedxPage(v: unknown): LedxPageSetting | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.stats) && !Array.isArray(o.references)) return null;
  const stats = (Array.isArray(o.stats) ? o.stats : [])
    .map((s) => {
      const r = (s ?? {}) as Record<string, unknown>;
      return { value: text(r.value), label: text(r.label) };
    })
    .filter((s) => s.value.cs)
    .slice(0, 8);
  const references = (Array.isArray(o.references) ? o.references : [])
    .map((s) => {
      const r = (s ?? {}) as Record<string, unknown>;
      const image = typeof r.image === "string" ? r.image.trim() : "";
      return { image, caption: text(r.caption) };
    })
    .filter((r) => r.image.startsWith("/") || r.image.startsWith("https://"))
    .slice(0, 24);
  return { stats, references };
}

/** Přeložený text s fallbackem na češtinu. */
export const pick = (t: I18nText, locale: string) =>
  t[locale as Loc] || t.cs || "";
