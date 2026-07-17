import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import {
  getAllCategories,
  getAttributeFacets,
  getBrands,
  getFilteredProducts,
  getPriceRange,
} from "@/lib/queries";
import { ProductCard } from "@/components/reptiplus/product-card";
import { CatalogFilters } from "@/components/reptiplus/catalog-filters";
import { ActiveFilters } from "@/components/reptiplus/active-filters";

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

/** Cena z URL (v jednotkách měny) → minor units (haléře/eurocenty). */
const priceParam = (v: string | string[] | undefined): number | undefined => {
  const raw = first(v);
  if (!raw) return undefined;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

/** Parametry z URL ("key|value") → [{ key, value }]. */
const attrsParam = (
  v: string | string[] | undefined,
): { key: string; value: string }[] => {
  const raw = v === undefined ? [] : Array.isArray(v) ? v : [v];
  return raw
    .map((s) => {
      const i = s.indexOf("|");
      return i > 0 ? { key: s.slice(0, i), value: s.slice(i + 1) } : null;
    })
    .filter((x): x is { key: string; value: string } => x !== null);
};

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
    onSale: first(sp.akce) === "1",
    priceMin: priceParam(sp.cena_od),
    priceMax: priceParam(sp.cena_do),
    attrs: attrsParam(sp.attr),
  };

  const [products, categories, brands, priceRange, facets] = await Promise.all([
    getFilteredProducts(locale, filters),
    getAllCategories(),
    getBrands(),
    getPriceRange(locale, filters.category),
    getAttributeFacets(locale, filters.category),
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
        <CatalogFilters
          categories={categories}
          brands={brands}
          priceRange={priceRange}
          facets={facets}
        />

        <div>
          <ActiveFilters
            categories={categories}
            brands={brands}
            facets={facets}
          />
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
