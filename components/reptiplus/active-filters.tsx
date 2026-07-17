"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { AttrFacet, BrandItem, CategoryItem } from "@/lib/queries";
import { localeCurrency, pickI18n } from "@/lib/i18n";

type Chip = { id: string; label: string; remove: () => void };

export function ActiveFilters({
  categories,
  brands,
  facets,
  hideCategory = false,
}: {
  categories: CategoryItem[];
  brands: BrandItem[];
  facets: AttrFacet[];
  hideCategory?: boolean;
}) {
  const t = useTranslations("Catalog");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const currency = localeCurrency[locale] === "CZK" ? "Kč" : "€";

  const apply = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };

  const chips: Chip[] = [];

  const q = params.get("q");
  if (q)
    chips.push({ id: "q", label: `„${q}"`, remove: () => apply((p) => p.delete("q")) });

  if (!hideCategory) {
    const cat = params.get("kategorie");
    if (cat) {
      const c = categories.find((x) => x.slug === cat);
      chips.push({
        id: "kategorie",
        label: c ? pickI18n(c.name_i18n, locale, c.name) : cat,
        remove: () => apply((p) => p.delete("kategorie")),
      });
    }
  }

  const brand = params.get("znacka");
  if (brand) {
    const b = brands.find((x) => x.slug === brand);
    chips.push({
      id: "znacka",
      label: b ? b.name : brand,
      remove: () => apply((p) => p.delete("znacka")),
    });
  }

  const from = params.get("cena_od");
  const to = params.get("cena_do");
  if (from || to) {
    chips.push({
      id: "cena",
      label: `${t("price")}: ${from ?? "0"}–${to ?? "∞"} ${currency}`,
      remove: () =>
        apply((p) => {
          p.delete("cena_od");
          p.delete("cena_do");
        }),
    });
  }

  if (params.get("sklad") === "1")
    chips.push({
      id: "sklad",
      label: t("chipInStock"),
      remove: () => apply((p) => p.delete("sklad")),
    });

  if (params.get("akce") === "1")
    chips.push({
      id: "akce",
      label: t("chipOnSale"),
      remove: () => apply((p) => p.delete("akce")),
    });

  // Parametry (repeatable "attr" = "key|value")
  for (const token of params.getAll("attr")) {
    const [key, value] = token.split("|");
    if (!key || value === undefined) continue;
    const facet = facets.find((f) => f.key === key);
    const val = facet?.values.find((v) => v.value === value);
    const label = `${facet?.label ?? key}: ${val?.label ?? value}`;
    chips.push({
      id: `attr:${token}`,
      label,
      remove: () =>
        apply((p) => {
          const rest = p.getAll("attr").filter((x) => x !== token);
          p.delete("attr");
          rest.forEach((x) => p.append("attr", x));
        }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.remove}
          className="group inline-flex items-center gap-1.5 rounded-full border border-cream-dark bg-white py-1.5 pl-3 pr-2 text-sm text-charcoal transition-colors hover:border-forest hover:text-forest"
        >
          {chip.label}
          <X className="size-3.5 text-gray-soft group-hover:text-forest" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace(pathname))}
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-gray-soft hover:text-error"
        >
          <X className="size-3.5" /> {t("clear")}
        </button>
      )}
    </div>
  );
}
