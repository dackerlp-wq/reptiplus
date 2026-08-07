import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductGallery } from "@/components/reptiplus/product-gallery";
import { ProductBuyBox } from "@/components/reptiplus/product-buy-box";
import { ProductReviews } from "@/components/reptiplus/product-reviews";
import { ProductCard } from "@/components/reptiplus/product-card";
import { UpsellList } from "@/components/reptiplus/upsell-list";
import type { Locale } from "@/i18n/routing";
import type { ProductListItem } from "@/lib/queries";
import {
  getProductBySlug,
  getRelatedProducts,
  getUpsellProducts,
  getLowestPrice30d,
} from "@/lib/queries";
import { getProductReviews } from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/server";
import {
  compareForLocale,
  localeCurrency,
  pickI18n,
  priceForLocale,
} from "@/lib/i18n";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

const plain = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = pickI18n(product.name_i18n, locale, product.name);
  const description = plain(
    pickI18n(product.short_description_i18n, locale, product.short_description) ||
      pickI18n(product.description_i18n, locale, product.description),
  ).slice(0, 300);
  const images = product.images.slice(0, 4).map((i) => i.url);
  const alternates = localizedAlternates(locale, `produkt/${slug}`);
  return {
    title: name,
    description,
    alternates,
    openGraph: {
      type: "website",
      title: name,
      description,
      url: alternates.canonical,
      ...(images.length ? { images } : {}),
    },
    ...(images.length
      ? { twitter: { card: "summary_large_image", images } }
      : {}),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Product");

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const supabase = await createClient();
  const [reviewsData, { data: authData }, related, upsell, lowest30] =
    await Promise.all([
      getProductReviews(product.id),
      supabase.auth.getUser(),
      getRelatedProducts(product.id, product.category_id, 4),
      getUpsellProducts(product.id, 4),
      getLowestPrice30d(product.id),
    ]);

  const productSection = (title: string, items: ProductListItem[]) =>
    items.length > 0 ? (
      <section className="mt-14">
        <h2 className="mb-6 font-display text-2xl font-bold">{title}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>
    ) : null;

  const name = pickI18n(product.name_i18n, locale, product.name);
  const shortDescription = pickI18n(
    product.short_description_i18n,
    locale,
    product.short_description,
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description = pickI18n(
    product.description_i18n,
    locale,
    product.description,
  );
  const priceMinor = priceForLocale(product, locale);
  const compareMinor = compareForLocale(product, locale);
  // Parametry seskupené podle názvu — víc hodnot pod jedním parametrem se
  // zobrazí jako jeden řádek (např. „Obsah vitamínů: hořčík, vápník").
  const attrGroups: { key: string; label: string; value: string }[] = [];
  const attrIndex = new Map<string, number>();
  for (const a of [...(product.product_attribute ?? [])].sort(
    (x, y) => x.sort_order - y.sort_order,
  )) {
    const label = pickI18n(a.key_i18n, locale, a.key);
    const val = pickI18n(a.value_i18n, locale, a.value);
    const idx = attrIndex.get(a.key);
    if (idx === undefined) {
      attrIndex.set(a.key, attrGroups.length);
      attrGroups.push({ key: a.key, label, value: val });
    } else {
      const g = attrGroups[idx];
      if (!g.value.split(/\s*,\s*/).includes(val)) g.value = `${g.value}, ${val}`;
    }
  }

  const isCzk = localeCurrency[locale] === "CZK";
  const buyVariants = product.variants.map((v) => ({
    id: v.id,
    name: pickI18n(v.name_i18n, locale, v.name),
    price: (isCzk ? v.price_czk : v.price_eur) ?? priceMinor,
    stock: v.stock_qty,
    imageUrl: v.image_url,
    attributes: (v.attributes ?? []).map((a) => ({
      key: pickI18n(a.key_i18n, locale, a.key),
      value: pickI18n(a.value_i18n, locale, a.value),
    })),
  }));

  const brandName = product.brand?.name ?? "";
  const brandDesc = product.brand
    ? pickI18n(product.brand.description_i18n, locale, "")
    : "";
  const brandLogo = product.brand?.logo_url ?? null;

  // ── Structured data (schema.org) ───────────────────────────────────
  const currency = localeCurrency[locale];
  const canonical = absoluteUrl(`/${locale}/produkt/${slug}`);
  const inStock =
    product.stock_qty > 0 || product.variants.some((v) => v.stock_qty > 0);
  const availability = inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
  const ldImages = product.images.map((i) => i.url);
  const offer =
    buyVariants.length > 0
      ? {
          "@type": "AggregateOffer",
          priceCurrency: currency,
          lowPrice: (
            Math.min(...buyVariants.map((v) => v.price)) / 100
          ).toFixed(2),
          highPrice: (
            Math.max(...buyVariants.map((v) => v.price)) / 100
          ).toFixed(2),
          offerCount: buyVariants.length,
          availability,
          url: canonical,
        }
      : {
          "@type": "Offer",
          priceCurrency: currency,
          price: (priceMinor / 100).toFixed(2),
          availability,
          itemCondition: "https://schema.org/NewCondition",
          url: canonical,
        };
  const ldDesc = plain(description).slice(0, 500);
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(ldDesc ? { description: ldDesc } : {}),
    ...(ldImages.length ? { image: ldImages } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    offers: offer,
    ...(reviewsData.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewsData.average.toFixed(1),
            reviewCount: reviewsData.count,
          },
        }
      : {}),
  };
  const catalogName =
    { cs: "Produkty", en: "Products", de: "Produkte" }[locale] ?? "Produkty";
  const crumbs = [
    { name: "Reptiplus", item: absoluteUrl(`/${locale}`) },
    { name: catalogName, item: absoluteUrl(`/${locale}/produkty`) },
    ...(product.category
      ? [
          {
            name: pickI18n(product.category.name_i18n, locale),
            item: absoluteUrl(`/${locale}/kategorie/${product.category.slug}`),
          },
        ]
      : []),
    { name, item: canonical },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <JsonLd data={[productLd, breadcrumbLd]} />
      <Link
        href="/produkty"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-soft transition-colors hover:text-forest"
      >
        <ArrowLeft className="size-4" /> {t("backToCatalog")}
      </Link>

      {/* Horní část — galerie + nákup */}
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={name} />

        <div>
          {product.brand && (
            <span className="text-sm font-medium uppercase tracking-wide text-gray-soft">
              {product.brand.name}
            </span>
          )}
          <h1 className="mt-2 font-display text-4xl font-bold">{name}</h1>

          {shortDescription && (
            <p className="mt-3 text-lg leading-relaxed text-charcoal/80">
              {shortDescription}
            </p>
          )}

          <div className="mt-5">
            <ProductBuyBox
              productId={product.id}
              locale={locale}
              basePrice={priceMinor}
              baseCompare={compareMinor}
              baseStock={product.stock_qty}
              lowest30={isCzk ? lowest30.czk : lowest30.eur}
              variants={buyVariants}
              labels={{
                variant: t("variant"),
                addToCart: t("addToCart"),
                added: t("added"),
                outOfStock: t("outOfStock"),
                lowest30: t("lowest30d"),
              }}
            />
          </div>

          {product.sku && (
            <p className="mt-4 text-xs text-gray-soft">
              {t("sku")}: <span className="font-mono">{product.sku}</span>
            </p>
          )}

          {/* Služby */}
          <div className="mt-6 divide-y divide-cream-dark overflow-hidden rounded-xl border border-cream-dark bg-white">
            <ServiceRow icon={Truck} title={t("delivery")} text={t("deliveryText")} />
            <ServiceRow
              icon={ShieldCheck}
              title={t("securePayment")}
              text={t("securePaymentText")}
            />
          </div>
        </div>
      </div>

      {/* Popis + parametry */}
      {(description || attrGroups.length > 0) && (
        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div>
            {description && (
              <section>
                <h2 className="mb-4 font-display text-2xl font-bold">
                  {t("description")}
                </h2>
                <div
                  className="rich-content text-charcoal/90"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </section>
            )}
          </div>

          {attrGroups.length > 0 && (
            <aside>
              <h2 className="mb-4 font-display text-2xl font-bold">
                {t("parameters")}
              </h2>
              <dl className="divide-y divide-cream-dark rounded-xl border border-cream-dark bg-white">
                {attrGroups.map((attr) => (
                  <div
                    key={attr.key}
                    className="flex justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <dt className="shrink-0 text-gray-soft">{attr.label}</dt>
                    <dd className="text-right font-medium text-ink">
                      {attr.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </div>
      )}

      {/* Doporučujeme k tomuto (upsell) — kompaktně, jen jako doplněk */}
      <UpsellList title={t("upsell")} items={upsell} locale={locale} />

      {/* Výrobce */}
      {product.brand && (
        <section className="mt-14 rounded-2xl border border-cream-dark bg-paper p-6 md:p-8">
          <h2 className="mb-5 font-display text-2xl font-bold">
            {t("manufacturer")}
          </h2>
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {brandLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brandLogo}
                alt={brandName}
                className="h-16 w-auto shrink-0 object-contain"
              />
            )}
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                {brandName}
              </p>
              {brandDesc && (
                <div
                  className="rich-content mt-2 text-charcoal/80"
                  dangerouslySetInnerHTML={{ __html: brandDesc }}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Hodnocení a recenze */}
      <ProductReviews
        productId={product.id}
        reviews={reviewsData.reviews}
        average={reviewsData.average}
        count={reviewsData.count}
        isLoggedIn={!!authData.user}
      />

      {/* Podobné produkty */}
      {productSection(t("related"), related)}
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-forest" />
      <div className="text-sm">
        <p className="font-medium text-ink">{title}</p>
        <p className="text-gray-soft">{text}</p>
      </div>
    </div>
  );
}
