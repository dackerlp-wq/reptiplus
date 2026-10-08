import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/exchange-rate", () => ({ getCnbEurRate: async () => ({ rate: 25, date: "2026-09-12" }) }));
vi.mock("@/lib/email/client", () => ({ sendMail: async () => true }));

import { freeShippingThreshold } from "@/lib/settings";
import { variableSymbolForOrder } from "@/lib/orders/vs";

describe("freeShippingThreshold", () => {
  it("vrací limit podle měny, null = vypnuto", () => {
    const s = { freeFromCzk: 200000, freeFromEur: null };
    expect(freeShippingThreshold(s, "CZK")).toBe(200000);
    expect(freeShippingThreshold(s, "EUR")).toBeNull();
  });
});

describe("variabilní symbol", () => {
  it("z čísla objednávky vznikne jen číselný VS", () => {
    const vs = variableSymbolForOrder("RP260912-AB3K");
    expect(vs).toMatch(/^\d{1,10}$/);
  });
});
