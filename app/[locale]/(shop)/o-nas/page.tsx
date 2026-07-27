import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Leaf } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pickI18n } from "@/lib/i18n";
import { getContentI18n } from "@/lib/settings";

export const metadata: Metadata = { title: "O nás" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const content = pickI18n(await getContentI18n("content.about"), locale, "");

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <span className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1 text-sm font-semibold text-forest">
        <Leaf className="size-4" /> Reptiplus
      </span>

      {content ? (
        <div
          className="rich-content mt-6 text-[15px] leading-relaxed text-charcoal/90"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <p className="mt-8 rounded-xl border border-cream-dark bg-paper p-6 text-charcoal/70">
          Text připravujeme.
        </p>
      )}
    </section>
  );
}
