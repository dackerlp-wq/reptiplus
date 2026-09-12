import Image from "next/image";
import { Leaf } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ProductListItem } from "@/lib/queries";
import { formatPrice, localeCurrency, pickI18n, priceForLocale } from "@/lib/i18n";

/** Kompaktní seznam doporučených produktů (upsell) — jen jako doplněk. */
export function UpsellList({
  title,
  items,
  locale,
}: {
  title: string;
  items: ProductListItem[];
  locale: Locale;
}) {
  if (items.length === 0) return null;
  const isCzk = localeCurrency[locale] === "CZK";

  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => {
          const name = pickI18n(p.name_i18n, locale, p.name);
          const variants = p.variants ?? [];
          const base = priceForLocale(p, locale);
          const minPrice =
            variants.length > 0
              ? Math.min(
                  ...variants.map((v) => (isCzk ? v.price_czk : v.price_eur) ?? base),
                )
              : base;
          const isRange =
            variants.length > 0 &&
            Math.max(...variants.map((v) => (isCzk ? v.price_czk : v.price_eur) ?? base)) !==
              minPrice;
          return (
            <Link
              key={p.id}
              href={`/produkt/${p.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-cream-dark bg-white p-2.5 transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-md"
            >
              <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper">
                {p.image ? (
                  <Image
                    src={p.image.url}
                    alt={p.image.alt || name}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                ) : (
                  <Leaf className="size-6 text-forest-light/30" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium text-ink transition-colors group-hover:text-forest">
                  {name}
                </span>
                <span className="mt-0.5 block font-mono text-sm font-semibold text-forest">
                  {isRange ? "od " : ""}
                  {formatPrice(minPrice, locale)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
