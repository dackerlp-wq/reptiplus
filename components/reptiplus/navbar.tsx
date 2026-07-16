import { getTranslations } from "next-intl/server";
import { ShoppingCart, User, Mail, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCartCount } from "@/lib/cart/cart";
import { getRootCategories } from "@/lib/queries";
import { getShopContact } from "@/lib/settings";
import { pickI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { SearchBar } from "./search-bar";

export async function Navbar({ locale }: { locale: Locale }) {
  const t = await getTranslations("Nav");
  const [cartCount, categories, contact] = await Promise.all([
    getCartCount(),
    getRootCategories(),
    getShopContact(),
  ]);
  const telHref = `tel:${contact.phone.replace(/\s+/g, "")}`;

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur">
      {/* Kontaktní lišta */}
      <div className="bg-forest-deep text-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
          <div className="flex items-center gap-5">
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 text-cream/80 transition-colors hover:text-white"
            >
              <Mail className="size-3.5" /> {contact.email}
            </a>
            {contact.phone && (
              <a
                href={telHref}
                className="flex items-center gap-1.5 text-cream/80 transition-colors hover:text-white"
              >
                <Phone className="size-3.5" /> {contact.phone}
              </a>
            )}
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Hlavní lišta — logo, vyhledávání, účet/košík */}
      <div className="border-b border-cream-dark">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-4">
          <Link href="/" aria-label="Reptiplus" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Reptiplus" className="h-11 w-auto md:h-14" />
          </Link>

          <SearchBar
            placeholder={t("search")}
            locale={locale}
            className="hidden flex-1 sm:block"
          />

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <Link
              href="/ucet"
              aria-label={t("account")}
              className="rounded-md p-2 text-charcoal transition-colors hover:bg-white hover:text-forest"
            >
              <User className="size-6" />
            </Link>
            <Link
              href="/kosik"
              aria-label={t("cart")}
              className="relative rounded-md p-2 text-charcoal transition-colors hover:bg-white hover:text-forest"
            >
              <ShoppingCart className="size-6" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-xs font-semibold leading-5 text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Vyhledávání na mobilu */}
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:hidden">
          <SearchBar placeholder={t("search")} locale={locale} />
        </div>
      </div>

      {/* Menu kategorií */}
      {categories.length > 0 && (
        <nav className="border-b border-cream-dark bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/kategorie/${cat.slug}`}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-cream hover:text-forest"
              >
                {pickI18n(cat.name_i18n, locale, cat.name)}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
