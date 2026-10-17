import type { FeedItem } from "@/lib/feed/products";

/**
 * Seskupí položky feedu po produktu (varianty → jedna položka): cena = nejnižší cena varianty,
 * dostupnost = aspoň jedna varianta skladem, jinak „u dodavatele“, jinak vyprodáno.
 * Čistá funkce (testy `tests/unit/feed-group.test.ts`).
 */
export type GroupedFeedItem = Omit<FeedItem, "groupId"> & {
  /** Počet variant (0 = produkt bez variant). */
  variantCount: number;
  /** Nejvyšší cena ve skupině (pro „od – do“). */
  priceCzkMax: number;
};

export function groupFeedItemsByProduct(items: FeedItem[]): GroupedFeedItem[] {
  const groups = new Map<string, FeedItem[]>();
  for (const it of items) {
    const key = it.groupId ?? it.id;
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const out: GroupedFeedItem[] = [];
  for (const [key, list] of groups) {
    const priced = list.filter((i) => i.priceCzk > 0);
    const pool = priced.length ? priced : list;
    const cheapest = [...pool].sort((a, b) => a.priceCzk - b.priceCzk)[0];
    const first = list[0];
    const rest: Partial<FeedItem> = { ...first };
    delete rest.groupId;
    out.push({
      ...(rest as Omit<FeedItem, "groupId">),
      id: key,
      name: first.productName,
      priceCzk: cheapest.priceCzk,
      priceEur: cheapest.priceEur,
      priceCzkMax: Math.max(...pool.map((i) => i.priceCzk)),
      sku: first.groupId ? null : first.sku,
      inStock: list.some((i) => i.inStock),
      supplier: list.some((i) => i.supplier),
      variantCount: first.groupId ? list.length : 0,
    });
  }
  return out;
}
