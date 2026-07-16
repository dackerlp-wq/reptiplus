import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  getAllCategories,
  getCategoryBySlug,
  getFilteredProducts,
} from "@/lib/queries";
import { pickI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/reptiplus/product-card";

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
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Catalog");
  const nav = await getTranslations("Nav");

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [products, allCategories] = await Promise.all([
    getFilteredProducts(locale, { category: slug }),
    getAllCategories(),
  ]);

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

      {products.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          {t("empty")}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
