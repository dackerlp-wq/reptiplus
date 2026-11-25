import "server-only";
import sanitizeHtml from "sanitize-html";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { purchasePrice, sellPrice, type PriceRule } from "@/lib/suppliers/pricing";
import { splitVariantNames } from "@/lib/suppliers/variants";

const BUCKET = "products";
/** Kolik položek naimportovat jedním kliknutím (kvůli limitu běhu serverové funkce). */
export const IMPORT_BATCH = 40;

export type ImportOptions = {
  categoryId: string | null;
  rule: PriceRule;
  publish: boolean;
  copyImages: boolean;
  /** Položky se stejným ITEMGROUP_ID spojit do jednoho produktu s variantami. */
  mergeVariants: boolean;
};

export type ImportResult = { created: number; variants: number; linked: number; errors: string[] };

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

/** Stáhne obrázek do úložiště; vrátí veřejnou URL, nebo null. */
async function storeImage(productId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;
    const svc = createServiceClient();
    const { error } = await svc.storage.from(BUCKET).upload(path, buf, { contentType: type, upsert: false });
    if (error) return null;
    return svc.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
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

type FeedRow = {
  id: string;
  item_id: string;
  group_id: string | null;
  name: string;
  images: string[] | null;
  vat_rate: number | null;
  manufacturer: string | null;
  ean: string | null;
  weight_g: number | null;
  short_description: string | null;
  description: string | null;
  wholesale_czk: number | null;
  wholesale_eur: number | null;
  retail_czk: number | null;
  retail_eur: number | null;
  in_feed: boolean;
  product_id: string | null;
  feed: { sku_prefix?: string } | null;
};

const priced = (r: FeedRow) => ({
  vatRate: r.vat_rate,
  wholesaleCzk: r.wholesale_czk != null ? Number(r.wholesale_czk) : null,
  wholesaleEur: r.wholesale_eur != null ? Number(r.wholesale_eur) : null,
  retailCzk: r.retail_czk != null ? Number(r.retail_czk) : null,
  retailEur: r.retail_eur != null ? Number(r.retail_eur) : null,
});
const skuOf = (r: FeedRow) => (r.feed?.sku_prefix ? `${r.feed.sku_prefix}-${r.item_id}` : r.item_id);
const vatOf = (r: FeedRow) => ([0, 12, 21].includes(Number(r.vat_rate)) ? Number(r.vat_rate) : 21);

/**
 * Založí vybrané položky feedu jako produkty eshopu a napojí je (supplier_feed_item.product_id / variant_id).
 * Se `mergeVariants` se vybrané položky jedné skupiny ITEMGROUP_ID založí jako jeden produkt s variantami;
 * později vybrané varianty téže skupiny se přidají k již založenému produktu. Položka, jejíž EAN nebo SKU už v eshopu je, se jen napojí (žádný duplikát).
 */
export async function importFeedItems(itemRowIds: string[], opts: ImportOptions): Promise<ImportResult> {
  const svc = createServiceClient();
  const result: ImportResult = { created: 0, variants: 0, linked: 0, errors: [] };
  const cols = "*, feed:feed_id(sku_prefix)";
  const { data: picked } = await svc.from("supplier_feed_item").select(cols).in("id", itemRowIds.slice(0, IMPORT_BATCH));
  let rows = ((picked ?? []) as unknown as (FeedRow & { feed_id: string })[]).filter((r) => !r.product_id);

  // Skupiny variant: importují se jen vybrané položky; celá skupina ze feedu (i nevybrané a už naimportované)
  // slouží k pojmenování a k nalezení produktu, ke kterému se varianty přidají.
  type Group = { all: FeedRow[]; picked: FeedRow[] };
  const groups = new Map<string, Group>();
  if (opts.mergeVariants) {
    const byFeed = new Map<string, Set<string>>();
    for (const r of rows) if (r.group_id) (byFeed.get(r.feed_id) ?? byFeed.set(r.feed_id, new Set()).get(r.feed_id)!).add(r.group_id);
    for (const [feedId, gids] of byFeed) {
      const { data } = await svc.from("supplier_feed_item").select(cols).eq("feed_id", feedId).in("group_id", [...gids]);
      for (const r of (data ?? []) as unknown as (FeedRow & { feed_id: string })[]) {
        const key = `${feedId}:${r.group_id}`;
        const g = groups.get(key) ?? { all: [], picked: [] };
        g.all.push(r);
        groups.set(key, g);
      }
    }
    for (const r of rows) {
      const g = r.group_id ? groups.get(`${r.feed_id}:${r.group_id}`) : undefined;
      if (g) g.picked.push(r);
    }
    for (const [k, g] of groups) if (g.all.length < 2) groups.delete(k);
    const grouped = new Set([...groups.values()].flatMap((g) => g.picked.map((r) => r.id)));
    rows = rows.filter((r) => !grouped.has(r.id));
  }

  const vatPayer = Boolean((await getShopContact()).dic);
  const { data: brands } = await svc.from("brand").select("id, name");
  const brandId = (name: string | null) =>
    name ? (brands ?? []).find((b) => b.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null : null;

  // ── Jednotlivé položky ──
  for (const r of rows) {
    const sku = skuOf(r);
    const item = priced(r);

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
    const created = await insertProduct(r, r.name, {
      price_czk: priceCzk,
      price_eur: sellPrice(item, opts.rule, "EUR"),
      purchase_price_czk: purchasePrice(item, vatPayer),
      weight_kg: r.weight_g ? Math.round(Number(r.weight_g)) / 1000 : null,
      sku,
      ean: r.ean,
      brand_id: brandId(r.manufacturer),
      category_id: opts.categoryId,
      is_published: opts.publish,
    });
    if ("error" in created) {
      result.errors.push(`${r.name}: ${created.error}`);
      continue;
    }
    await svc.from("supplier_feed_item").update({ product_id: created.id }).eq("id", r.id);
    if (opts.copyImages && r.images?.length) await copyImages(created.id, r.images, r.name);
    result.created++;
  }

  // ── Skupiny → produkt s variantami (jen vybrané varianty) ──
  for (const g of groups.values()) {
    const sortedAll = [...g.all].sort(
      (a, b) => (Number(a.retail_czk) || 0) - (Number(b.retail_czk) || 0) || a.name.localeCompare(b.name, "cs"),
    );
    // Názvy z celé skupiny — produkt i varianty se jmenují stejně, ať se importují najednou nebo postupně.
    const { base, variants: allNames } = splitVariantNames(sortedAll.map((r) => r.name));
    const nameOf = new Map(sortedAll.map((r, k) => [r.id, allNames[k]]));
    const orderOf = new Map(sortedAll.map((r, k) => [r.id, k]));
    const picked = sortedAll.filter((r) => g.picked.some((p) => p.id === r.id));

    // Produkt, ke kterému už jsou napojené jiné varianty téže skupiny → přidat k němu.
    let productId = g.all.find((r) => r.product_id && (r as FeedRow & { variant_id?: string | null }).variant_id)?.product_id ?? null;

    const prices = picked.map((r) => sellPrice(priced(r), opts.rule, "CZK"));
    if (prices.some((p) => p == null)) {
      result.errors.push(`${base}: některé vybrané variantě chybí cena ve feedu`);
      continue;
    }

    if (!productId) {
      const head = picked.find((r) => r.description) ?? picked[0];
      const weights = picked.map((r) => Number(r.weight_g) || 0);
      const created = await insertProduct(head, base, {
        price_czk: Math.min(...(prices as number[])),
        price_eur: sellPrice(priced(picked[0]), opts.rule, "EUR"),
        purchase_price_czk: purchasePrice(priced(picked[0]), vatPayer),
        weight_kg: Math.max(...weights) > 0 ? Math.round(Math.max(...weights)) / 1000 : null,
        sku: head.group_id && head.feed?.sku_prefix ? `${head.feed.sku_prefix}-${head.group_id}` : head.group_id,
        ean: null,
        brand_id: brandId(head.manufacturer),
        category_id: opts.categoryId,
        is_published: opts.publish,
      });
      if ("error" in created) {
        result.errors.push(`${base}: ${created.error}`);
        continue;
      }
      productId = created.id;
      if (opts.copyImages && picked[0].images?.length) await copyImages(productId, picked[0].images, base);
      result.created++;
    }

    for (let k = 0; k < picked.length; k++) {
      const r = picked[k];
      // Varianta se stejným SKU už existuje → jen napojit.
      const { data: same } = await svc.from("product_variant").select("id, product_id").eq("sku", skuOf(r)).limit(1).maybeSingle();
      if (same) {
        await svc.from("supplier_feed_item").update({ product_id: same.product_id, variant_id: same.id }).eq("id", r.id);
        result.linked++;
        continue;
      }
      const image = opts.copyImages && r.images?.[0] ? await storeImage(productId, r.images[0]) : null;
      const { data: v, error } = await svc
        .from("product_variant")
        .insert({
          product_id: productId,
          name: nameOf.get(r.id) ?? r.name,
          name_i18n: { cs: nameOf.get(r.id) ?? r.name },
          sku: skuOf(r),
          price_czk: prices[k],
          price_eur: sellPrice(priced(r), opts.rule, "EUR"),
          purchase_price_czk: purchasePrice(priced(r), vatPayer),
          stock_qty: 0,
          image_url: image,
          sort_order: orderOf.get(r.id) ?? k,
        } as never)
        .select("id")
        .single();
      if (error || !v) {
        result.errors.push(`${base} – ${nameOf.get(r.id)}: ${error?.message ?? "varianta neuložena"}`);
        continue;
      }
      await svc.from("supplier_feed_item").update({ product_id: productId, variant_id: v.id }).eq("id", r.id);
      result.variants++;
    }
    // Cena „od" produktu = nejlevnější varianta.
    const { data: vars } = await svc.from("product_variant").select("price_czk").eq("product_id", productId);
    const min = Math.min(...(vars ?? []).map((x) => x.price_czk ?? Infinity));
    if (Number.isFinite(min)) await svc.from("product").update({ price_czk: min }).eq("id", productId);
  }
  return result;
}

/** Založí produkt z položky feedu (popisy, DPH, dostupnost u dodavatele, slug). */
async function insertProduct(
  r: FeedRow,
  name: string,
  fields: {
    price_czk: number;
    price_eur: number | null;
    purchase_price_czk: number | null;
    weight_kg: number | null;
    sku: string | null;
    ean: string | null;
    brand_id: string | null;
    category_id: string | null;
    is_published: boolean;
  },
): Promise<{ id: string } | { error: string }> {
  const description = cleanDescription(r.description);
  const shortDescription = r.short_description ? sanitizeHtml(r.short_description, { allowedTags: [] }).trim() || null : null;
  const { data, error } = await createServiceClient()
    .from("product")
    .insert({
      slug: await uniqueSlug(slugify(name)),
      name,
      name_i18n: { cs: name },
      short_description: shortDescription,
      short_description_i18n: shortDescription ? { cs: shortDescription } : {},
      description,
      description_i18n: description ? { cs: description } : {},
      vat_rate: vatOf(r),
      stock_qty: 0,
      supplier_stock: r.in_feed,
      ...fields,
    } as never)
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "neuloženo" };
  return { id: data.id };
}
