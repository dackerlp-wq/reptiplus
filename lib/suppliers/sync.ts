import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { parseHeurekaFeed, type FeedItem } from "@/lib/suppliers/parse";
import { purchasePrice } from "@/lib/suppliers/pricing";

export type SyncResult = { ok: true; items: number; added: number; changed: number; gone: number; products: number } | { ok: false; error: string };

const toRow = (i: FeedItem) => ({
  item_id: i.itemId,
  group_id: i.groupId,
  name: i.name,
  url: i.url,
  images: i.images,
  vat_rate: i.vatRate,
  manufacturer: i.manufacturer,
  category_text: i.categoryText,
  ean: i.ean,
  weight_g: i.weightG,
  short_description: i.shortDescription,
  description: i.description,
  wholesale_czk: i.wholesaleCzk,
  wholesale_eur: i.wholesaleEur,
  retail_czk: i.retailCzk,
  retail_eur: i.retailEur,
  delivery_days: i.deliveryDays,
});

/**
 * Načte feed dodavatele do supplier_feed_item: nové položky přidá, změny přepíše (změnu velkoobchodní
 * ceny si poznamená), chybějící označí `in_feed = false`. U napojených produktů aktualizuje nákupní cenu
 * a „skladem u dodavatele" (zmizí z feedu → nelze objednat do vyprodání). Nikdy nevyhazuje.
 */
export async function syncSupplierFeed(feedId: string): Promise<SyncResult> {
  const svc = createServiceClient();
  const { data: feed } = await svc.from("supplier_feed").select("id, url").eq("id", feedId).maybeSingle();
  if (!feed) return { ok: false, error: "Feed nenalezen." };

  let items: FeedItem[];
  try {
    const res = await fetch(feed.url, { cache: "no-store", signal: AbortSignal.timeout(45_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = parseHeurekaFeed(await res.text());
    if (items.length === 0) throw new Error("Feed neobsahuje žádné položky (SHOPITEM).");
  } catch (e) {
    const error = `Načtení feedu selhalo: ${e instanceof Error ? e.message : String(e)}`;
    await svc.from("supplier_feed").update({ last_error: error }).eq("id", feedId);
    return { ok: false, error };
  }

  // Stávající položky (kvůli změnám ceny a napojeným produktům).
  const existing = new Map<
    string,
    { wholesale_czk: number | null; product_id: string | null; variant_id: string | null; in_feed: boolean }
  >();
  for (let from = 0; ; from += 1000) {
    const { data } = await svc
      .from("supplier_feed_item")
      .select("item_id, wholesale_czk, product_id, variant_id, in_feed")
      .eq("feed_id", feedId)
      .range(from, from + 999);
    for (const r of data ?? []) existing.set(r.item_id, r);
    if (!data || data.length < 1000) break;
  }

  const now = new Date().toISOString();
  let added = 0;
  let changed = 0;
  const seen = new Set<string>();
  const rows = items
    .filter((i) => (seen.has(i.itemId) ? false : (seen.add(i.itemId), true)))
    .map((i) => {
      const prev = existing.get(i.itemId);
      if (!prev) added++;
      const priceChanged = prev && prev.wholesale_czk != null && i.wholesaleCzk != null && Number(prev.wholesale_czk) !== i.wholesaleCzk;
      if (priceChanged) changed++;
      return {
        feed_id: feedId,
        ...toRow(i),
        in_feed: true,
        last_seen_at: now,
        ...(priceChanged ? { prev_wholesale_czk: prev!.wholesale_czk, wholesale_changed_at: now } : {}),
      };
    });

  for (let k = 0; k < rows.length; k += 300) {
    const { error } = await svc.from("supplier_feed_item").upsert(rows.slice(k, k + 300) as never, { onConflict: "feed_id,item_id" });
    if (error) {
      await svc.from("supplier_feed").update({ last_error: `Uložení položek selhalo: ${error.message}` }).eq("id", feedId);
      return { ok: false, error: error.message };
    }
  }

  // Zmizelé z feedu.
  const goneIds = [...existing.entries()].filter(([id, r]) => r.in_feed && !seen.has(id)).map(([id]) => id);
  for (let k = 0; k < goneIds.length; k += 300)
    await svc.from("supplier_feed_item").update({ in_feed: false }).eq("feed_id", feedId).in("item_id", goneIds.slice(k, k + 300));

  // Napojené produkty a varianty: nákupní cena; produkt je „skladem u dodavatele", dokud je ve feedu
  // aspoň jedna jeho položka (u produktu s variantami kterákoli varianta).
  const vatPayer = Boolean((await getShopContact()).dic);
  const byId = new Map(items.map((i) => [i.itemId, i]));
  const productInFeed = new Map<string, boolean>();
  const productPrice = new Map<string, number | null>();
  for (const [itemId, r] of existing) {
    if (!r.product_id) continue;
    const i = byId.get(itemId);
    productInFeed.set(r.product_id, (productInFeed.get(r.product_id) ?? false) || Boolean(i));
    if (!i) continue;
    if (r.variant_id) await svc.from("product_variant").update({ purchase_price_czk: purchasePrice(i, vatPayer) }).eq("id", r.variant_id);
    else productPrice.set(r.product_id, purchasePrice(i, vatPayer));
  }
  let products = 0;
  for (const [productId, inFeed] of productInFeed) {
    const update = productPrice.has(productId)
      ? { supplier_stock: inFeed, purchase_price_czk: productPrice.get(productId) ?? null }
      : { supplier_stock: inFeed };
    const { error } = await svc.from("product").update(update).eq("id", productId);
    if (!error) products++;
  }

  await svc
    .from("supplier_feed")
    .update({ last_fetched_at: now, last_error: null, item_count: rows.length })
    .eq("id", feedId);
  return { ok: true, items: rows.length, added, changed, gone: goneIds.length, products };
}
