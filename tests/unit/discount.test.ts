import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/exchange-rate", () => ({ getCnbEurRate: async () => ({ rate: 25, date: "2026-09-12" }) }));

import { validateDiscount } from "@/lib/checkout/discount";

type Row = { id: string; code: string; type: "percent" | "fixed"; value: number; min_order: number | null; valid_from: string | null; valid_to: string | null; usage_limit: number | null; used_count: number; is_active: boolean };

/** Minimální náhrada Supabase klienta: from().select().ilike().maybeSingle() */
function fakeSvc(row: Row | null) {
  const chain = { select: () => chain, ilike: () => chain, maybeSingle: async () => ({ data: row }) };
  return { from: () => chain } as never;
}
const base: Row = { id: "d1", code: "SLEVA10", type: "percent", value: 10, min_order: null, valid_from: null, valid_to: null, usage_limit: null, used_count: 0, is_active: true };

describe("validateDiscount", () => {
  it("procentní sleva z mezisoučtu", async () => {
    const r = await validateDiscount(fakeSvc(base), "sleva10", 100000, "CZK");
    expect(r).toMatchObject({ ok: true, amount: 10000, code: "SLEVA10" });
  });
  it("pevná sleva v Kč se pro EUR přepočte kurzem", async () => {
    const r = await validateDiscount(fakeSvc({ ...base, type: "fixed", value: 10000 }), "SLEVA10", 100000, "EUR");
    expect(r).toMatchObject({ ok: true, amount: 400 });
  });
  it("pevná sleva nepřesáhne mezisoučet", async () => {
    const r = await validateDiscount(fakeSvc({ ...base, type: "fixed", value: 500000 }), "SLEVA10", 100000, "CZK");
    expect(r).toMatchObject({ ok: true, amount: 100000 });
  });
  it("min. objednávka, platnost, limit použití, neaktivní", async () => {
    expect(await validateDiscount(fakeSvc({ ...base, min_order: 200000 }), "SLEVA10", 100000, "CZK")).toMatchObject({ ok: false, error: "MIN_ORDER" });
    expect(await validateDiscount(fakeSvc({ ...base, valid_to: "2000-01-01" }), "SLEVA10", 100000, "CZK")).toMatchObject({ ok: false, error: "EXPIRED" });
    expect(await validateDiscount(fakeSvc({ ...base, valid_from: "2999-01-01" }), "SLEVA10", 100000, "CZK")).toMatchObject({ ok: false, error: "NOT_STARTED" });
    expect(await validateDiscount(fakeSvc({ ...base, usage_limit: 1, used_count: 1 }), "SLEVA10", 100000, "CZK")).toMatchObject({ ok: false, error: "USED_UP" });
    expect(await validateDiscount(fakeSvc({ ...base, is_active: false }), "SLEVA10", 100000, "CZK")).toMatchObject({ ok: false, error: "INACTIVE" });
    expect(await validateDiscount(fakeSvc(null), "NIC", 100000, "CZK")).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });
});
