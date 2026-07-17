import { createClient } from "@/lib/supabase/server";
import {
  compareForLocale,
  discountPercent,
  formatPrice,
  localeCurrency,
  pickI18n,
  priceForLocale,
} from "@/lib/i18n";
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
  short_description_i18n?: I18n;
  price_czk: number;
  price_eur: number | null;
  compare_at_czk: number | null;
  compare_at_eur: number | null;
  stock_qty: number;
  is_featured: boolean;
  brand: { name: string; slug: string } | null;
  image: { url: string; alt: string | null } | null; // primární obrázek
  variants: {
    price_czk: number | null;
    price_eur: number | null;
    stock_qty: number;
  }[];
};

export type ProductDetail = Omit<ProductListItem, "brand" | "variants"> & {
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
  category_id: string | null;
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

type RawListRow = Omit<ProductListItem, "image" | "variants"> & {
  product_image: ProductImage[] | null;
  product_variant:
    | { price_czk: number | null; price_eur: number | null; stock_qty: number }[]
    | null;
};

/** Doplní `image` (primární) + `variants` a odstraní surová pole. */
function normalizeList(data: unknown): ProductListItem[] {
  return ((data ?? []) as RawListRow[]).map(
    ({ product_image, product_variant, ...rest }) => ({
      ...rest,
      image: pickImage(product_image),
      variants: product_variant ?? [],
    }),
  );
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
  onSale?: boolean;
  priceMin?: number; // v minor units (haléře/eurocenty)
  priceMax?: number; // v minor units
};

/** Cenové rozpětí publikovaných produktů v dané kategorii (pro filtr). */
export async function getPriceRange(
  locale: Locale,
  category?: string,
): Promise<{ min: number; max: number }> {
  const supabase = await createClient();
  const priceCol = localeCurrency[locale] === "CZK" ? "price_czk" : "price_eur";
  let query = supabase
    .from("product")
    .select(priceCol)
    .eq("is_published", true)
    .gt(priceCol, 0);
  if (category) {
    const ids = await categoryAndDescendantIds(category);
    if (ids.length === 0) return { min: 0, max: 0 };
    query = query.in("category_id", ids);
  }
  const { data } = await query;
  const prices = ((data ?? []) as Record<string, number>[])
    .map((r) => r[priceCol])
    .filter((n) => typeof n === "number" && n > 0);
  if (prices.length === 0) return { min: 0, max: 0 };
  // Zaokrouhleno na celé jednotky měny (haléře → Kč), pro hezčí meze filtru
  return {
    min: Math.floor(Math.min(...prices) / 100) * 100,
    max: Math.ceil(Math.max(...prices) / 100) * 100,
  };
}

const LIST_COLS =
  "id,slug,name,name_i18n,short_description_i18n,price_czk,price_eur,compare_at_czk,compare_at_eur,stock_qty,is_featured, brand:brand_id(name,slug), product_image(url,alt,sort_order), product_variant(price_czk,price_eur,stock_qty)";

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
      "id,slug,name,name_i18n,sku,short_description,short_description_i18n,description,description_i18n,price_czk,price_eur,compare_at_czk,compare_at_eur,stock_qty,is_featured,category_id, brand:brand_id(name,slug,logo_url,description_i18n), category:category_id(slug,name_i18n), product_attribute(key,value,key_i18n,value_i18n,sort_order), product_image(url,alt,sort_order), product_variant(id,name,sku,price_czk,price_eur,stock_qty,sort_order)",
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

export type MenuCategory = {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
  product: {
    slug: string;
    name: string;
    imageUrl: string | null;
    priceLabel: string;
  } | null;
};

/** Data pro megamenu: kořenové kategorie + podkategorie + náhodný produkt z kategorie. */
export async function getMenuData(locale: Locale): Promise<MenuCategory[]> {
  const supabase = await createClient();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase
      .from("category")
      .select("id,slug,name,name_i18n,parent_id,sort_order")
      .eq("is_published", true)
      .order("sort_order"),
    supabase
      .from("product")
      .select(
        "id,slug,name,name_i18n,price_czk,price_eur,category_id, product_image(url,sort_order)",
      )
      .eq("is_published", true),
  ]);

  const categories = (cats ?? []) as {
    id: string;
    slug: string;
    name: string;
    name_i18n: I18n;
    parent_id: string | null;
  }[];
  type ProdRow = {
    slug: string;
    name: string;
    name_i18n: I18n;
    price_czk: number;
    price_eur: number | null;
    category_id: string | null;
    product_image: { url: string; sort_order: number }[] | null;
  };
  const products = (prods ?? []) as unknown as ProdRow[];

  return categories
    .filter((c) => !c.parent_id)
    .map((root) => {
      const subs = categories.filter((c) => c.parent_id === root.id);
      const catIds = new Set([root.id, ...subs.map((s) => s.id)]);
      const inCat = products.filter(
        (p) => p.category_id && catIds.has(p.category_id),
      );
      const pick = inCat.length
        ? inCat[Math.floor(Math.random() * inCat.length)]
        : null;
      const img = pick?.product_image?.length
        ? [...pick.product_image].sort((a, b) => a.sort_order - b.sort_order)[0]
            .url
        : null;

      return {
        slug: root.slug,
        name: pickI18n(root.name_i18n, locale, root.name),
        subcategories: subs.map((s) => ({
          slug: s.slug,
          name: pickI18n(s.name_i18n, locale, s.name),
        })),
        product: pick
          ? {
              slug: pick.slug,
              name: pickI18n(pick.name_i18n, locale, pick.name),
              imageUrl: img,
              priceLabel: formatPrice(priceForLocale(pick, locale), locale),
            }
          : null,
      };
    });
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

  const priceCol = localeCurrency[locale] === "CZK" ? "price_czk" : "price_eur";
  if (typeof filters.priceMin === "number")
    query = query.gte(priceCol, filters.priceMin);
  if (typeof filters.priceMax === "number")
    query = query.lte(priceCol, filters.priceMax);

  if (filters.q && filters.q.trim()) {
    const tsq = toTsQuery(filters.q);
    if (tsq) query = query.textSearch("search_vector", tsq, { config: "simple" });
  }

  // Řazení v DB (kromě "discount", které dořešíme v JS podle efektivní ceny)
  if (filters.sort === "price-asc") query = query.order(priceCol, { ascending: true });
  else if (filters.sort === "price-desc") query = query.order(priceCol, { ascending: false });
  else if (filters.sort === "name") query = query.order("name", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data } = await query;
  let list = normalizeList(data);

  // Jen v akci (compare > cena) — porovnání dvou sloupců řešíme v JS
  if (filters.onSale) {
    list = list.filter((p) => {
      const cmp = compareForLocale(p, locale);
      return cmp !== null && cmp > priceForLocale(p, locale);
    });
  }

  // Řazení podle výše slevy
  if (filters.sort === "discount") {
    const off = (p: ProductListItem) =>
      discountPercent(priceForLocale(p, locale), compareForLocale(p, locale)) ?? 0;
    list.sort((a, b) => off(b) - off(a));
  }

  return list;
}

