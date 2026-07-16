import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Leaf } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ProductListItem } from "@/lib/queries";
import {
  compareForLocale,
  discountPercent,
  formatPrice,
  pickI18n,
  priceForLocale,
} from "@/lib/i18n";
import { AddToCartButton } from "./add-to-cart-button";

export async function ProductCard({
  product,
  locale,
}: {
  product: ProductListItem;
  locale: Locale;
}) {
  const t = await getTranslations("Product");
  const name = pickI18n(product.name_i18n, locale, product.name);
  const priceMinor = priceForLocale(product, locale);
  const compareMinor = compareForLocale(product, locale);
  const discount = discountPercent(priceMinor, compareMinor);
  const price = formatPrice(priceMinor, locale);
  const href = `/produkt/${product.slug}`;

  const stockLabel =
    product.stock_qty <= 0
      ? t("outOfStock")
      : product.stock_qty <= 5
        ? t("lowStock")
        : t("inStock");
  const stockClass =
    product.stock_qty <= 0
      ? "text-error"
      : product.stock_qty <= 5
        ? "text-amber"
        : "text-success";

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-cream-dark bg-white transition-shadow hover:shadow-lg">
      <Link
        href={href}
        className="relative flex aspect-square items-center justify-center overflow-hidden bg-paper"
      >
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt || name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Leaf className="size-12 text-forest-light/30" />
        )}
        {discount ? (
          <span className="absolute left-3 top-3 rounded-md bg-error px-2 py-1 text-xs font-semibold text-white">
            −{discount}%
          </span>
        ) : (
          product.is_featured && (
            <span className="absolute left-3 top-3 rounded-md bg-gold px-2 py-1 text-xs font-semibold text-white">
              {t("featured")}
            </span>
          )
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand && (
          <span className="text-xs font-medium uppercase tracking-wide text-gray-soft">
            {product.brand.name}
          </span>
        )}
        <Link href={href}>
          <h3 className="font-display text-base font-semibold leading-snug text-ink transition-colors group-hover:text-forest">
            {name}
          </h3>
        </Link>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono text-lg font-semibold ${discount ? "text-error" : "text-forest"}`}
            >
              {price}
            </span>
            {discount && compareMinor !== null && (
              <span className="font-mono text-sm text-gray-soft line-through">
                {formatPrice(compareMinor, locale)}
              </span>
            )}
          </div>
          <span className={`text-xs font-medium ${stockClass}`}>
            {stockLabel}
          </span>
        </div>

        <AddToCartButton
          productId={product.id}
          label={t("addToCart")}
          addedLabel={t("added")}
          disabled={product.stock_qty <= 0}
        />
      </div>
    </div>
  );
}
