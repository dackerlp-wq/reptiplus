import { getTranslations } from "next-intl/server";
import { ShoppingCart, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";

export async function Navbar() {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b border-cream-dark bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-4">
        <Link href="/" aria-label="Reptiplus" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Reptiplus" className="h-8 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/produkty"
            className="text-sm font-medium text-charcoal transition-colors hover:text-forest"
          >
            {t("products")}
          </Link>
          <Link
            href="/kategorie"
            className="text-sm font-medium text-charcoal transition-colors hover:text-forest"
          >
            {t("categories")}
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-charcoal transition-colors hover:text-forest"
          >
            {t("blog")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/ucet"
            aria-label={t("account")}
            className="rounded-md p-2 text-charcoal transition-colors hover:bg-white hover:text-forest"
          >
            <User className="size-5" />
          </Link>
          <Link
            href="/kosik"
            aria-label={t("cart")}
            className="rounded-md p-2 text-charcoal transition-colors hover:bg-white hover:text-forest"
          >
            <ShoppingCart className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
