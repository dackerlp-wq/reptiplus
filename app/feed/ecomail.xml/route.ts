import { getFeedItems, xmlEscape, priceStr } from "@/lib/feed/products";
import { groupFeedItemsByProduct } from "@/lib/feed/group";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

/**
 * Produktový feed pro Ecomail (formát Google Merchant, RSS 2.0 + g:) — jedna položka na produkt
 * (varianty sloučené: cena „od“, dostupnost souhrnně), bez položek za 0 Kč. Navíc:
 * custom_label_0 = slug kořenové kategorie (odpovídá štítkům `zajem-<slug>`), custom_label_1 = název kořenové
 * kategorie, custom_label_2 = cena v EUR, custom_label_3 = počet variant. Ecomail: Produktové feedy → přidat URL.
 */
export async function GET() {
  const items = groupFeedItemsByProduct(await getFeedItems());

  const body = items
    .map((it) => {
      const availability = it.inStock ? "in_stock" : it.supplier ? "backorder" : "out_of_stock";
      const lines = [
        `<item>`,
        `<g:id>${xmlEscape(it.id)}</g:id>`,
        `<title>${xmlEscape(it.name)}</title>`,
        `<description>${xmlEscape(it.description.slice(0, 5000))}</description>`,
        `<link>${xmlEscape(it.url)}</link>`,
        it.imageUrl ? `<g:image_link>${xmlEscape(it.imageUrl)}</g:image_link>` : "",
        ...it.extraImages.slice(0, 3).map((u) => `<g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`),
        `<g:price>${priceStr(it.priceCzk)} CZK</g:price>`,
        `<g:availability>${availability}</g:availability>`,
        `<g:condition>new</g:condition>`,
        it.brand ? `<g:brand>${xmlEscape(it.brand)}</g:brand>` : "",
        it.ean ? `<g:gtin>${xmlEscape(it.ean)}</g:gtin>` : "",
        it.sku ? `<g:mpn>${xmlEscape(it.sku)}</g:mpn>` : "",
        it.categoryText ? `<g:product_type>${xmlEscape(it.categoryText)}</g:product_type>` : "",
        it.rootCategory ? `<g:custom_label_0>${xmlEscape(it.rootCategory.slug)}</g:custom_label_0>` : "",
        it.rootCategory ? `<g:custom_label_1>${xmlEscape(it.rootCategory.name)}</g:custom_label_1>` : "",
        it.priceEur ? `<g:custom_label_2>${priceStr(it.priceEur)} EUR</g:custom_label_2>` : "",
        `<g:custom_label_3>${it.variantCount}</g:custom_label_3>`,
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
    `<description>Produktový feed pro Ecomail (jedna položka na produkt)</description>\n` +
    `${body}\n` +
    `</channel>\n</rss>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
