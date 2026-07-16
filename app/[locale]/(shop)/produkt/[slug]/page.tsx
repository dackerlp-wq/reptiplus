import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductGallery } from "@/components/reptiplus/product-gallery";
import type { Locale } from "@/i18n/routing";
import { getProductBySlug } from "@/lib/queries";
import {
  compareForLocale,
  discountPercent,
  formatPrice,
  pickI18n,
  priceForLocale,
} from "@/lib/i18n";
import { AddToCartButton } from "@/components/reptiplus/add-to-cart-button";

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
  const discount = discountPercent(priceMinor, compareMinor);
  const price = formatPrice(priceMinor, locale);
  const attributes = [...(product.product_attribute ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

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
          <div className="mt-4 flex items-baseline gap-3">
            <span
              className={`font-mono text-3xl font-semibold ${discount ? "text-error" : "text-forest"}`}
            >
              {price}
            </span>
            {discount && compareMinor !== null && (
              <>
                <span className="font-mono text-xl text-gray-soft line-through">
                  {formatPrice(compareMinor, locale)}
                </span>
                <span className="rounded-md bg-error px-2 py-1 text-sm font-semibold text-white">
                  −{discount}%
                </span>
              </>
            )}
          </div>

          {description && (
            <p className="mt-6 leading-relaxed text-charcoal/80">
              {description}
            </p>
          )}

          <div className="mt-6 max-w-xs">
            <AddToCartButton
              productId={product.id}
              label={t("addToCart")}
              addedLabel={t("added")}
              disabled={product.stock_qty <= 0}
            />
          </div>

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
                    <dt className="text-gray-soft">{attr.key}</dt>
                    <dd className="font-medium text-ink">{attr.value}</dd>
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
