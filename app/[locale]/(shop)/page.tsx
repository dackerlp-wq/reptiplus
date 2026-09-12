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
import { getHeroStyle, getShopContact } from "@/lib/settings";
import { formatPrice, pickI18n, priceForLocale } from "@/lib/i18n";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductCard } from "@/components/reptiplus/product-card";
import {
  HeroCarousel,
  type HeroSlide,
} from "@/components/reptiplus/hero-carousel";
import { NewsletterForm } from "@/components/reptiplus/newsletter-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return { alternates: localizedAlternates(locale, "") };
}

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

  const [featured, latest, sale, heroStyle, contact] = await Promise.all([
    getProducts({ featured: true }),
    getNewProducts(4),
    getSaleProducts(4),
    getHeroStyle(),
    getShopContact(),
  ]);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Reptiplus",
    url: absoluteUrl(`/${locale}`),
    logo: absoluteUrl("/logo-mark.png"),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
  };
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Reptiplus",
    url: absoluteUrl(`/${locale}`),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl(`/${locale}/produkty?q={search_term_string}`),
      },
      "query-input": "required name=search_term_string",
    },
  };

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
      <JsonLd data={[orgLd, websiteLd]} />
      {/* Carousel */}
      <HeroCarousel slides={slides} ctaLabel={t("heroCta")} variant={heroStyle} />

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
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
