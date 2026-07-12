import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const year = 2026;

  return (
    <footer className="mt-20 border-t border-cream-dark bg-forest-deep text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold text-white">Reptiplus</p>
          <p className="mt-3 max-w-xs text-sm text-cream/70">{t("tagline")}</p>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold-light">
            {t("shop")}
          </p>
          <ul className="space-y-2 text-sm text-cream/80">
            <li>
              <Link href="/produkty" className="hover:text-white">
                {nav("products")}
              </Link>
            </li>
            <li>
              <Link href="/kategorie" className="hover:text-white">
                {nav("categories")}
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-white">
                {nav("blog")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold-light">
            {t("about")}
          </p>
          <p className="text-sm text-cream/80">{t("aboutText")}</p>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center text-xs text-cream/60">
        © {year} Reptiplus. {t("rights")}
      </div>
    </footer>
  );
}
