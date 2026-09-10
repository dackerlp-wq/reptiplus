import { cache } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { getLedxLines } from "@/lib/ledx/queries";
import { LedxLineDetail } from "@/components/reptiplus/ledx/ledx-line-detail";
import { JsonLd } from "@/components/seo/json-ld";

type Params = Promise<{ locale: Locale; slug: string }>;

/** Řady načteme jednou na request (metadata + stránka). */
const loadLines = cache((locale: string) => getLedxLines(locale));

const clip = (s: string, n = 160) =>
  s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const lines = await loadLines(locale);
  const line = lines.find((l) => l.slug === slug);
  if (!line) return {};
  const title = `LEDX ${line.name}${line.subtitle ? ` — ${line.subtitle}` : ""}`;
  const description = clip(line.detailLead || line.landingDesc);
  const alternates = localizedAlternates(locale, `kategorie/profi-osvetleni/${slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      title,
      description,
      url: alternates.canonical,
      ...(line.images[0] ? { images: [{ url: line.images[0] }] } : {}),
    },
  };
}

export default async function LedxLinePage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const lines = await loadLines(locale);
  const index = lines.findIndex((l) => l.slug === slug);
  if (index === -1) notFound();
  const line = lines[index];
  const t = await getTranslations("Ledx");

  const base = absoluteUrl(`/${locale}/kategorie/profi-osvetleni`);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Reptiplus", item: absoluteUrl(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: t("navLabel"), item: base },
      { "@type": "ListItem", position: 3, name: `LEDX ${line.name}`, item: `${base}/${slug}` },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <LedxLineDetail line={line} index={index} others={lines.filter((l) => l.slug !== slug)} />
    </>
  );
}
