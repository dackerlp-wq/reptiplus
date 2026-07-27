import { getTranslations } from "next-intl/server";
import { ShoppingCart, User, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCartCount } from "@/lib/cart/cart";
import { getMenuData } from "@/lib/queries";
import { getShopContact } from "@/lib/settings";
import { LanguageSwitcher } from "./language-switcher";
import { SearchBar } from "./search-bar";
import { CategoryMenu } from "./category-menu";

export async function Navbar({ locale }: { locale: Locale }) {
  const t = await getTranslations("Nav");
  const [cartCount, menu, contact] = await Promise.all([
    getCartCount(),
    getMenuData(locale),
    getShopContact(),
  ]);

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur">
      {/* Horní lišta — e-mail, slogan, jazyk */}
      <div className="bg-forest-deep text-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-1.5 text-cream/80 transition-colors hover:text-white"
          >
            <Mail className="size-3.5" /> {contact.email}
          </a>
          <span className="hidden flex-1 text-center font-medium italic text-cream/90 md:block">
            {t("slogan")}
          </span>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Hlavní lišta — logo, vyhledávání, účet/košík */}
      <div className="border-b border-cream-dark">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-5 md:py-6">
          <Link href="/" aria-label="Reptiplus" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Reptiplus" className="h-16 w-auto md:h-28" />
          </Link>

          <SearchBar
            placeholder={t("search")}
            locale={locale}
            className="mx-auto hidden w-full max-w-2xl sm:block"
          />

          <div className="ml-auto flex items-center gap-1 sm:ml-0 sm:gap-2">
            <Link
              href="/ucet"
              aria-label={t("account")}
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium text-charcoal transition-colors hover:bg-white hover:text-forest"
            >
              <User className="size-7" />
              <span className="hidden lg:block">{t("account")}</span>
            </Link>
            <Link
              href="/kosik"
              aria-label={t("cart")}
              className="flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium text-charcoal transition-colors hover:bg-white hover:text-forest"
            >
              <span className="relative">
                <ShoppingCart className="size-7" />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-xs font-semibold leading-5 text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="hidden lg:block">{t("cart")}</span>
            </Link>
          </div>
        </div>

        {/* Vyhledávání na mobilu */}
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:hidden">
          <SearchBar placeholder={t("search")} locale={locale} />
        </div>
      </div>

      {/* Menu kategorií — megamenu */}
      <CategoryMenu categories={menu} />
    </header>
  );
}
