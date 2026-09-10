import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getContentI18n } from "@/lib/settings";
import {
  LEDX_PAGE_DEFAULTS,
  LEDX_PAGE_SETTING,
  normalizeLedxPage,
  pick,
} from "@/lib/ledx/content";

export type LedxLine = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  landingDesc: string;
  landingPills: string[];
  detailLead: string;
  detailPills: string[];
  modelsNote: string;
  models: string[][];
  params: string[][];
  /** Prázdné = použij výchozí nadpis z překladů UI. */
  usesTitle: string;
  uses: string[];
  images: string[];
  formModels: string[];
  formCct: string[];
  formCctFixed: string | null;
  formUhel: string[];
};

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];
const rows2d = (v: unknown): string[][] =>
  Array.isArray(v) ? v.map((r) => (Array.isArray(r) ? r.map(String) : [])) : [];

type Row = Record<string, unknown> & {
  id: string;
  slug: string;
  name: string;
  translations?: unknown;
};

/** Mapuje DB řádek na LedxLine v daném jazyce (chybějící překlad → čeština). */
function localize(r: Row, locale: string): LedxLine {
  const all = (r.translations ?? {}) as Record<string, Record<string, unknown>>;
  const tr = locale !== "cs" ? (all[locale] ?? {}) : {};

  const txt = (col: string): string => {
    const t = tr[col];
    if (typeof t === "string" && t.trim()) return t;
    return typeof r[col] === "string" ? (r[col] as string) : "";
  };
  const list = (col: string): string[] => {
    const t = arr(tr[col]);
    return t.length ? t : arr(r[col]);
  };
  const table = (col: string): string[][] => {
    const t = rows2d(tr[col]);
    return t.length ? t : rows2d(r[col]);
  };

  const usesTr = tr.uses_title;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    subtitle: txt("subtitle"),
    tagline: txt("tagline"),
    landingDesc: txt("landing_desc"),
    landingPills: list("landing_pills"),
    detailLead: txt("detail_lead"),
    detailPills: list("detail_pills"),
    modelsNote: txt("models_note"),
    models: table("models"),
    params: table("params"),
    // Český nadpis „Kde se hodí" nechceme na EN/DE stránce → bez překladu výchozí z UI.
    usesTitle:
      locale === "cs"
        ? String(r.uses_title ?? "")
        : typeof usesTr === "string"
          ? usesTr
          : "",
    uses: list("uses"),
    images: arr(r.images),
    formModels: list("form_models"),
    formCct: list("form_cct"),
    formCctFixed: txt("form_cct_fixed") || null,
    formUhel: list("form_uhel"),
  };
}

/** Publikované LEDX řady pro stránku Profi osvětlení (řazené). */
export async function getLedxLines(locale: string): Promise<LedxLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ledx_line")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []).map((r) => localize(r as unknown as Row, locale));
}

export type LedxPageContent = {
  stats: { value: string; label: string }[];
  references: { image: string; caption: string }[];
};

/** Statistiky a reference (z adminu, jinak výchozí hodnoty) v daném jazyce. */
export async function getLedxPageContent(locale: string): Promise<LedxPageContent> {
  let setting = LEDX_PAGE_DEFAULTS;
  try {
    const stored = normalizeLedxPage(await getContentI18n(LEDX_PAGE_SETTING));
    if (stored) setting = stored;
  } catch {
    // výchozí hodnoty
  }
  return {
    stats: setting.stats.map((s) => ({
      value: pick(s.value, locale),
      label: pick(s.label, locale),
    })),
    references: setting.references.map((r) => ({
      image: r.image,
      caption: pick(r.caption, locale),
    })),
  };
}
