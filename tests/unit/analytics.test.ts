import { describe, expect, it } from "vitest";
import {
  aPeriodRanges,
  aSummary,
  breakdown,
  categoryRows,
  customerStats,
  discountRows,
  fulfillment,
  heatmap,
  median,
  missingCostRows,
  productRows,
  rootCategory,
  type AOrder,
  type CategoryInfo,
  type CostCtx,
  type ProductInfo,
} from "@/lib/admin/analytics";

const R = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-12-01T00:00:00Z") };

let seq = 0;
function order(p: Partial<AOrder> = {}): AOrder {
  seq++;
  return {
    id: `o${seq}`,
    number: `RP${seq}`,
    created_at: "2026-11-10T10:00:00Z",
    status: "paid",
    payment_status: "paid",
    currency: "CZK",
    total: 121000,
    subtotal: 121000,
    shipping: 0,
    payment_fee: 0,
    discount: 0,
    refunded_amount: 0,
    payment_method: "card",
    shipping_method: "zasilkovna",
    customer_id: null,
    email: "a@x.cz",
    locale: "cs",
    country: "CZ",
    discount_code_id: null,
    items: [{ product_id: "p1", variant_id: null, name: "Tonic", qty: 1, line_total: 121000, vat_rate: 21 }],
    ...p,
  };
}

const products = new Map<string, ProductInfo>([
  ["p1", { categoryId: "c2", brandId: "b1", purchasePriceCzk: 50000 }],
  ["p2", { categoryId: null, brandId: null, purchasePriceCzk: null }],
]);
const ctx = (vatPayer = false, variantCost = new Map<string, number>()): CostCtx => ({ products, variantCost, vatPayer });

describe("období", () => {
  it("Vše začíná první objednávkou a nemá srovnání", () => {
    const first = new Date("2025-01-01T00:00:00Z");
    const r = aPeriodRanges("all", new Date("2026-11-23T00:00:00Z"), first);
    expect(r.current.from).toEqual(first);
    expect(r.previous).toBeNull();
  });
  it("30 dní má předchozí stejně dlouhé období", () => {
    const now = new Date("2026-11-23T00:00:00Z");
    const r = aPeriodRanges("30", now);
    expect(r.previous!.to).toEqual(r.current.from);
    expect(r.current.to.getTime() - r.current.from.getTime()).toBe(r.previous!.to.getTime() - r.previous!.from.getTime());
  });
});

describe("souhrn", () => {
  it("tržba, storna, nezaplacené, medián", () => {
    const orders = [
      order({ total: 100000, items: [] }),
      order({ total: 300000, items: [] }),
      order({ total: 50000, status: "new", payment_status: "pending", items: [] }),
      order({ status: "cancelled", payment_status: "failed" }),
      order({ created_at: "2026-10-01T00:00:00Z" }), // mimo období
    ];
    const s = aSummary(orders, R, null, ctx());
    expect(s.revenue).toBe(400000);
    expect(s.paidOrders).toBe(2);
    expect(s.ordersAll).toBe(4);
    expect(s.cancelled).toBe(1);
    expect(s.cancelRate).toBe(25);
    expect(s.unpaidOrders).toBe(1);
    expect(s.unpaidValue).toBe(50000);
    expect(s.aov).toBe(200000);
    expect(s.medianOrder).toBe(200000);
  });

  it("marže u plátce DPH z ceny bez DPH, jen se známou nákupkou", () => {
    const o = order({
      items: [
        { product_id: "p1", variant_id: null, name: "A", qty: 1, line_total: 121000, vat_rate: 21 },
        { product_id: "p2", variant_id: null, name: "B", qty: 1, line_total: 121000, vat_rate: 21 },
      ],
      total: 242000,
    });
    const s = aSummary([o], R, null, ctx(true));
    expect(s.revenueNet).toBe(200000);
    expect(s.margin).toBe(50000); // 100 000 bez DPH − 50 000 nákup
    expect(s.marginRate).toBe(50);
    expect(s.marginCoverage).toBe(50);
  });

  it("EUR se přepočítá kurzem", () => {
    const s = aSummary([order({ currency: "EUR", total: 1000, items: [] })], R, 25, ctx());
    expect(s.revenue).toBe(25000);
  });
});

describe("rozpady a čas", () => {
  it("podíl podle platby, zrušené jen na přání", () => {
    const orders = [order({ payment_method: "card" }), order({ payment_method: "cod" }), order({ payment_method: "card", status: "cancelled" })];
    const rows = breakdown(orders, R, null, (o) => o.payment_method);
    expect(rows.find((r) => r.key === "card")!.orders).toBe(1);
    expect(rows.find((r) => r.key === "card")!.share).toBe(50);
    expect(breakdown(orders, R, null, (o) => o.status, { includeCancelled: true }).find((r) => r.key === "cancelled")!.orders).toBe(1);
  });

  it("heatmapa v pražském čase (pondělí 10:00 UTC = 11 h)", () => {
    const m = heatmap([order({ created_at: "2026-11-09T10:00:00Z" })], R);
    expect(m[0][11]).toBe(1);
  });

  it("medián", () => {
    expect(median([])).toBe(0);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
  });
});

