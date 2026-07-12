import { createClient } from "@/lib/supabase/server";

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
