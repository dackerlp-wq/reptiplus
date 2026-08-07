import { getFeedItems, xmlEscape, priceStr } from "@/lib/feed/products";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

/** Produktový feed pro Google Merchant / Nákupy (RSS 2.0 + g: namespace). */
export async function GET() {
  const items = await getFeedItems();

  const body = items
    .map((it) => {
      const lines = [
        `<item>`,
        `<g:id>${xmlEscape(it.id)}</g:id>`,
        `<title>${xmlEscape(it.name)}</title>`,
        `<description>${xmlEscape(it.description)}</description>`,
        `<link>${xmlEscape(it.url)}</link>`,
        it.imageUrl ? `<g:image_link>${xmlEscape(it.imageUrl)}</g:image_link>` : "",
        ...it.extraImages.map(
          (u) => `<g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`,
        ),
        `<g:price>${priceStr(it.priceCzk)} CZK</g:price>`,
        `<g:availability>${it.inStock ? "in_stock" : "out_of_stock"}</g:availability>`,
        `<g:condition>new</g:condition>`,
        it.brand ? `<g:brand>${xmlEscape(it.brand)}</g:brand>` : "",
        it.ean ? `<g:gtin>${xmlEscape(it.ean)}</g:gtin>` : "",
        it.sku ? `<g:mpn>${xmlEscape(it.sku)}</g:mpn>` : "",
        it.categoryText
          ? `<g:product_type>${xmlEscape(it.categoryText)}</g:product_type>`
          : "",
        it.groupId
          ? `<g:item_group_id>${xmlEscape(it.groupId)}</g:item_group_id>`
          : "",
        // Bez EAN/MPN u některých produktů → řekni Googlu, že identifikátor neexistuje.
        !it.ean && !it.sku ? `<g:identifier_exists>no</g:identifier_exists>` : "",
        `</item>`,
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `<channel>\n` +
    `<title>Reptiplus</title>\n` +
    `<link>${xmlEscape(siteUrl())}</link>\n` +
    `<description>Teraristický obchod pro chovatele plazů a exotických zvířat</description>\n` +
    `${body}\n` +
    `</channel>\n</rss>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
