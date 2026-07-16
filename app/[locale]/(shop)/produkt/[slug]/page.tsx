import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ProductGallery } from "@/components/reptiplus/product-gallery";
import { ProductBuyBox } from "@/components/reptiplus/product-buy-box";
import { ProductReviews } from "@/components/reptiplus/product-reviews";
import type { Locale } from "@/i18n/routing";
import { getProductBySlug } from "@/lib/queries";
import { getProductReviews } from "@/lib/reviews/queries";
import { createClient } from "@/lib/supabase/server";
import {
  compareForLocale,
  localeCurrency,
  pickI18n,
  priceForLocale,
} from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = pickI18n(product.name_i18n, locale, product.name);
  const description = pickI18n(
    product.short_description_i18n,
    locale,
    product.short_description,
  );
  return { title: name, description };
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
  const [reviewsData, { data: authData }] = await Promise.all([
    getProductReviews(product.id),
    supabase.auth.getUser(),
  ]);

  const name = pickI18n(product.name_i18n, locale, product.name);
  const shortDescription = pickI18n(
    product.short_description_i18n,
    locale,
    product.short_description,
  );
  const description = pickI18n(
    product.description_i18n,
    locale,
    product.description,
  );
  const priceMinor = priceForLocale(product, locale);
  const compareMinor = compareForLocale(product, locale);
  const attributes = [...(product.product_attribute ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  const isCzk = localeCurrency[locale] === "CZK";
  const buyVariants = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    price: (isCzk ? v.price_czk : v.price_eur) ?? priceMinor,
    stock: v.stock_qty,
  }));

  const brandName = product.brand?.name ?? "";
  const brandDesc = product.brand
    ? pickI18n(product.brand.description_i18n, locale, "")
    : "";
  const brandLogo = product.brand?.logo_url ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
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
              variants={buyVariants}
              labels={{
                variant: t("variant"),
                addToCart: t("addToCart"),
                added: t("added"),
                outOfStock: t("outOfStock"),
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
      {(description || attributes.length > 0) && (
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

          {attributes.length > 0 && (
            <aside>
              <h2 className="mb-4 font-display text-2xl font-bold">
                {t("parameters")}
              </h2>
              <dl className="divide-y divide-cream-dark rounded-xl border border-cream-dark bg-white">
                {attributes.map((attr) => (
                  <div
                    key={attr.key}
                    className="flex justify-between px-4 py-3 text-sm"
                  >
                    <dt className="text-gray-soft">
                      {pickI18n(attr.key_i18n, locale, attr.key)}
                    </dt>
                    <dd className="font-medium text-ink">
                      {pickI18n(attr.value_i18n, locale, attr.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </div>
      )}

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
