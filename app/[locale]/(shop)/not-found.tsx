import { getTranslations } from "next-intl/server";
import { Leaf, ArrowRight, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-paper">
        <Leaf className="size-9 text-forest-light/60" />
      </div>
      <p className="font-mono text-sm font-semibold uppercase tracking-widest text-gray-soft">404</p>
      <h1 className="mt-2 font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-gray-soft">{t("text")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/produkty"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
        >
          <Search className="size-4" /> {t("products")}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-5 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-cream"
        >
          {t("home")} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
