import { getTranslations } from "next-intl/server";
import { Leaf } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ProductListItem } from "@/lib/queries";
import { formatPrice, pickI18n, priceForLocale } from "@/lib/i18n";
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
  const price = formatPrice(priceForLocale(product, locale), locale);
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
        className="relative flex aspect-square items-center justify-center bg-paper"
      >
        <Leaf className="size-12 text-forest-light/30" />
        {product.is_featured && (
          <span className="absolute left-3 top-3 rounded-md bg-gold px-2 py-1 text-xs font-semibold text-white">
            {t("featured")}
          </span>
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
          <span className="font-mono text-lg font-semibold text-forest">
            {price}
          </span>
          <span className={`text-xs font-medium ${stockClass}`}>
            {stockLabel}
          </span>
        </div>

        <AddToCartButton
          label={t("addToCart")}
          addedLabel={t("added")}
          disabled={product.stock_qty <= 0}
        />
      </div>
    </div>
  );
}
