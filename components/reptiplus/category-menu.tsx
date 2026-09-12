"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Image from "next/image";
import {
  ChevronRight,
  ChevronDown,
  Leaf,
  Lightbulb,
  Box,
  Utensils,
  Pill,
  Info,
  Menu as MenuIcon,
  X,
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

export function CategoryMenu({
  categories,
  leading,
  trailing,
}: {
  categories: MenuCategory[];
  /** Zobrazí se jen v kompaktním (přilepeném) režimu vlevo — malé logo. */
  leading?: ReactNode;
  /** Zobrazí se jen v kompaktním režimu vpravo — hledání, účet, košík. */
  trailing?: ReactNode;
}) {
  const t = useTranslations("Nav");
  const [active, setActive] = useState<string | null>(null); // desktop hover
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null); // mobile accordion

  const activeCat = categories.find((c) => c.slug === active) ?? null;
  const hasPanel =
    !!activeCat && (activeCat.subcategories.length > 0 || !!activeCat.product);

  if (categories.length === 0) return null;

  const closeMobile = () => {
    setMobileOpen(false);
    setExpanded(null);
  };

  return (
    <nav
      className="relative border-b border-cream-dark bg-white shadow-sm transition-shadow duration-300 group-data-[compact]:shadow-md"
      onMouseLeave={() => setActive(null)}
    >
      {/* ── Desktop ── */}
      <div className="relative mx-auto hidden max-w-7xl items-center px-4 md:flex">
        <div className="hidden shrink-0 items-center group-data-[compact]:flex animate-reveal">{leading}</div>
        <div className="flex flex-1 items-center justify-center gap-1">
          {categories.map((cat) => {
            const Icon = iconFor(cat.slug);
            return (
              <div key={cat.slug} onMouseEnter={() => setActive(cat.slug)}>
                <Link
                  href={`/kategorie/${cat.slug}`}
                  onClick={() => setActive(null)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-3.5 text-base font-semibold transition-[padding,color,background-color] duration-300 group-data-[compact]:px-3 group-data-[compact]:py-2.5 group-data-[compact]:text-[15px]",
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
        </div>
        <Link
          href="/o-nas"
          onClick={() => setActive(null)}
          onMouseEnter={() => setActive(null)}
          className="ml-3 flex items-center gap-2 whitespace-nowrap border-l border-cream-dark py-3.5 pl-5 text-base font-semibold text-charcoal transition-[padding,color] duration-300 hover:text-forest group-data-[compact]:py-2.5 group-data-[compact]:text-[15px]"
        >
          <Info className="size-[18px]" /> {t("about")}
        </Link>
        <div className="hidden shrink-0 items-center group-data-[compact]:flex animate-reveal">{trailing}</div>
      </div>

      {/* ── Mobil: hamburger (+ v kompaktním režimu logo a ikony) ── */}
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          className="flex items-center gap-2 py-3 text-base font-semibold text-charcoal transition-[padding] duration-300 group-data-[compact]:py-2"
        >
          {mobileOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          <span className="group-data-[compact]:sr-only">{t("menu")}</span>
        </button>
        <div className="hidden flex-1 items-center justify-center group-data-[compact]:flex animate-reveal">{leading}</div>
        <div className="ml-auto hidden shrink-0 items-center group-data-[compact]:flex animate-reveal">{trailing}</div>
      </div>

      {/* ── Mobil: rozbalené menu (kategorie + podkategorie) ── */}
      {mobileOpen && (
        <div className="border-t border-cream-dark bg-white md:hidden">
          {categories.map((cat) => {
            const Icon = iconFor(cat.slug);
            const hasSubs = cat.subcategories.length > 0;
            const open = expanded === cat.slug;
            return (
              <div key={cat.slug} className="border-b border-cream">
                <div className="flex items-center">
                  <Link
                    href={`/kategorie/${cat.slug}`}
                    onClick={closeMobile}
                    className="flex flex-1 items-center gap-3 px-4 py-3.5 font-semibold text-charcoal"
                  >
                    <Icon className="size-5 shrink-0 text-forest" />
                    {cat.name}
                  </Link>
                  {hasSubs && (
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : cat.slug)}
                      aria-label="Podkategorie"
                      className="px-4 py-3.5 text-gray-soft"
                    >
                      <ChevronDown
                        className={cn(
                          "size-5 transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                </div>
                {hasSubs && open && (
                  <div className="bg-paper pb-1">
                    {cat.subcategories.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/kategorie/${s.slug}`}
                        onClick={closeMobile}
                        className="block py-2.5 pl-12 pr-4 text-sm text-charcoal"
                      >
                        {s.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Link
            href="/o-nas"
            onClick={closeMobile}
            className="flex items-center gap-3 px-4 py-3.5 font-semibold text-charcoal"
          >
            <Info className="size-5 shrink-0 text-forest" /> {t("about")}
          </Link>
        </div>
      )}

      {/* ── Desktop megamenu panel ── */}
      {hasPanel && activeCat && (
        <div className="absolute inset-x-0 top-full z-40 hidden border-b border-cream-dark bg-white shadow-lg md:block">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:grid-cols-[1fr_18rem]">
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