/** Podobné produkty — stejná kategorie, mimo aktuální produkt. */
export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  limit = 4,
): Promise<ProductListItem[]> {
  if (!categoryId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("product")
    .select(LIST_COLS)
    .eq("is_published", true)
    .eq("category_id", categoryId)
    .neq("id", productId)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return normalizeList(data);
}

/** Ručně vybrané upsell produkty (jen publikované). */
export async function getUpsellProducts(
  productId: string,
  limit = 6,
): Promise<ProductListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_upsell")
    .select(`sort_order, product:upsell_product_id(${LIST_COLS})`)
    .eq("product_id", productId)
    .order("sort_order")
    .limit(limit);
  const rows = (data ?? []) as unknown as { product: unknown | null }[];
  const products = rows.map((r) => r.product).filter((p) => !!p);
  return normalizeList(products);
}

export type SearchSuggestion = {
  slug: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  price: number;
};

/** Lehké návrhy pro našeptávač — pár produktů dle FTS (prefix), s obrázkem, kategorií a cenou. */
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
      "slug,name,name_i18n,price_czk,price_eur, category:category_id(name,name_i18n), product_image(url,alt,sort_order)",
    )
    .eq("is_published", true)
    .limit(limit);
  if (tsq) req = req.textSearch("search_vector", tsq, { config: "simple" });

  const { data } = await req;
  const rows = (data ?? []) as unknown as {
    slug: string;
    name: string;
    name_i18n: I18n;
    price_czk: number;
    price_eur: number | null;
    category: { name: string; name_i18n: I18n } | null;
    product_image: ProductImage[] | null;
  }[];

  return rows.map((r) => ({
    slug: r.slug,
    name: pickI18n(r.name_i18n, locale, r.name),
    category: r.category
      ? pickI18n(r.category.name_i18n, locale, r.category.name)
      : null,
    imageUrl: pickImage(r.product_image)?.url ?? null,
    price: priceForLocale(r, locale),
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
