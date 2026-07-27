import { getTranslations } from "next-intl/server";
import { Mail, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getShopContact } from "@/lib/settings";

export async function Footer() {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const contact = await getShopContact();
  const year = 2026;

  return (
    <footer className="mt-20 border-t border-cream-dark bg-forest-deep text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-3">
        <div className="max-w-xs">
          <p className="font-display text-2xl font-bold text-white">Reptiplus</p>
          <span className="mt-3 block h-0.5 w-12 rounded-full bg-gold-light/80" />
          <p className="mt-3 font-display text-base font-semibold italic leading-relaxed text-cream">
            „{nav("slogan")}"
          </p>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
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
              <Link href="/objednavka" className="hover:text-white">
                {nav("trackOrder")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
            {t("contact")}
          </p>
          <ul className="space-y-2 text-sm text-cream/80">
            <li>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 hover:text-white"
              >
                <Mail className="size-4" /> {contact.email}
              </a>
            </li>
            {contact.phone && (
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 hover:text-white"
                >
                  <Phone className="size-4" /> {contact.phone}
                </a>
              </li>
            )}
          </ul>
        </div>

      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-cream/60 sm:flex-row">
          <p>© {year} Reptiplus. {t("rights")}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/obchodni-podminky" className="hover:text-white">
              {t("terms")}
            </Link>
            <Link href="/ochrana-osobnich-udaju" className="hover:text-white">
              {t("privacy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
