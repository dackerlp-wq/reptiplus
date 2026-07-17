import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import {
  getNewProducts,
  getProducts,
  getSaleProducts,
} from "@/lib/queries";
import type { ProductListItem } from "@/lib/queries";
import { formatPrice, pickI18n, priceForLocale } from "@/lib/i18n";
import { ProductCard } from "@/components/reptiplus/product-card";
import {
  HeroCarousel,
  type HeroSlide,
} from "@/components/reptiplus/hero-carousel";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  // Neplatné locale (favicon.ico, boti, překlepy) → 404 ihned, bez DB dotazů.
  // Index se renderuje i pro tyto segmenty (RSC renderuje page dřív než layout guard).
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const [featured, latest, sale] = await Promise.all([
    getProducts({ featured: true }),
    getNewProducts(4),
    getSaleProducts(4),
  ]);

  const productGrid = (items: ProductListItem[]) => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );

  // Carousel — doporučené produkty (fallback na novinky), max 4
  const carouselSource = (featured.length ? featured : latest).slice(0, 4);
  const slides: HeroSlide[] = carouselSource.map((p) => ({
    slug: p.slug,
    name: pickI18n(p.name_i18n, locale, p.name),
    brand: p.brand?.name ?? null,
    description:
      pickI18n(p.short_description_i18n, locale, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim() || null,
    imageUrl: p.image?.url ?? null,
    priceLabel: formatPrice(priceForLocale(p, locale), locale),
  }));

  return (
    <>
      {/* Carousel */}
      <HeroCarousel slides={slides} ctaLabel={t("heroCta")} />

      {/* Doporučujeme */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold">
              {t("featuredTitle")}
            </h2>
            <p className="mt-2 text-gray-soft">{t("featuredSubtitle")}</p>
          </div>
          {productGrid(featured)}
        </section>
      )}

      {/* Novinky */}
      {latest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold">{t("newTitle")}</h2>
            <p className="mt-2 text-gray-soft">{t("newSubtitle")}</p>
          </div>
          {productGrid(latest)}
        </section>
      )}

      {/* Ve slevě */}
      {sale.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold">{t("saleTitle")}</h2>
            <p className="mt-2 text-gray-soft">{t("saleSubtitle")}</p>
          </div>
          {productGrid(sale)}
        </section>
      )}

      {/* Newsletter */}
      <section className="mx-auto mt-8 max-w-7xl px-4">
        <div className="rounded-2xl bg-paper px-6 py-14 text-center">
          <h2 className="font-display text-3xl font-bold">
            {t("newsletterTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-gray-soft">
            {t("newsletterSubtitle")}
          </p>
          <form className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder={t("newsletterPlaceholder")}
              className="flex-1 rounded-lg border border-cream-dark bg-white px-4 py-3 text-sm outline-none focus:border-forest"
            />
            <button
              type="submit"
              className="rounded-lg bg-forest px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
            >
              {t("newsletterCta")}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
