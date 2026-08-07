import { getFeedItems, xmlEscape, priceStr } from "@/lib/feed/products";

export const revalidate = 3600; // feed přegenerovat max jednou za hodinu

/** Produktový XML feed pro Heureka.cz. */
export async function GET() {
  const items = await getFeedItems();

  const body = items
    .map((it) => {
      const lines = [
        `<SHOPITEM>`,
        `<ITEM_ID>${xmlEscape(it.id)}</ITEM_ID>`,
        `<PRODUCTNAME>${xmlEscape(it.name)}</PRODUCTNAME>`,
        `<PRODUCT>${xmlEscape(it.name)}</PRODUCT>`,
        `<DESCRIPTION>${xmlEscape(it.description)}</DESCRIPTION>`,
        `<URL>${xmlEscape(it.url)}</URL>`,
        it.imageUrl ? `<IMGURL>${xmlEscape(it.imageUrl)}</IMGURL>` : "",
        ...it.extraImages.map(
          (u) => `<IMGURL_ALTERNATIVE>${xmlEscape(u)}</IMGURL_ALTERNATIVE>`,
        ),
        `<PRICE_VAT>${priceStr(it.priceCzk)}</PRICE_VAT>`,
        it.brand ? `<MANUFACTURER>${xmlEscape(it.brand)}</MANUFACTURER>` : "",
        it.categoryText
          ? `<CATEGORYTEXT>${xmlEscape(it.categoryText)}</CATEGORYTEXT>`
          : "",
        it.ean ? `<EAN>${xmlEscape(it.ean)}</EAN>` : "",
        it.sku ? `<PRODUCTNO>${xmlEscape(it.sku)}</PRODUCTNO>` : "",
        `<DELIVERY_DATE>${it.inStock ? 0 : 7}</DELIVERY_DATE>`,
        it.groupId ? `<ITEMGROUP_ID>${xmlEscape(it.groupId)}</ITEMGROUP_ID>` : "",
        `</SHOPITEM>`,
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<SHOP>\n${body}\n</SHOP>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
