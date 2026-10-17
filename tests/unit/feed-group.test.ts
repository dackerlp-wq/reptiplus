import { describe, expect, it } from "vitest";
import { groupFeedItemsByProduct } from "@/lib/feed/group";
import type { FeedItem } from "@/lib/feed/products";

const base = {
  productName: "Cricket Cream",
  description: "Kaše",
  url: "https://reptiplus.cz/cs/produkt/cricket-cream",
  imageUrl: "https://img/1.jpg",
  extraImages: [],
  priceEur: null,
  brand: "Tailybite",
  categoryText: "Krmiva | Kaše",
  rootCategory: { slug: "krmiva", name: "Krmiva" },
  ean: null,
  supplier: false,
};

const items: FeedItem[] = [
  { ...base, id: "v1", groupId: "p1", name: "Cricket Cream – 80 g", priceCzk: 19900, sku: "CC-80", inStock: false },
  { ...base, id: "v2", groupId: "p1", name: "Cricket Cream – 150 g", priceCzk: 29900, sku: "CC-150", inStock: true },
  { ...base, id: "v3", groupId: "p1", name: "Cricket Cream – 1 kg", priceCzk: 0, sku: "CC-1000", inStock: false },
  { ...base, id: "p2", groupId: null, name: "Lampa", productName: "Lampa", priceCzk: 99900, sku: "L-1", inStock: false, supplier: true },
];

describe("groupFeedItemsByProduct", () => {
  it("sloučí varianty do produktu s nejnižší nenulovou cenou a souhrnnou dostupností", () => {
    const g = groupFeedItemsByProduct(items);
    expect(g).toHaveLength(2);
    const p1 = g.find((x) => x.id === "p1")!;
    expect(p1.name).toBe("Cricket Cream");
    expect(p1.priceCzk).toBe(19900);
    expect(p1.priceCzkMax).toBe(29900);
    expect(p1.inStock).toBe(true);
    expect(p1.variantCount).toBe(3);
    expect(p1.sku).toBeNull();
    expect(p1).not.toHaveProperty("groupId");
  });

  it("produkt bez variant projde beze změny", () => {
    const p2 = groupFeedItemsByProduct(items).find((x) => x.id === "p2")!;
    expect(p2.variantCount).toBe(0);
    expect(p2.sku).toBe("L-1");
    expect(p2.supplier).toBe(true);
    expect(p2.inStock).toBe(false);
  });
});
