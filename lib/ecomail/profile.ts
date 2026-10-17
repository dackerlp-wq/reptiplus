/**
 * Čisté výpočty profilu zákazníka pro Ecomail (vlastní pole kontaktu a štítky zájmů).
 * Bez `server-only`, aby šly testovat.
 */

export type ProfileOrder = {
  number: string;
  status: string;
  currency: string;
  /** Celkem v minor units (haléře / centy). */
  total: number;
  created_at: string;
  items: { product_id: string | null; qty: number; line_total: number }[];
};

export type RootCategory = { slug: string; name: string };

export type CustomerProfile = {
  pocet_objednavek: number;
  celkova_utrata_czk: number;
  prumerna_objednavka_czk: number;
  /** YYYY-MM-DD */
  prvni_objednavka: string;
  posledni_objednavka: string;
  posledni_objednavka_cislo: string;
  posledni_objednavka_stav: string;
  top_kategorie: string;
  /** Štítky zájmů `zajem-<slug kořenové kategorie>`, seřazené podle útraty. */
  zajmy: string[];
};

export const TAG_INTEREST_PREFIX = "zajem-";
const MAX_INTERESTS = 10;
const FALLBACK_EUR_RATE = 25;

/** Štítek pro Ecomail: malá písmena, jen a-z0-9-, max 50 znaků. */
export function interestTag(slug: string): string {
  const clean = slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${TAG_INTEREST_PREFIX}${clean}`.slice(0, 50);
}

/**
 * Profil z objednávek jednoho zákazníka (stornované se nepočítají). EUR se přepočítá kurzem ČNB
 * (bez kurzu orientačně 25 Kč/€). Vrací null, když zákazník nemá žádnou platnou objednávku.
 */
export function buildCustomerProfile(
  orders: ProfileOrder[],
  rootCategoryOf: (productId: string) => RootCategory | null,
  eurRate: number | null,
): CustomerProfile | null {
  const valid = orders.filter((o) => o.status !== "cancelled").sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (valid.length === 0) return null;
  const rate = eurRate && eurRate > 0 ? eurRate : FALLBACK_EUR_RATE;
  const czk = (o: { currency: string }, minor: number) => (o.currency === "EUR" ? (minor / 100) * rate : minor / 100);

  let total = 0;
  const byCat = new Map<string, { cat: RootCategory; spend: number }>();
  for (const o of valid) {
    total += czk(o, o.total);
    for (const i of o.items) {
      if (!i.product_id) continue;
      const cat = rootCategoryOf(i.product_id);
      if (!cat) continue;
      const cur = byCat.get(cat.slug) ?? { cat, spend: 0 };
      cur.spend += czk(o, i.line_total);
      byCat.set(cat.slug, cur);
    }
  }
  const cats = [...byCat.values()].sort((a, b) => b.spend - a.spend);
  const last = valid[valid.length - 1];
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    pocet_objednavek: valid.length,
    celkova_utrata_czk: round(total),
    prumerna_objednavka_czk: round(total / valid.length),
    prvni_objednavka: valid[0].created_at.slice(0, 10),
    posledni_objednavka: last.created_at.slice(0, 10),
    posledni_objednavka_cislo: last.number,
    posledni_objednavka_stav: last.status,
    top_kategorie: cats[0]?.cat.name ?? "",
    zajmy: cats.slice(0, MAX_INTERESTS).map((c) => interestTag(c.cat.slug)),
  };
}

/** Profil → vlastní pole kontaktu (bez štítků). */
export function profileFields(p: CustomerProfile | null): Record<string, string | number> {
  if (!p) return {};
  const fields: Record<string, string | number> = { ...p, zajmy: "" };
  delete fields.zajmy;
  return fields;
}

/** Kořenová kategorie (nejvyšší rodič) pro každou kategorii; strom může být i cyklický/neúplný → ochrana. */
export function rootCategoryResolver(
  categories: { id: string; slug: string; name: string; parent_id: string | null }[],
): (categoryId: string | null) => RootCategory | null {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const cache = new Map<string, RootCategory | null>();
  return (categoryId) => {
    if (!categoryId) return null;
    if (cache.has(categoryId)) return cache.get(categoryId)!;
    let cur = byId.get(categoryId);
    const seen = new Set<string>();
    while (cur && cur.parent_id && byId.has(cur.parent_id) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parent_id);
    }
    const root = cur ? { slug: cur.slug, name: cur.name } : null;
    cache.set(categoryId, root);
    return root;
  };
}
