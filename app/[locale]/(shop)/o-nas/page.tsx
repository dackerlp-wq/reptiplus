import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Leaf } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export const metadata: Metadata = { title: "O nás" };

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <span className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-3 py-1 text-sm font-semibold text-forest">
        <Leaf className="size-4" /> Reptiplus
      </span>
      <h1 className="mt-4 font-display text-4xl font-bold">O nás</h1>
      <p className="mt-3 text-lg text-charcoal/80">
        Jan Dohnal — terarista s dlouholetou praxí
      </p>

      <div className="rich-content mt-8 text-charcoal/90">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent
          euismod, nisl eget consectetur sagittis, nisl nunc consectetur nisi,
          euismod aliquam nisl nunc eget nisl. Sed euismod, nisl eget
          consectetur sagittis, nisl nunc consectetur nisi.
        </p>
        <p>
          Nulla facilisi. Curabitur et justo sit amet arcu tempor blandit. Jan
          Dohnal se teraristice věnuje řadu let a Reptiplus vznikl s jediným
          cílem: nabízet jen to, co sami s klidným svědomím používáme u vlastních
          zvířat.
        </p>
        <h2>Zkušenosti</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum
          ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia
          curae; Donec velit neque, auctor sit amet aliquam vel.
        </p>
        <h2>Náš přístup</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque
          in ipsum id orci porta dapibus. Vivamus suscipit tortor eget felis
          porttitor volutpat.
        </p>
      </div>
    </section>
  );
}
