import { describe, expect, it } from "vitest";
import { availableIn, cartWeightKg, shippingPriceFor, shippingPricesByCountry } from "@/lib/shipping/price";

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

describe("cena dopravy podle země", () => {
  const m = {
    ...pickup,
    country_prices: { SK: { price_czk: 11900, price_eur: 490, heavy_price_czk: 22900 } },
  };
  it("pro zemi s vlastní cenou ji použije, chybějící pole převezme ze základu", () => {
    expect(shippingPriceFor(m, 1, "CZK", "SK")).toBe(11900);
    expect(shippingPriceFor(m, 8, "CZK", "sk")).toBe(22900);
    expect(shippingPriceFor(m, 8, "EUR", "SK")).toBe(790);
  });
  it("CZ a země bez vlastní ceny mají základní cenu", () => {
    expect(shippingPriceFor(m, 1, "CZK", "CZ")).toBe(9900);
    expect(shippingPriceFor(m, 1, "CZK", null)).toBe(9900);
    expect(shippingPricesByCountry(m, 1, "CZK")).toEqual({ CZ: 9900, SK: 11900, DE: 9900, AT: 9900, PL: 9900 });
  });
});

describe("doprava zdarma a dostupnost podle země", () => {
  it("doprava zdarma jen pro CZ a SK", () => {
    const p = shippingPricesByCountry({ price_czk: 9900, price_eur: 410, country_prices: { DE: { price_czk: 20900 } } }, 1, "CZK", true);
    expect(p).toEqual({ CZ: 0, SK: 0, DE: 20900, AT: 9900, PL: 9900 });
  });
  it("metoda bez zemí je všude, jinak jen ve vybraných", () => {
    expect(availableIn({ countries: null }, "AT")).toBe(true);
    expect(availableIn({ countries: ["CZ", "SK"] }, "sk")).toBe(true);
    expect(availableIn({ countries: ["CZ", "SK"] }, "AT")).toBe(false);
  });
});
