import "server-only";
import { createClient } from "@/lib/supabase/server";

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

/** Publikované LEDX řady pro stránku Profi osvětlení (řazené). */
export async function getLedxLines(): Promise<LedxLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ledx_line")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    subtitle: r.subtitle ?? "",
    tagline: r.tagline ?? "",
    landingDesc: r.landing_desc ?? "",
    landingPills: arr(r.landing_pills),
    detailLead: r.detail_lead ?? "",
    detailPills: arr(r.detail_pills),
    modelsNote: r.models_note ?? "",
    models: rows2d(r.models),
    params: rows2d(r.params),
    usesTitle: r.uses_title ?? "",
    uses: arr(r.uses),
    images: arr(r.images),
    formModels: arr(r.form_models),
    formCct: arr(r.form_cct),
    formCctFixed: r.form_cct_fixed,
    formUhel: arr(r.form_uhel),
  }));
}