describe("zákazníci", () => {
  it("noví vs vracející se a opakovaný nákup", () => {
    const orders = [
      order({ email: "old@x.cz", created_at: "2026-09-01T00:00:00Z" }),
      order({ email: "OLD@x.cz", created_at: "2026-11-05T00:00:00Z", customer_id: "u1" }),
      order({ email: "new@x.cz", created_at: "2026-11-06T00:00:00Z" }),
    ];
    const c = customerStats(orders, R, null);
    expect(c.customers).toBe(2);
    expect(c.newCustomers).toBe(1);
    expect(c.returningCustomers).toBe(1);
    expect(c.repeatRate).toBe(50);
    expect(c.registeredShare).toBe(50);
    expect(c.avgDaysBetweenOrders).toBe(65);
    expect(c.top[0].registered).toBe(true);
  });
});

describe("kategorie, slevy, vyřízení", () => {
  const cats = new Map<string, CategoryInfo>([
    ["c1", { name: "Výživa", parentId: null }],
    ["c2", { name: "Vitamíny", parentId: "c1" }],
  ]);

  it("kořenová kategorie", () => {
    expect(rootCategory("c2", cats)).toEqual({ id: "c1", name: "Výživa" });
    const rows = categoryRows([order(), order({ items: [{ product_id: "p2", variant_id: null, name: "B", qty: 2, line_total: 1000, vat_rate: 21 }] })], R, null, ctx(), cats);
    expect(rows.map((r) => r.name)).toEqual(["Výživa", "Bez kategorie"]);
  });

  it("slevové kódy", () => {
    const rows = discountRows([order({ discount_code_id: "d1", discount: 10000 }), order({ discount_code_id: "d1", discount: 10000, status: "cancelled" })], R, null);
    expect(rows).toEqual([{ codeId: "d1", orders: 1, discount: 10000, revenue: 121000 }]);
  });

  it("doba do zaplacení / odeslání a metoda na bráně", () => {
    const o = order({ created_at: "2026-11-10T10:00:00Z" });
    const f = fulfillment(
      [o],
      [
        { order_id: o.id, type: "payment", created_at: "2026-11-10T10:00:05Z", meta: { status: "created", source: "comgate", method: "APPLEPAY_REDIRECT" } },
        { order_id: o.id, type: "payment", created_at: "2026-11-10T12:00:00Z", meta: { status: "paid", source: "comgate" } },
        { order_id: o.id, type: "status", created_at: "2026-11-11T10:00:00Z", meta: { to: "shipped" } },
      ],
      R,
    );
    expect(f.hoursToPaid).toBe(2);
    expect(f.hoursToShipped).toBe(24);
    expect(f.gatewayMethods[0]).toMatchObject({ key: "APPLEPAY_REDIRECT", orders: 1, share: 100 });
  });
});

describe("nákupní ceny a marže", () => {
  it("nákupní cena varianty má přednost před produktem", () => {
    const o = order({
      total: 242000,
      items: [
        { product_id: "p1", variant_id: "v-big", name: "Tonic – 1000 g", qty: 1, line_total: 121000, vat_rate: 21 },
        { product_id: "p1", variant_id: "v-small", name: "Tonic – 100 g", qty: 1, line_total: 121000, vat_rate: 21 },
      ],
    });
    // v-big 80 000, v-small bez vlastní → produkt 50 000; neplátce DPH
    const s = aSummary([o], R, null, ctx(false, new Map([["v-big", 80000]])));
    expect(s.margin).toBe(242000 - 80000 - 50000);
    const rows = productRows([o], R, null, ctx(false, new Map([["v-big", 80000]])));
    expect(rows[0]).toMatchObject({ key: "p1", qty: 2, margin: 112000, partialCost: false });
  });

  it("chybějící nákupní ceny a neúplná marže", () => {
    const orders = [
      order({ items: [{ product_id: "p2", variant_id: null, name: "B", qty: 3, line_total: 30000, vat_rate: 21 }], total: 30000 }),
      order(),
    ];
    const missing = missingCostRows(orders, R, null, ctx());
    expect(missing.map((r) => r.key)).toEqual(["p2"]);
    expect(missing[0].qty).toBe(3);
    const rows = productRows(orders, R, null, ctx());
    expect(rows.find((r) => r.key === "p2")!.margin).toBeNull();
    expect(rows.find((r) => r.key === "p1")!.margin).toBe(71000);
  });
});

import { marginOf } from "@/lib/admin/margin";

describe("náhled marže ve formuláři", () => {
  it("plátce DPH: z ceny bez DPH", () => {
    const m = marginOf(121, 50, 21, true)!;
    expect(m.net).toBeCloseTo(100);
    expect(m.margin).toBeCloseTo(50);
    expect(m.pct).toBe(50);
    expect(m.markup).toBe(100);
  });
  it("neplátce a chybějící hodnoty", () => {
    expect(marginOf(121, 50, 21, false)!.margin).toBe(71);
    expect(marginOf(null, 50, 21, false)).toBeNull();
    expect(marginOf(100, null, 21, false)).toBeNull();
  });
});
