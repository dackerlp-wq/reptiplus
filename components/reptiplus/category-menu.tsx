"use client";

import { useState, type ComponentType } from "react";
import Image from "next/image";
import {
  ChevronRight,
  Leaf,
  Lightbulb,
  Box,
  Utensils,
  Pill,
  Info,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MenuCategory } from "@/lib/queries";
import { cn } from "@/lib/utils";

// Piktogramy podle slugu kategorie (fallback = lístek).
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  osvetleni: Lightbulb,
  teraria: Box,
  "kase-pro-plazy": Utensils,
  "vitaminy-a-mineraly": Pill,
};
const iconFor = (slug: string) => ICONS[slug] ?? Leaf;

export function CategoryMenu({ categories }: { categories: MenuCategory[] }) {
  const t = useTranslations("Nav");
  const [active, setActive] = useState<string | null>(null);
  const activeCat = categories.find((c) => c.slug === active) ?? null;
  const hasPanel =
    !!activeCat && (activeCat.subcategories.length > 0 || !!activeCat.product);

  if (categories.length === 0) return null;

  const aboutLink = (className: string) => (
    <Link
      href="/o-nas"
      onClick={() => setActive(null)}
      className={className}
      onMouseEnter={() => setActive(null)}
    >
      <Info className="size-[18px]" />
      {t("about")}
    </Link>
  );

  return (
    <nav
      className="relative border-b border-cream-dark bg-white shadow-sm"
      onMouseLeave={() => setActive(null)}
    >
      <div className="relative mx-auto flex max-w-7xl items-center px-4">
        <div className="flex flex-1 items-center justify-center gap-1 overflow-x-auto">
          {categories.map((cat) => {
            const Icon = iconFor(cat.slug);
            return (
              <div key={cat.slug} onMouseEnter={() => setActive(cat.slug)}>
                <Link
                  href={`/kategorie/${cat.slug}`}
                  onClick={() => setActive(null)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-3.5 text-base font-semibold transition-colors",
                    active === cat.slug
                      ? "bg-forest/10 text-forest"
                      : "text-charcoal hover:bg-forest/5 hover:text-forest",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {cat.name}
                </Link>
              </div>
            );
          })}
          {/* O nás — na mobilu součástí posuvného menu */}
          {aboutLink(
            "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-3.5 text-base font-semibold text-charcoal transition-colors hover:bg-forest/5 hover:text-forest md:hidden",
          )}
        </div>

        {/* O nás — na desktopu oddělené vpravo */}
        {aboutLink(
          "ml-3 hidden items-center gap-2 whitespace-nowrap border-l border-cream-dark py-3.5 pl-5 text-base font-semibold text-charcoal transition-colors hover:text-forest md:flex",
        )}
      </div>

      {/* Megamenu panel */}
      {hasPanel && activeCat && (
        <div className="absolute inset-x-0 top-full z-40 hidden border-b border-cream-dark bg-white shadow-lg md:block">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:grid-cols-[1fr_18rem]">
            {/* Podkategorie */}
            <div>
              {activeCat.subcategories.length > 0 ? (
                <ul className="grid grid-cols-2 gap-x-8 gap-y-1 lg:grid-cols-3">
                  {activeCat.subcategories.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/kategorie/${s.slug}`}
                        onClick={() => setActive(null)}
                        className="block rounded-md px-2 py-1.5 text-sm text-charcoal transition-colors hover:bg-cream hover:text-forest"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-soft">{activeCat.name}</p>
              )}
              <Link
                href={`/kategorie/${activeCat.slug}`}
                onClick={() => setActive(null)}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
              >
                {t("viewAll")} <ChevronRight className="size-4" />
              </Link>
            </div>

            {/* Náhodný produkt z kategorie */}
            {activeCat.product && (
              <Link
                href={`/produkt/${activeCat.product.slug}`}
                onClick={() => setActive(null)}
                className="group flex items-center gap-3 rounded-xl border border-cream-dark bg-paper p-3 transition-shadow hover:shadow-md"
              >
                <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  {activeCat.product.imageUrl ? (
                    <Image
                      src={activeCat.product.imageUrl}
                      alt={activeCat.product.name}
                      fill
                      sizes="64px"
                      className="object-contain p-1"
                    />
                  ) : (
                    <Leaf className="size-7 text-forest-light/30" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-medium text-ink transition-colors group-hover:text-forest">
                    {activeCat.product.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-semibold text-forest">
                    {activeCat.product.priceLabel}
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
