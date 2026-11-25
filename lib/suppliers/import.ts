import "server-only";
import sanitizeHtml from "sanitize-html";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { purchasePrice, sellPrice, type PriceRule } from "@/lib/suppliers/pricing";

const BUCKET = "products";
/** Kolik položek naimportovat jedním kliknutím (kvůli limitu běhu serverové funkce). */
export const IMPORT_BATCH = 40;

export type ImportOptions = {
  categoryId: string | null;
  rule: PriceRule;
  publish: boolean;
  copyImages: boolean;
};

export type ImportResult = { created: number; linked: number; errors: string[] };

/** „Granovit Arabská guma 200g" → „granovit-arabska-guma-200g". */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Popis od dodavatele: jen základní formátování, bez odkazů (vedly by k dodavateli), obrázků a skriptů.
 */
export function cleanDescription(html: string | null): string | null {
  if (!html) return null;
  const out = sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "h4", "table", "thead", "tbody", "tr", "th", "td", "blockquote"],
    allowedAttributes: {},
    exclusiveFilter: (frame) => frame.tag === "p" && !frame.text.trim(),
  }).trim();
  return out || null;
}

async function uniqueSlug(base: string): Promise<string> {
  const svc = createServiceClient();
  const root = base || "produkt";
  const { data } = await svc.from("product").select("slug").like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
}

async function copyImages(productId: string, urls: string[], alt: string): Promise<number> {
  const svc = createServiceClient();
  let sort = 0;
  for (const url of urls.slice(0, 6)) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") ?? "image/jpeg";
      if (!type.startsWith("image/")) continue;
      const buf = await res.arrayBuffer();
      if (buf.byteLength > 8 * 1024 * 1024) continue;
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await svc.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: false });
      if (error) continue;
      const { data: pub } = svc.storage.from(BUCKET).getPublicUrl(path);
      await svc.from("product_image").insert({ product_id: productId, url: pub.publicUrl, alt, sort_order: sort++ });
    } catch {
      // Obrázek se nepovedl — produkt zůstane bez něj, doplní se ručně.
    }
  }
  return sort;
}

/**
 * Založí vybrané položky feedu jako produkty eshopu a napojí je (supplier_feed_item.product_id).
 * Položka, jejíž EAN nebo SKU už v eshopu je, se jen napojí na existující produkt (žádný duplikát).
 */
export async function importFeedItems(itemRowIds: string[], opts: ImportOptions): Promise<ImportResult> {
  const svc = createServiceClient();
  const result: ImportResult = { created: 0, linked: 0, errors: [] };
  const { data: rows } = await svc
    .from("supplier_feed_item")
    .select("*, feed:feed_id(sku_prefix)")
    .in("id", itemRowIds.slice(0, IMPORT_BATCH));
  const vatPayer = Boolean((await getShopContact()).dic);
  const { data: brands } = await svc.from("brand").select("id, name");
  const brandId = (name: string | null) =>
    name ? (brands ?? []).find((b) => b.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null : null;

  for (const r of rows ?? []) {
    if (r.product_id) continue;
    const prefix = (r.feed as { sku_prefix?: string } | null)?.sku_prefix ?? "";
    const sku = prefix ? `${prefix}-${r.item_id}` : r.item_id;
    const item = {
      vatRate: r.vat_rate,
      wholesaleCzk: r.wholesale_czk,
      wholesaleEur: r.wholesale_eur,
      retailCzk: r.retail_czk,
      retailEur: r.retail_eur,
    };

    // Už existuje (stejný EAN nebo SKU)? → jen napojit.
    const match = await svc
      .from("product")
      .select("id")
      .or([r.ean ? `ean.eq.${r.ean}` : null, `sku.eq.${sku}`].filter(Boolean).join(","))
      .limit(1)
      .maybeSingle();
    if (match.data) {
      await svc.from("supplier_feed_item").update({ product_id: match.data.id }).eq("id", r.id);
      await svc.from("product").update({ purchase_price_czk: purchasePrice(item, vatPayer), supplier_stock: r.in_feed }).eq("id", match.data.id);
      result.linked++;
      continue;
    }

    const priceCzk = sellPrice(item, opts.rule, "CZK");
    if (priceCzk == null) {
      result.errors.push(`${r.name}: chybí cena ve feedu`);
      continue;
    }
    const description = cleanDescription(r.description);
    const shortDescription = r.short_description ? sanitizeHtml(r.short_description, { allowedTags: [] }).trim() || null : null;
    const vat = [0, 12, 21].includes(Number(r.vat_rate)) ? Number(r.vat_rate) : 21;

    const { data: created, error } = await svc
      .from("product")
      .insert({
        slug: await uniqueSlug(slugify(r.name)),
        name: r.name,
        name_i18n: { cs: r.name },
        short_description: shortDescription,
        short_description_i18n: shortDescription ? { cs: shortDescription } : {},
        description,
        description_i18n: description ? { cs: description } : {},
        price_czk: priceCzk,
        price_eur: sellPrice(item, opts.rule, "EUR"),
        purchase_price_czk: purchasePrice(item, vatPayer),
        vat_rate: vat,
        weight_kg: r.weight_g ? Math.round(Number(r.weight_g)) / 1000 : null,
        sku,
        ean: r.ean,
        brand_id: brandId(r.manufacturer),
        category_id: opts.categoryId,
        stock_qty: 0,
        supplier_stock: r.in_feed,
        is_published: opts.publish,
      } as never)
      .select("id")
      .single();
    if (error || !created) {
      result.errors.push(`${r.name}: ${error?.message ?? "neuloženo"}`);
      continue;
    }
    await svc.from("supplier_feed_item").update({ product_id: created.id }).eq("id", r.id);
    if (opts.copyImages && r.images?.length) await copyImages(created.id, r.images, r.name);
    result.created++;
  }
  return result;
}
