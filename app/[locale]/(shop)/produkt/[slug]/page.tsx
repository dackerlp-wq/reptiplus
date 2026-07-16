import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductGallery } from "@/components/reptiplus/product-gallery";
import { ProductBuyBox } from "@/components/reptiplus/product-buy-box";
import type { Locale } from "@/i18n/routing";
import { getProductBySlug } from "@/lib/queries";
import {
  compareForLocale,
  localeCurrency,
  pickI18n,
  priceForLocale,
} from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = pickI18n(product.name_i18n, locale, product.name);
  const description = pickI18n(
    product.description_i18n,
    locale,
    product.description,
  );
  return { title: name, description };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Product");

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const name = pickI18n(product.name_i18n, locale, product.name);
  const description = pickI18n(
    product.description_i18n,
    locale,
    product.description,
  );
  const priceMinor = priceForLocale(product, locale);
  const compareMinor = compareForLocale(product, locale);
  const attributes = [...(product.product_attribute ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const isCzk = localeCurrency[locale] === "CZK";
  const buyVariants = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    price: (isCzk ? v.price_czk : v.price_eur) ?? priceMinor,
    stock: v.stock_qty,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        href="/produkty"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-soft transition-colors hover:text-forest"
      >
        <ArrowLeft className="size-4" /> {t("backToCatalog")}
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery images={product.images} name={name} />

        <div>
          {product.brand && (
            <span className="text-sm font-medium uppercase tracking-wide text-gray-soft">
              {product.brand.name}
            </span>
          )}
          <h1 className="mt-2 font-display text-4xl font-bold">{name}</h1>

          <div className="mt-4">
            <ProductBuyBox
              productId={product.id}
              locale={locale}
              basePrice={priceMinor}
              baseCompare={compareMinor}
              baseStock={product.stock_qty}
              variants={buyVariants}
              labels={{
                variant: t("variant"),
                addToCart: t("addToCart"),
                added: t("added"),
                outOfStock: t("outOfStock"),
              }}
            />
          </div>

          {description && (
            <div
              className="rich-content mt-6 text-charcoal/80"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}

          {attributes.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 font-display text-xl font-semibold">
                {t("parameters")}
              </h2>
              <dl className="divide-y divide-cream-dark rounded-xl border border-cream-dark bg-white">
                {attributes.map((attr) => (
                  <div
                    key={attr.key}
                    className="flex justify-between px-4 py-3 text-sm"
                  >
                    <dt className="text-gray-soft">
                      {pickI18n(attr.key_i18n, locale, attr.key)}
                    </dt>
                    <dd className="font-medium text-ink">
                      {pickI18n(attr.value_i18n, locale, attr.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
