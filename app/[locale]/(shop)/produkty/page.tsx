import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import {
  getAllCategories,
  getBrands,
  getFilteredProducts,
} from "@/lib/queries";
import { ProductCard } from "@/components/reptiplus/product-card";
import { CatalogFilters } from "@/components/reptiplus/catalog-filters";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Catalog" });
  return { title: t("title") };
}

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Catalog");

  const filters = {
    category: first(sp.kategorie),
    brand: first(sp.znacka),
    q: first(sp.q),
    sort: first(sp.sort),
    inStock: first(sp.sklad) === "1",
  };

  const [products, categories, brands] = await Promise.all([
    getFilteredProducts(locale, filters),
    getAllCategories(),
    getBrands(),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
        <span className="text-sm text-gray-soft">
          {t("count", { count: products.length })}
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CatalogFilters categories={categories} brands={brands} />
        </div>

        <div>
          {products.length === 0 ? (
            <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
              {t("empty")}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
