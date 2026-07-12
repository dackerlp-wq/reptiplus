import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getNewProducts,
  getProducts,
  getRootCategories,
  getSaleProducts,
} from "@/lib/queries";
import type { ProductListItem } from "@/lib/queries";
import { ProductCard } from "@/components/reptiplus/product-card";
import { CategoryCard } from "@/components/reptiplus/category-card";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const [featured, latest, sale, categories] = await Promise.all([
    getProducts({ featured: true }),
    getNewProducts(4),
    getSaleProducts(4),
    getRootCategories(),
  ]);

  const productGrid = (items: ProductListItem[]) => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} locale={locale} />
      ))}
    </div>
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-forest-deep text-cream">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-gold-light">
            {t("heroKicker")}
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight text-white md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/80">
            {t("heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/produkty"
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-light"
            >
              {t("heroCta")} <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-lg border border-cream/30 px-6 py-3 font-semibold text-cream transition-colors hover:bg-white/10"
            >
              {t("heroCtaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Kategorie */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="mb-8 font-display text-3xl font-bold">
            {t("categoriesTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      {/* Doporučujeme */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
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
