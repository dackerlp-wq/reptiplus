import { createClient } from "@/lib/supabase/server";
import { localeCurrency, pickI18n, priceForLocale } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";

export type I18n = Record<string, string> | null;

export type ProductImage = { url: string; alt: string | null; sort_order: number };

export type ProductVariant = {
  id: string;
  name: string;
  sku: string | null;
  price_czk: number | null;
  price_eur: number | null;
  stock_qty: number;
  sort_order: number;
};

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
  image: { url: string; alt: string | null } | null; // primární obrázek
};

export type ProductDetail = Omit<ProductListItem, "brand"> & {
  brand: {
    name: string;
    slug: string;
    logo_url: string | null;
    description_i18n: I18n;
  } | null;
  sku: string | null;
  short_description: string | null;
  short_description_i18n: I18n;
  description: string | null;
  description_i18n: I18n;
  category: { slug: string; name_i18n: I18n } | null;
  product_attribute: {
    key: string;
    value: string;
    key_i18n: I18n;
    value_i18n: I18n;
    sort_order: number;
  }[];
  images: ProductImage[];
  variants: ProductVariant[];
};

/** Primární obrázek = nejnižší sort_order. */
function pickImage(
  images: ProductImage[] | null | undefined,
): { url: string; alt: string | null } | null {
  if (!images || images.length === 0) return null;
  const first = [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
  return { url: first.url, alt: first.alt };
}

type RawListRow = Omit<ProductListItem, "image"> & {
  product_image: ProductImage[] | null;
};

/** Doplní `image` (primární) a odstraní surové pole product_image. */
function normalizeList(data: unknown): ProductListItem[] {
  return ((data ?? []) as RawListRow[]).map(({ product_image, ...rest }) => ({
    ...rest,
    image: pickImage(product_image),
  }));
}

export type CategoryItem = {
  id: string;
  slug: string;
  name: string;
  name_i18n: I18n;
  description_i18n?: I18n;
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
  "id,slug,name,name_i18n,price_czk,price_eur,compare_at_czk,compare_at_eur,stock_qty,is_featured, brand:brand_id(name,slug), product_image(url,alt,sort_order)";

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
  return normalizeList(data);
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
  return normalizeList(data);
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
  return normalizeList(data);
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product")
    .select(
      "id,slug,name,name_i18n,sku,short_description,short_description_i18n,description,description_i18n,price_czk,price_eur,compare_at_czk,compare_at_eur,stock_qty,is_featured, brand:brand_id(name,slug,logo_url,description_i18n), category:category_id(slug,name_i18n), product_attribute(key,value,key_i18n,value_i18n,sort_order), product_image(url,alt,sort_order), product_variant(id,name,sku,price_czk,price_eur,stock_qty,sort_order)",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return null;

  const { product_image, product_variant, ...rest } =
    data as unknown as ProductDetail & {
      product_image: ProductImage[] | null;
      product_variant: ProductVariant[] | null;
    };
  const images = [...(product_image ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const variants = [...(product_variant ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  return { ...rest, image: pickImage(images), images, variants };
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
    .select("id,slug,name,name_i18n,description_i18n,parent_id")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return (data as unknown as CategoryItem) ?? null;
}

export type ShippingMethodItem = {
  id: string;
  code: string;
  name_i18n: I18n;
  carrier: string;
  price_czk: number;
  price_eur: number | null;
};

export type PaymentMethodItem = {
  id: string;
  code: string;
  name_i18n: I18n;
  provider: string;
  fee_czk: number;
  fee_eur: number | null;
};

/** Aktivní dopravní metody (RLS: public read jen is_active=true). */
export async function getShippingMethods(): Promise<ShippingMethodItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipping_method")
    .select("id,code,name_i18n,carrier,price_czk,price_eur,sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as unknown as ShippingMethodItem[];
}

/** Aktivní platební metody. Comgate se skryje, dokud nejsou přístupy (nemá smysl nabízet nefunkční). */
export async function getPaymentMethods(): Promise<PaymentMethodItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_method")
    .select("id,code,name_i18n,provider,fee_czk,fee_eur,sort_order")
    .eq("is_active", true)
    .neq("provider", "comgate")
    .order("sort_order");
  return (data ?? []) as unknown as PaymentMethodItem[];
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
  return normalizeList(data);
}

export type SearchSuggestion = {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
};

/** Lehké návrhy pro našeptávač — pár produktů dle FTS (prefix), s obrázkem a cenou. */
export async function searchSuggestions(
  locale: Locale,
  q: string,
  limit = 6,
): Promise<SearchSuggestion[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const supabase = await createClient();
  const tsq = toTsQuery(query);

  let req = supabase
    .from("product")
    .select(
      "slug,name,name_i18n,price_czk,price_eur, product_image(url,alt,sort_order)",
    )
    .eq("is_published", true)
    .limit(limit);
  if (tsq) req = req.textSearch("search_vector", tsq, { config: "simple" });

  const { data } = await req;
  return normalizeList(data).map((p) => ({
    slug: p.slug,
    name: pickI18n(p.name_i18n, locale, p.name),
    imageUrl: p.image?.url ?? null,
    price: priceForLocale(p, locale),
  }));
}

const deaccent = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Návrhy kategorií pro našeptávač — shoda v názvu (bez ohledu na diakritiku). */
export async function searchCategories(
  locale: Locale,
  q: string,
  limit = 4,
): Promise<{ slug: string; name: string }[]> {
  const query = deaccent(q.trim());
  if (query.length < 2) return [];
  const cats = await getAllCategories();
  return cats
    .map((c) => ({ slug: c.slug, name: pickI18n(c.name_i18n, locale, c.name) }))
    .filter((c) => deaccent(c.name).includes(query))
    .slice(0, limit);
}
