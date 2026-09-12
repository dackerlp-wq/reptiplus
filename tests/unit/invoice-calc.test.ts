import { describe, expect, it } from "vitest";
import { allocateProportionally, baseFromGross, calcInvoice } from "@/lib/invoices/calc";

const labels = { shipping: "Doprava", paymentFee: "Dobírka", discount: "Sleva" };

describe("baseFromGross", () => {
  it("odvodí základ daně z ceny s DPH", () => {
    expect(baseFromGross(12100, 21)).toBe(10000);
    expect(baseFromGross(11200, 12)).toBe(10000);
    expect(baseFromGross(10000, 0)).toBe(10000);
  });
});

describe("allocateProportionally", () => {
  it("rozdělí částku poměrně a součet sedí na halíř", () => {
    const parts = allocateProportionally(10000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(parts.length).toBe(3);
  });
  it("nulové váhy nic nedostanou", () => {
    expect(allocateProportionally(500, [0, 10])).toEqual([0, 500]);
  });
});

describe("calcInvoice", () => {
  it("položky + doprava + poplatek − sleva: součty se rovnají", () => {
    const totals = calcInvoice({
      items: [
        { name: "UVB zářivka", sku: "A1", qty: 2, unit_price: 60500, line_total: 121000, vat_rate: 21 },
        { name: "Krmivo", sku: "B2", qty: 1, unit_price: 11200, line_total: 11200, vat_rate: 12 },
      ],
      shipping: 12100,
      paymentFee: 3630,
      discount: 10000,
      labels,
    });
    const linesTotal = totals.lines.reduce((s, l) => s + l.line_total, 0);
    expect(linesTotal).toBe(121000 + 11200 + 12100 + 3630 - 10000);
    expect(totals.total).toBe(linesTotal);
    expect(totals.subtotal + totals.vat_total).toBe(totals.total);
    const breakdownTotal = totals.breakdown.reduce((s, r) => s + r.total, 0);
    expect(breakdownTotal).toBe(totals.total);
    // Sleva se rozpočítá jen do sazeb položek (21 a 12 %), ne do dopravy.
    const discountLines = totals.lines.filter((l) => l.kind === "discount");
    expect(discountLines.reduce((s, l) => s + l.line_total, 0)).toBe(-10000);
  });
  it("bez slevy a bez dopravy je DPH jen z položek", () => {
    const totals = calcInvoice({ items: [{ name: "X", sku: null, qty: 1, unit_price: 12100, line_total: 12100, vat_rate: 21 }], shipping: 0, paymentFee: 0, discount: 0, labels });
    expect(totals.subtotal).toBe(10000);
    expect(totals.vat_total).toBe(2100);
    expect(totals.breakdown).toHaveLength(1);
  });
});
