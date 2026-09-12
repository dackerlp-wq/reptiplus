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
  localeCurrency,
  pickI18n,
  priceForLocale,
} from "@/lib/i18n";
import { AddToCartButton } from "./add-to-cart-button";
import { WishlistButton } from "./wishlist-button";

export async function ProductCard({
  product,
  locale,
}: {
  product: ProductListItem;
  locale: Locale;
}) {
  const t = await getTranslations("Product");
  const name = pickI18n(product.name_i18n, locale, product.name);
  const href = `/produkt/${product.slug}`;

  const priceMinor = priceForLocale(product, locale);
  const compareMinor = compareForLocale(product, locale);

  // Varianty — cenové rozpětí a společný sklad
  const isCzk = localeCurrency[locale] === "CZK";
  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const variantPrices = variants.map(
    (v) => (isCzk ? v.price_czk : v.price_eur) ?? priceMinor,
  );
  const minPrice = hasVariants ? Math.min(...variantPrices) : priceMinor;
  const maxPrice = hasVariants ? Math.max(...variantPrices) : priceMinor;
  const isRange = hasVariants && maxPrice !== minPrice;

  const stock = hasVariants
    ? variants.reduce((sum, v) => sum + Math.max(0, v.stock_qty), 0)
    : product.stock_qty;

  const discount = hasVariants ? null : discountPercent(priceMinor, compareMinor);

  const stockLabel =
    stock <= 0 ? t("outOfStock") : stock <= 5 ? t("lowStock") : t("inStock");
  const stockClass =
    stock <= 0 ? "text-error" : stock <= 5 ? "text-amber" : "text-success";

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
        <div className="absolute right-3 top-3 z-10">
          <WishlistButton productId={product.id} />
        </div>
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
              {isRange && (
                <span className="font-sans text-xs font-normal text-gray-soft">
                  {t("priceFrom")}{" "}
                </span>
              )}
              {formatPrice(minPrice, locale)}
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

        {hasVariants ? (
          stock > 0 ? (
            <Link
              href={href}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
            >
              {t("chooseVariant")}
            </Link>
          ) : (
            <span className="mt-2 flex cursor-not-allowed items-center justify-center rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white opacity-40">
              {t("outOfStock")}
            </span>
          )
        ) : (
          <AddToCartButton
            productId={product.id}
            label={t("addToCart")}
            addedLabel={t("added")}
            disabled={product.stock_qty <= 0}
          />
        )}
      </div>
    </div>
  );
}
