import { describe, expect, it } from "vitest";
import {
  daysOfStock,
  daysSince,
  stockHistory,
  stockStatus,
  stockValue,
  summarizeStock,
  weeklyBuckets,
} from "@/lib/admin/stock-stats";

const now = new Date("2026-10-10T12:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86400_000).toISOString();

describe("stav zásoby", () => {
  const base = { lowStockThreshold: 2, periodDays: 90 };
  it("vyprodáno a docházející mají přednost", () => {
    expect(stockStatus({ ...base, stock: 0, sold: 10, daysSinceSale: 1 })).toBe("out");
    expect(stockStatus({ ...base, stock: 2, sold: 10, daysSinceSale: 1 })).toBe("low");
  });
  it("ležák = bez prodeje déle než deadDays nebo nikdy", () => {
    expect(stockStatus({ ...base, stock: 10, sold: 0, daysSinceSale: null })).toBe("dead");
    expect(stockStatus({ ...base, stock: 10, sold: 1, daysSinceSale: 91 })).toBe("dead");
    expect(stockStatus({ ...base, stock: 10, sold: 1, daysSinceSale: 91 }, { deadDays: 120, slowDays: 180 })).toBe("slow");
  });
  it("pomalé = zásoba na víc než slowDays, jinak prodává se", () => {
    // 10 ks, 2 prodané za 90 dní → 450 dní zásoby
    expect(stockStatus({ ...base, stock: 10, sold: 2, daysSinceSale: 5 })).toBe("slow");
    // 10 ks, 30 prodaných za 90 dní → 30 dní zásoby
    expect(stockStatus({ ...base, stock: 10, sold: 30, daysSinceSale: 1 })).toBe("ok");
  });
  it("limit null = nehlídat docházející", () => {
    expect(stockStatus({ stock: 1, lowStockThreshold: null, sold: 30, periodDays: 90, daysSinceSale: 1 })).toBe("ok");
  });
});

describe("dny zásoby a hodnota", () => {
  it("daysOfStock", () => {
    expect(daysOfStock(10, 30, 90)).toBe(30);
    expect(daysOfStock(10, 0, 90)).toBeNull();
  });
  it("daysSince", () => {
    expect(daysSince(ago(3), now)).toBe(3);
    expect(daysSince(null, now)).toBeNull();
  });
  it("stockValue: nákupní cena, jinak prodejní bez DPH", () => {
    expect(stockValue(2, 121000, null, 21)).toBe(200000);
    expect(stockValue(2, 121000, 80000, 21)).toBe(160000);
    expect(stockValue(0, 121000, 80000, 21)).toBe(0);
  });
});

describe("týdenní řady", () => {
  it("weeklyBuckets zařadí prodeje do správných týdnů", () => {
    const b = weeklyBuckets([{ at: ago(1), qty: 2 }, { at: ago(8), qty: 1 }, { at: ago(100), qty: 5 }], 12, now);
    expect(b).toHaveLength(12);
    expect(b[11]).toBe(2);
    expect(b[10]).toBe(1);
    expect(b.reduce((a, c) => a + c, 0)).toBe(3);
  });
  it("stockHistory dopočte stav zpětně", () => {
    // teď 5 ks; před 3 dny prodej −2, před 10 dny příjem +10
    const h = stockHistory(5, [{ at: ago(3), delta: -2 }, { at: ago(10), delta: 10 }], 4, now);
    expect(h[3]).toBe(5); // konec posledního týdne = teď
    expect(h[2]).toBe(7); // před týdnem: prodej ještě nenastal
    expect(h[1]).toBe(-3); // před 2 týdny: ani příjem (stav z pohledu dat před dopočtem)
  });
});

describe("summarizeStock", () => {
  it("sčítá hodnotu, ležáky a obrátku", () => {
    const s = summarizeStock(
      [
        { stock: 10, lowStockThreshold: 2, sold: 30, daysSinceSale: 1, priceCzk: 12100, purchasePriceCzk: null, vatRate: 21 },
        { stock: 4, lowStockThreshold: 2, sold: 0, daysSinceSale: null, priceCzk: 12100, purchasePriceCzk: 5000, vatRate: 21 },
        { stock: 0, lowStockThreshold: 2, sold: 3, daysSinceSale: 20, priceCzk: 12100, purchasePriceCzk: null, vatRate: 21 },
      ],
      90,
    );
    expect(s.units).toBe(14);
    expect(s.valueCzk).toBe(100000 + 20000);
    expect(s.dead).toBe(1);
    expect(s.deadValueCzk).toBe(20000);
    expect(s.out).toBe(1);
    expect(s.soldUnits).toBe(33);
    expect(s.turnover).toBeGreaterThan(0);
  });
});
