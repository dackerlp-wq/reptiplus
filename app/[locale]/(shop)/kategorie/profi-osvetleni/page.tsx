import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { absoluteUrl, localizedAlternates } from "@/lib/seo";
import { getLedxLines, getLedxPageContent } from "@/lib/ledx/queries";
import { LedxPage } from "@/components/reptiplus/ledx/ledx-page";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Ledx" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const alternates = localizedAlternates(locale, "kategorie/profi-osvetleni");
  const lines = await getLedxLines(locale);
  const image = lines.find((l) => l.images.length)?.images[0];
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      title,
      description,
      url: alternates.canonical,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ProfiOsvetleniPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Ledx");
  const [lines, content] = await Promise.all([
    getLedxLines(locale),
    getLedxPageContent(locale),
  ]);

  const url = absoluteUrl(`/${locale}/kategorie/profi-osvetleni`);
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Reptiplus", item: absoluteUrl(`/${locale}`) },
        { "@type": "ListItem", position: 2, name: t("navLabel"), item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t("metaTitle"),
      itemListElement: lines.map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `LEDX ${l.name}`,
        url: `${url}/${l.slug}`,
      })),
    },
  ];

  return (
    <>
      <JsonLd data={ld} />
      <LedxPage lines={lines} content={content} />
    </>
  );
}
