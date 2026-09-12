import { describe, expect, it } from "vitest";
import { bucketize, deltaPct, periodRanges, summarize, topProducts, type StatsOrder } from "@/lib/admin/stats";

const now = new Date("2026-09-12T12:00:00Z");
const day = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString();
const orders: StatsOrder[] = [
  { id: "1", created_at: day(1), status: "paid", payment_status: "paid", currency: "CZK", total: 100000, items: [{ product_id: "a", name: "A", qty: 2, line_total: 100000 }] },
  { id: "2", created_at: day(2), status: "new", payment_status: "pending", currency: "CZK", total: 50000, items: [{ product_id: "b", name: "B", qty: 1, line_total: 50000 }] },
  { id: "3", created_at: day(3), status: "cancelled", payment_status: "failed", currency: "CZK", total: 999999, items: [] },
  { id: "4", created_at: day(5), status: "shipped", payment_status: "paid", currency: "EUR", total: 4000, items: [{ product_id: "a", name: "A – varianta", qty: 1, line_total: 4000 }] },
  { id: "5", created_at: day(20), status: "paid", payment_status: "paid", currency: "CZK", total: 30000, items: [{ product_id: "c", name: "C", qty: 1, line_total: 30000 }] },
];

describe("summarize", () => {
  it("počítá tržby jen ze zaplacených, storna ignoruje, EUR přepočte", () => {
    const { current, previous } = periodRanges("7", now);
    const s = summarize(orders, current, 25);
    expect(s.orders).toBe(3); // 1, 2, 4 (3 je storno)
    expect(s.paidOrders).toBe(2);
    expect(s.revenue).toBe(100000 + 4000 * 25);
    expect(s.aov).toBe(Math.round((100000 + 100000) / 2));
    expect(s.items).toBe(3);
    const p = summarize(orders, previous, 25);
    expect(p.orders).toBe(0);
  });
});

describe("deltaPct", () => {
  it("procentní změna, dělení nulou → null", () => {
    expect(deltaPct(120, 100)).toBe(20);
    expect(deltaPct(50, 100)).toBe(-50);
    expect(deltaPct(0, 0)).toBe(0);
    expect(deltaPct(10, 0)).toBeNull();
  });
});

describe("bucketize", () => {
  it("vytvoří jeden sloupec na den včetně prázdných", () => {
    const { current } = periodRanges("7", now);
    const b = bucketize(orders, current, 25);
    expect(b).toHaveLength(7);
    expect(b.reduce((s, x) => s + x.revenue, 0)).toBe(100000 + 4000 * 25);
    expect(b.reduce((s, x) => s + x.orders, 0)).toBe(3);
  });
  it("delší období seskupí po měsících", () => {
    const { current } = periodRanges("365", now);
    const b = bucketize(orders, current, 25);
    expect(b.length).toBeGreaterThanOrEqual(12);
    expect(b.length).toBeLessThanOrEqual(13);
  });
});

describe("topProducts", () => {
  it("sečte kusy i tržbu podle produktu a seřadí podle tržby", () => {
    const { current } = periodRanges("30", now);
    const t = topProducts(orders, current, 25);
    expect(t[0]).toMatchObject({ productId: "a", qty: 3, revenue: 100000 + 4000 * 25, name: "A" });
    expect(t.find((x) => x.productId === "b")).toBeUndefined(); // nezaplacená
  });
});
