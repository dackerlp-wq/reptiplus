import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/exchange-rate", () => ({ getCnbEurRate: async () => ({ rate: 25, date: "2026-09-12" }) }));
vi.mock("@/lib/email/client", () => ({ sendMail: async () => true }));

import { freeShippingThreshold } from "@/lib/settings";
import { genVoucherCode, isVoucherCodeLike, normalizeVoucherCode, voucherRedemption } from "@/lib/vouchers/service";
import { variableSymbolForOrder } from "@/lib/orders/vs";

describe("freeShippingThreshold", () => {
  it("vrací limit podle měny, null = vypnuto", () => {
    const s = { freeFromCzk: 200000, freeFromEur: null };
    expect(freeShippingThreshold(s, "CZK")).toBe(200000);
    expect(freeShippingThreshold(s, "EUR")).toBeNull();
  });
});

describe("dárkové poukazy", () => {
  it("kód má tvar DP-XXXX-XXXX bez zaměnitelných znaků", () => {
    for (let i = 0; i < 20; i++) {
      const c = genVoucherCode();
      expect(c).toMatch(/^DP-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(isVoucherCodeLike(c)).toBe(true);
    }
    expect(normalizeVoucherCode(" dp-abcd-2345 ")).toBe("DP-ABCD-2345");
    expect(isVoucherCodeLike("SLEVA10")).toBe(false);
  });
  it("čerpání nepřesáhne zůstatek ani částku k úhradě", () => {
    const czk = { ok: true as const, voucherId: "v", code: "DP-AAAA-BBBB", balanceCzk: 50000, balance: 50000, rate: null };
    expect(voucherRedemption(czk, 30000)).toEqual({ amount: 30000, amountCzk: 30000 });
    expect(voucherRedemption(czk, 80000)).toEqual({ amount: 50000, amountCzk: 50000 });
    const eur = { ...czk, balance: 2000, rate: 25 }; // 500 Kč = 20 €
    expect(voucherRedemption(eur, 1000)).toEqual({ amount: 1000, amountCzk: 25000 });
    expect(voucherRedemption(eur, 9999).amountCzk).toBeLessThanOrEqual(50000);
  });
});

describe("variabilní symbol", () => {
  it("z čísla objednávky vznikne jen číselný VS", () => {
    const vs = variableSymbolForOrder("RP260912-AB3K");
    expect(vs).toMatch(/^\d{1,10}$/);
  });
});
