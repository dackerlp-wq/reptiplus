import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { localizedAlternates } from "@/lib/seo";
import { getLedxLines } from "@/lib/ledx/queries";
import { LedxPage } from "@/components/reptiplus/ledx/ledx-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = "Profi osvětlení LEDX";
  const description =
    "Prémiová profesionální LED svítidla LEDX pro zoo, velkochovy, tropické pavilony, expozice a skleníky. Výhradní dodavatel pro ČR, na objednávku.";
  const alternates = localizedAlternates(locale, "kategorie/profi-osvetleni");
  return {
    title,
    description,
    alternates,
    openGraph: { type: "website", title, description, url: alternates.canonical },
  };
}

export default async function ProfiOsvetleniPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lines = await getLedxLines();
  return <LedxPage lines={lines} />;
}
