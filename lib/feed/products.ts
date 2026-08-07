import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { pickI18n } from "@/lib/i18n";
import type { I18n } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

export type FeedItem = {
  /** ITEM_ID / g:id — id varianty, nebo produktu (bez variant). */
  id: string;
  /** ITEMGROUP_ID / g:item_group_id — id produktu, má-li varianty. */
  groupId: string | null;
  name: string;
  description: string;
  url: string;
  imageUrl: string | null;
  extraImages: string[];
  priceCzk: number; // minor units, včetně DPH
  brand: string | null;
  categoryText: string; // "Kategorie | Podkategorie"
  sku: string | null;
  ean: string | null;
  inStock: boolean;
};

const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type CatRow = { id: string; name_i18n: I18n | null; parent_id: string | null };

/** Sestaví mapu id → cesta kategorie ("Rodič | Dítě"). */
function buildCategoryPaths(cats: CatRow[]): Map<string, string> {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const cache = new Map<string, string>();
  const pathOf = (id: string, seen = new Set<string>()): string => {
    if (cache.has(id)) return cache.get(id)!;
    const c = byId.get(id);
    if (!c || seen.has(id)) return "";
    seen.add(id);
    const name = pickI18n(c.name_i18n as I18n, "cs");
    const parent = c.parent_id ? pathOf(c.parent_id, seen) : "";
    const full = parent ? `${parent} | ${name}` : name;
    cache.set(id, full);
    return full;
  };
  for (const c of cats) pathOf(c.id);
  return cache;
}

type VariantRow = {
  id: string;
  name_i18n: I18n;
  sku: string | null;
  price_czk: number | null;
  stock_qty: number;
};

/** Všechny publikované produkty (a jejich varianty) normalizované pro XML feedy. */
export async function getFeedItems(): Promise<FeedItem[]> {
  const svc = createServiceClient();
  const [{ data: products }, { data: cats }] = await Promise.all([
    svc
      .from("product")
      .select(
        "id, slug, name_i18n, description_i18n, short_description_i18n, sku, ean, price_czk, stock_qty, category_id, brand:brand_id(name), product_image(url,sort_order), product_variant(id,name_i18n,sku,price_czk,stock_qty,sort_order)",
      )
      .eq("is_published", true),
    svc.from("category").select("id,name_i18n,parent_id"),
  ]);

  const paths = buildCategoryPaths((cats ?? []) as CatRow[]);
  const items: FeedItem[] = [];

  for (const p of products ?? []) {
    const name = pickI18n(p.name_i18n as I18n, "cs");
    const description =
      plain(pickI18n(p.description_i18n as I18n, "cs")) ||
      plain(pickI18n(p.short_description_i18n as I18n, "cs")) ||
      name;
    const url = absoluteUrl(`/cs/produkt/${p.slug}`);
    const images = [...((p.product_image as { url: string; sort_order: number }[]) ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const imageUrl = images[0]?.url ?? null;
    const extraImages = images.slice(1, 11).map((i) => i.url);
    const brand =
      (p.brand as { name: string } | null)?.name ?? null;
    const categoryText = p.category_id ? (paths.get(p.category_id) ?? "") : "";
    const variants = (p.product_variant as VariantRow[]) ?? [];

    const base = {
      description,
      url,
      imageUrl,
      extraImages,
      brand,
      categoryText,
      ean: p.ean,
    };

    if (variants.length > 0) {
      for (const v of variants) {
        const vName = pickI18n(v.name_i18n as I18n, "cs");
        items.push({
          ...base,
          id: v.id,
          groupId: p.id,
          name: vName ? `${name} – ${vName}` : name,
          priceCzk: v.price_czk ?? p.price_czk,
          sku: v.sku ?? p.sku,
          inStock: v.stock_qty > 0,
        });
      }
    } else {
      items.push({
        ...base,
        id: p.id,
        groupId: null,
        name,
        priceCzk: p.price_czk,
        sku: p.sku,
        inStock: p.stock_qty > 0,
      });
    }
  }

  return items;
}

/** Escape textu pro XML. */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Cena z minor units na dvě desetinná místa (formát pro feedy). */
export function priceStr(minor: number): string {
  return (Math.round(minor) / 100).toFixed(2);
}
