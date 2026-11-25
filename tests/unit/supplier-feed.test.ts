import { describe, expect, it } from "vitest";
import { parseHeurekaFeed } from "@/lib/suppliers/parse";

const XML = `<?xml version="1.0" encoding="utf-8"?>
<SHOP>
  <SHOPITEM>
    <ITEM_ID>97112</ITEM_ID>
    <PRODUCTNAME>Granovit Arabská guma - prášek 200g</PRODUCTNAME>
    <URL>https://eshop.farmapython.cz/p/arabska-guma-prasek-200g</URL>
    <IMGURL>https://cdn.example/a.jpg</IMGURL>
    <IMGURL_ALTERNATIVE>https://cdn.example/b.jpg</IMGURL_ALTERNATIVE>
    <VAT>12</VAT>
    <MANUFACTURER>Granovit</MANUFACTURER>
    <CATEGORYTEXT>Heureka.cz | Chovatelské potřeby | Teraristika | Krmiva pro terarijní zvířata</CATEGORYTEXT>
    <DELIVERY_DATE>0</DELIVERY_DATE>
    <ITEMGROUP_ID>G493</ITEMGROUP_ID>
    <LONG_DESCRIPTION_CZ>&lt;p&gt;Arabská guma &amp; míza&lt;/p&gt;</LONG_DESCRIPTION_CZ>
    <WEIGHT>250</WEIGHT>
    <SHORT_DESCRIPTION_CZ>Arabská guma ve formě prášku</SHORT_DESCRIPTION_CZ>
    <PRICE_WITHOUT_VAT_VELKOOBCHOD_CZK>180.36</PRICE_WITHOUT_VAT_VELKOOBCHOD_CZK>
    <PRICE_WITHOUT_VAT_VELKOOBCHOD_EUR>7.5</PRICE_WITHOUT_VAT_VELKOOBCHOD_EUR>
    <PRICE_WITHOUT_VAT_VYCHOZI_CZK>216.96</PRICE_WITHOUT_VAT_VYCHOZI_CZK>
    <PRICE_WITHOUT_VAT_VYCHOZI_EUR>9.04</PRICE_WITHOUT_VAT_VYCHOZI_EUR>
  </SHOPITEM>
  <SHOPITEM>
    <ITEM_ID>2</ITEM_ID>
    <PRODUCT>Standardní Heureka položka</PRODUCT>
    <PRICE_VAT>121</PRICE_VAT>
    <VAT>21%</VAT>
    <EAN>8590000000001</EAN>
  </SHOPITEM>
  <SHOPITEM><ITEM_ID>3</ITEM_ID></SHOPITEM>
</SHOP>`;

describe("feed dodavatele (Heureka XML)", () => {
  const items = parseHeurekaFeed(XML);

  it("přečte položky a přeskočí neúplné", () => {
    expect(items.map((i) => i.itemId)).toEqual(["97112", "2"]);
  });

  it("rozšířená pole Mergada: ceny, popisy, obrázky, hmotnost, kategorie bez prefixu Heureka.cz", () => {
    expect(items[0]).toMatchObject({
      name: "Granovit Arabská guma - prášek 200g",
      groupId: "G493",
      images: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
      vatRate: 12,
      manufacturer: "Granovit",
      categoryText: "Chovatelské potřeby | Teraristika | Krmiva pro terarijní zvířata",
      weightG: 250,
      description: "<p>Arabská guma & míza</p>",
      wholesaleCzk: 180.36,
      wholesaleEur: 7.5,
      retailCzk: 216.96,
      retailEur: 9.04,
      deliveryDays: 0,
    });
  });

  it("standardní Heureka: PRICE_VAT → cena bez DPH", () => {
    expect(items[1]).toMatchObject({ name: "Standardní Heureka položka", ean: "8590000000001", retailCzk: 100 });
  });
});

describe("ceny z feedu", async () => {
  const { sellPrice, purchasePrice, marginPct } = await import("@/lib/suppliers/pricing");
  const item = { vatRate: 12, wholesaleCzk: 180.36, wholesaleEur: 7.5, retailCzk: 216.96, retailEur: 9.04 };

  it("doporučená cena + DPH, zaokrouhlení nahoru", () => {
    expect(sellPrice(item, { mode: "recommended" }, "CZK")).toBe(24300); // 216.96 × 1.12 = 242.99… → 243 Kč
    expect(sellPrice(item, { mode: "recommended" }, "EUR")).toBe(1020); // 9.04 × 1.12 = 10.12 → 10.20 €
  });
  it("přirážka na velkoobchod", () => {
    expect(sellPrice(item, { mode: "markup", pct: 40 }, "CZK")).toBe(28300); // 180.36 × 1.12 × 1.4 = 282.8 → 283
  });
  it("nákupní cena: neplátce s DPH, plátce bez DPH", () => {
    expect(purchasePrice(item, false)).toBe(20200);
    expect(purchasePrice(item, true)).toBe(18036);
  });
  it("marže", () => {
    expect(marginPct(24300, 20200, 12, false)).toBe(16.9);
  });
});

describe("import: slug a popis", async () => {
  const { slugify, cleanDescription } = await import("@/lib/suppliers/import");
  it("slug bez diakritiky", () => {
    expect(slugify("Granovit Arabská guma - prášek 200g")).toBe("granovit-arabska-guma-prasek-200g");
  });
  it("popis bez odkazů, obrázků a skriptů", () => {
    expect(
      cleanDescription('<p>Text <a href="https://eshop.farmapython.cz">odkaz</a><img src="x.jpg"><script>x()</script></p><p> </p><ul><li>bod</li></ul>'),
    ).toBe("<p>Text odkaz</p><ul><li>bod</li></ul>");
  });
});

describe("varianty: název produktu a variant", async () => {
  const { splitVariantNames } = await import("@/lib/suppliers/variants");
  it("rozdělí podle společného začátku na hranici slova", () => {
    expect(
      splitVariantNames([
        "Arcadia voděodolná provozní jednotka T5 54W,1 trubice",
        "Arcadia voděodolná provozní jednotka T5 54W,2 trubice",
      ]),
    ).toEqual({ base: "Arcadia voděodolná provozní jednotka T5 54W", variants: ["1 trubice", "2 trubice"] });
    expect(
      splitVariantNames(["Arcadia voděodolná provozní jednotka T8 18W", "Arcadia voděodolná provozní jednotka T8 25-30W"]),
    ).toEqual({ base: "Arcadia voděodolná provozní jednotka T8", variants: ["18W", "25-30W"] });
    expect(splitVariantNames(["Krmivo 200g", "Krmivo 1kg"])).toEqual({ base: "Krmivo", variants: ["200g", "1kg"] });
  });
  it("bez rozumného společného začátku nechá celé názvy", () => {
    expect(splitVariantNames(["Alfa", "Beta"])).toEqual({ base: "Alfa", variants: ["Alfa", "Beta"] });
  });
});
