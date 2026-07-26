/**
 * Barevné varianty webu (přepínatelné v adminu → Nastavení → Vzhled).
 *
 * Aktivní varianta se ukládá do `app_setting` (klíč `appearance.theme`) a
 * promítá se jako `data-theme` na `<html>` (viz app/[locale]/layout.tsx).
 * Konkrétní hodnoty tokenů pro každou variantu jsou v `app/globals.css`
 * (bloky `html[data-theme="..."]`). Swatche níže jsou jen pro náhled v adminu.
 *
 * ⚠️ Klíče a swatche drž v souladu s přepisy v globals.css.
 */

export type ThemeKey = "les" | "logo" | "logo-plus" | "logo-tepla";

export type ThemeDef = {
  key: ThemeKey;
  name: string;
  description: string;
  /** Náhledové barvy pro admin (primární, světlá, akcent, pozadí). */
  swatch: { primary: string; light: string; accent: string; bg: string };
};

export const THEMES: readonly ThemeDef[] = [
  {
    key: "les",
    name: "Výchozí (les)",
    description: "Původní tmavě lesní zelená.",
    swatch: { primary: "#2e6b0a", light: "#4a9018", accent: "#c08a20", bg: "#f7f4ef" },
  },
  {
    key: "logo",
    name: "Logo",
    description: "Zelená sladěná s logem – svěží olivově zelená.",
    swatch: { primary: "#4f8121", light: "#77ad2e", accent: "#c08a20", bg: "#f7f4ef" },
  },
  {
    key: "logo-plus",
    name: "Logo výrazná",
    description: "Zelená z loga i v akcentech, monochromatičtější vzhled.",
    swatch: { primary: "#4f8121", light: "#77ad2e", accent: "#7aa33a", bg: "#eef3e6" },
  },
  {
    key: "logo-tepla",
    name: "Logo teplá",
    description: "Zelená z loga s teplejším krémovým pozadím a zlatými akcenty.",
    swatch: { primary: "#56831f", light: "#77ad2e", accent: "#b9831d", bg: "#f8f4ea" },
  },
] as const;

export const DEFAULT_THEME: ThemeKey = "les";

const THEME_KEYS = THEMES.map((t) => t.key);

export function isThemeKey(v: string | null | undefined): v is ThemeKey {
  return !!v && (THEME_KEYS as string[]).includes(v);
}
