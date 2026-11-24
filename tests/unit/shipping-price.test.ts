import { describe, expect, it } from "vitest";
import { cartWeightKg, shippingPriceFor } from "@/lib/shipping/price";

const pickup = { price_czk: 9900, price_eur: 390, heavy_from_kg: 5, heavy_price_czk: 19900, heavy_price_eur: 790 };

describe("cena dopravy podle hmotnosti", () => {
  it("sečte hmotnost košíku, produkty bez hmotnosti nepočítá", () => {
    expect(cartWeightKg([{ qty: 2, weightKg: 1.25 }, { qty: 3, weightKg: null }, { qty: 1, weightKg: 0.4 }])).toBe(2.9);
  });

  it("do limitu základní cena, nad limit těžká", () => {
    expect(shippingPriceFor(pickup, 0, "CZK")).toBe(9900);
    expect(shippingPriceFor(pickup, 5, "CZK")).toBe(9900);
    expect(shippingPriceFor(pickup, 5.01, "CZK")).toBe(19900);
    expect(shippingPriceFor(pickup, 8, "EUR")).toBe(790);
  });

  it("bez nastaveného limitu nebo těžké ceny jedna cena", () => {
    expect(shippingPriceFor({ price_czk: 9900, price_eur: null }, 30, "CZK")).toBe(9900);
    expect(shippingPriceFor({ price_czk: 9900, price_eur: null }, 30, "EUR")).toBe(0);
    expect(shippingPriceFor({ ...pickup, heavy_price_eur: null }, 30, "EUR")).toBe(390);
  });
});
