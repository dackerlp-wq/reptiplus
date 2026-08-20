import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getAllCategories,
  getCatalog,
  getCategoryBySlug,
  getPriceRange,
} from "@/lib/queries";
import { pickI18n } from "@/lib/i18n";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard } from "@/components/reptiplus/product-card";
import { CatalogFilters } from "@/components/reptiplus/catalog-filters";
import { ActiveFilters } from "@/components/reptiplus/active-filters";

const plainText = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

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
  const title = pickI18n(category.name_i18n, locale, category.name);
  const description =
    plainText(pickI18n(category.description_i18n, locale, "")).slice(0, 300) ||
    undefined;
  const alternates = localizedAlternates(locale, `kategorie/${slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      title,
      description,
      url: alternates.canonical,
    },
  };
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

  const [{ products, facets, brands }, allCategories, priceRange] =
    await Promise.all([
      getCatalog(locale, filters),
      getAllCategories(),
      getPriceRange(locale, slug),
    ]);

  const name = pickI18n(category.name_i18n, locale, category.name);
  const description = pickI18n(category.description_i18n, locale, "");
  const subcategories = allCategories.filter((c) => c.parent_id === category.id);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Reptiplus", item: absoluteUrl(`/${locale}`) },
      { name: nav("categories"), item: absoluteUrl(`/${locale}/kategorie`) },
      { name, item: absoluteUrl(`/${locale}/kategorie/${slug}`) },
    ].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={breadcrumbLd} />
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-soft">
        <Link href="/kategorie" className="hover:text-forest">
          {nav("categories")}
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-ink">{name}</span>
      </nav>

      {/* Hlavička kategorie — název, charakteristika a podkategorie */}
      <div className="mb-8 rounded-2xl border border-cream-dark bg-paper p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{name}</h1>
          <span className="text-sm font-medium text-gray-soft">
            {t("count", { count: products.length })}
          </span>
        </div>

        {description && (
          <div
            className="rich-content mt-3 max-w-3xl text-[15px] leading-relaxed text-charcoal/80"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}

        {subcategories.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
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
      </div>

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
