import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { PackageSearch } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { OrderLookup } from "@/components/reptiplus/order-lookup";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OrderLookup" });
  return { title: t("title"), robots: { index: false } };
}

export default async function OrderLookupPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("OrderLookup");

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-paper">
          <PackageSearch className="size-7 text-forest" />
        </div>
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-soft">{t("subtitle")}</p>
      </div>
      <OrderLookup locale={locale} />
    </section>
  );
}
