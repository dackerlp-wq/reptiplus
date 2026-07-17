import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getAllCategories,
  getAttributeFacets,
  getBrands,
  getCategoryBySlug,
  getFilteredProducts,
  getPriceRange,
} from "@/lib/queries";
import { pickI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/reptiplus/product-card";
import { CatalogFilters } from "@/components/reptiplus/catalog-filters";
import { ActiveFilters } from "@/components/reptiplus/active-filters";

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;
const priceParam = (v: string | string[] | undefined): number | undefined => {
  const raw = first(v);
  if (!raw) return undefined;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return { title: pickI18n(category.name_i18n, locale, category.name) };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Catalog");
  const nav = await getTranslations("Nav");

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters = {
    category: slug,
    brand: first(sp.znacka),
    q: first(sp.q),
    sort: first(sp.sort),
    inStock: first(sp.sklad) === "1",
    onSale: first(sp.akce) === "1",
    priceMin: priceParam(sp.cena_od),
    priceMax: priceParam(sp.cena_do),
    attrs: attrsParam(sp.attr),
  };

  const [products, allCategories, brands, priceRange, facets] = await Promise.all(
    [
      getFilteredProducts(locale, filters),
      getAllCategories(),
      getBrands(),
      getPriceRange(locale, slug),
      getAttributeFacets(locale, slug),
    ],
  );

  const name = pickI18n(category.name_i18n, locale, category.name);
  const description = pickI18n(category.description_i18n, locale, "");
  const subcategories = allCategories.filter((c) => c.parent_id === category.id);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-soft">
        <Link href="/kategorie" className="hover:text-forest">
          {nav("categories")}
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-ink">{name}</span>
      </nav>

      <div className="mb-4 flex items-end justify-between">
        <h1 className="font-display text-4xl font-bold">{name}</h1>
        <span className="text-sm text-gray-soft">
          {t("count", { count: products.length })}
        </span>
      </div>

      {description && (
        <div
          className="rich-content mb-8 max-w-3xl text-charcoal/80"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      )}

      {/* Podkategorie */}
      {subcategories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/kategorie/${sub.slug}`}
              className="rounded-full border border-cream-dark bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:border-forest hover:text-forest"
            >
              {pickI18n(sub.name_i18n, locale, sub.name)}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <CatalogFilters
          categories={allCategories}
          brands={brands}
          priceRange={priceRange}
          facets={facets}
          hideCategory
        />

        <div>
          <ActiveFilters
            categories={allCategories}
            brands={brands}
            facets={facets}
            hideCategory
          />
          {products.length === 0 ? (
            <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
              {t("empty")}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
