import { createClient } from "@/lib/supabase/server";
import { localeCurrency } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";

export type I18n = Record<string, string> | null;

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  name_i18n: I18n;
  price_czk: number;
  price_eur: number | null;
  compare_at_czk: number | null;
  compare_at_eur: number | null;
  stock_qty: number;
  is_featured: boolean;
  brand: { name: string; slug: string } | null;
};

export type ProductDetail = ProductListItem & {
  description: string | null;
  description_i18n: I18n;
  category: { slug: string; name_i18n: I18n } | null;
  product_attribute: { key: string; value: string; sort_order: number }[];
};

export type CategoryItem = {
  id: string;
  slug: string;
  name: string;
  name_i18n: I18n;
  parent_id?: string | null;
};

export type BrandItem = { id: string; slug: string; name: string };

export type ProductFilters = {
  category?: string;
  brand?: string;
  q?: string;
  sort?: string;
  inStock?: boolean;
};

const LIST_COLS =
  "id,slug,name,name_i18n,price_czk,price_eur,compare_at_czk,compare_at_eur,stock_qty,is_featured, brand:brand_id(name,slug)";

export async function getProducts(opts?: {
  featured?: boolean;
}): Promise<ProductListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("product")
    .select(LIST_COLS)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (opts?.featured) query = query.eq("is_featured", true);
  const { data } = await query;
  return (data ?? []) as unknown as ProductListItem[];
}

/** Nejnovější produkty (sekce „Novinky") */
export async function getNewProducts(limit = 4): Promise<ProductListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product")
    .select(LIST_COLS)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ProductListItem[];
}

/** Produkty ve slevě (compare_at nastaveno) */
export async function getSaleProducts(limit = 4): Promise<ProductListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product")
    .select(LIST_COLS)
    .eq("is_published", true)
    .not("compare_at_czk", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ProductListItem[];
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product")
    .select(
      "id,slug,name,name_i18n,description,description_i18n,price_czk,price_eur,compare_at_czk,compare_at_eur,stock_qty,is_featured, brand:brand_id(name,slug), category:category_id(slug,name_i18n), product_attribute(key,value,sort_order)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as unknown as ProductDetail) ?? null;
}

export async function getRootCategories(): Promise<CategoryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("category")
    .select("id,slug,name,name_i18n,sort_order")
    .is("parent_id", null)
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []) as unknown as CategoryItem[];
}

/** Všechny publikované kategorie (rodičovské i pod) — pro filtry a strom */
export async function getAllCategories(): Promise<CategoryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("category")
    .select("id,slug,name,name_i18n,parent_id,sort_order")
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []) as unknown as CategoryItem[];
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("category")
    .select("id,slug,name,name_i18n,parent_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as unknown as CategoryItem) ?? null;
}

export async function getBrands(): Promise<BrandItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand")
    .select("id,slug,name,sort_order")
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []) as unknown as BrandItem[];
}

/** kategorie + její přímé podkategorie (pro filtrování produktů) */
async function categoryAndDescendantIds(slug: string): Promise<string[]> {
  const supabase = await createClient();
  const { data: cat } = await supabase
    .from("category")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!cat) return [];
  const { data: children } = await supabase
    .from("category")
    .select("id")
    .eq("parent_id", cat.id);
  return [cat.id, ...(children ?? []).map((c) => c.id)];
}

function toTsQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");
}

/** Filtrovaný katalog — kategorie, značka, hledání (FTS), skladem, řazení */
export async function getFilteredProducts(
  locale: Locale,
  filters: ProductFilters,
): Promise<ProductListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("product")
    .select(LIST_COLS)
    .eq("is_published", true);

  if (filters.category) {
    const ids = await categoryAndDescendantIds(filters.category);
    if (ids.length === 0) return [];
    query = query.in("category_id", ids);
  }

  if (filters.brand) {
    const { data: brand } = await supabase
      .from("brand")
      .select("id")
      .eq("slug", filters.brand)
      .maybeSingle();
    if (!brand) return [];
    query = query.eq("brand_id", brand.id);
  }

  if (filters.inStock) query = query.gt("stock_qty", 0);

  if (filters.q && filters.q.trim()) {
    const tsq = toTsQuery(filters.q);
    if (tsq) query = query.textSearch("search_vector", tsq, { config: "simple" });
  }

  const priceCol = localeCurrency[locale] === "CZK" ? "price_czk" : "price_eur";
  if (filters.sort === "price-asc") query = query.order(priceCol, { ascending: true });
  else if (filters.sort === "price-desc") query = query.order(priceCol, { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data } = await query;
  return (data ?? []) as unknown as ProductListItem[];
}
