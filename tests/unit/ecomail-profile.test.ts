import { describe, expect, it } from "vitest";
import { buildCustomerProfile, interestTag, profileFields, rootCategoryResolver, type ProfileOrder } from "@/lib/ecomail/profile";

const cats = [
  { id: "c1", slug: "terarijni-technika", name: "Terarijní technika", parent_id: null },
  { id: "c2", slug: "osvetleni", name: "Osvětlení", parent_id: "c1" },
  { id: "c3", slug: "krmiva", name: "Krmiva", parent_id: null },
  { id: "loop-a", slug: "a", name: "A", parent_id: "loop-b" },
  { id: "loop-b", slug: "b", name: "B", parent_id: "loop-a" },
];
const productCat: Record<string, string> = { p1: "c2", p2: "c3", p3: "c1" };

const resolver = rootCategoryResolver(cats);
const rootOf = (productId: string) => resolver(productCat[productId] ?? null);

const orders: ProfileOrder[] = [
  { number: "RP1", status: "delivered", currency: "CZK", total: 150000, created_at: "2026-01-10T10:00:00Z", items: [{ product_id: "p1", qty: 1, line_total: 120000 }, { product_id: "p2", qty: 2, line_total: 20000 }] },
  { number: "RP2", status: "cancelled", currency: "CZK", total: 99900, created_at: "2026-02-01T10:00:00Z", items: [{ product_id: "p2", qty: 1, line_total: 99900 }] },
  { number: "RP3", status: "paid", currency: "EUR", total: 4000, created_at: "2026-03-05T10:00:00Z", items: [{ product_id: "p3", qty: 1, line_total: 3500 }] },
];

describe("buildCustomerProfile", () => {
  it("vynechá stornované, přepočítá EUR kurzem a seřadí zájmy podle útraty", () => {
    const p = buildCustomerProfile(orders, rootOf, 25);
    expect(p).not.toBeNull();
    expect(p!.pocet_objednavek).toBe(2);
    expect(p!.celkova_utrata_czk).toBe(1500 + 40 * 25);
    expect(p!.prumerna_objednavka_czk).toBe(1250);
    expect(p!.prvni_objednavka).toBe("2026-01-10");
    expect(p!.posledni_objednavka).toBe("2026-03-05");
    expect(p!.posledni_objednavka_cislo).toBe("RP3");
    expect(p!.posledni_objednavka_stav).toBe("paid");
    // technika: 1200 + 35*25 = 2075 Kč, krmiva: 200 Kč
    expect(p!.top_kategorie).toBe("Terarijní technika");
    expect(p!.zajmy).toEqual(["zajem-terarijni-technika", "zajem-krmiva"]);
  });

  it("vrací null bez platných objednávek a pole bez štítků", () => {
    expect(buildCustomerProfile([orders[1]], rootOf, null)).toBeNull();
    expect(profileFields(null)).toEqual({});
    const f = profileFields(buildCustomerProfile(orders, rootOf, null));
    expect(f).not.toHaveProperty("zajmy");
    expect(f.pocet_objednavek).toBe(2);
  });

  it("interestTag očistí diakritiku a ořízne délku", () => {
    expect(interestTag("Hadí Terária")).toBe("zajem-hadi-teraria");
    expect(interestTag("x".repeat(80)).length).toBe(50);
  });

  it("rootCategoryResolver přežije cyklus v rodičích", () => {
    expect(resolver("loop-a")).not.toBeNull();
    expect(resolver("nope")).toBeNull();
  });
});
