"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { BrandItem, CategoryItem } from "@/lib/queries";
import { pickI18n } from "@/lib/i18n";

const selectClass =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

export function CatalogFilters({
  categories,
  brands,
}: {
  categories: CategoryItem[];
  brands: BrandItem[];
}) {
  const t = useTranslations("Catalog");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };

  const parents = categories.filter((c) => !c.parent_id);
  const hasFilters = ["kategorie", "znacka", "sort", "sklad", "q"].some((k) =>
    params.get(k),
  );

  return (
    <aside
      className={`flex flex-col gap-5 rounded-xl border border-cream-dark bg-white p-5 ${isPending ? "opacity-60" : ""}`}
    >
      {/* Hledání */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          set("q", (value as string)?.trim() || null);
        }}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input
            name="q"
            defaultValue={params.get("q") ?? ""}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-cream-dark bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-forest"
          />
        </div>
      </form>

      {/* Kategorie */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
          {t("category")}
        </span>
        <select
          className={selectClass}
          value={params.get("kategorie") ?? ""}
          onChange={(e) => set("kategorie", e.target.value || null)}
        >
          <option value="">{t("allCategories")}</option>
          {parents.map((parent) => (
            <optgroup key={parent.id} label={pickI18n(parent.name_i18n, locale, parent.name)}>
              <option value={parent.slug}>
                {pickI18n(parent.name_i18n, locale, parent.name)}
              </option>
              {categories
                .filter((c) => c.parent_id === parent.id)
                .map((child) => (
                  <option key={child.id} value={child.slug}>
                    {"— "}
                    {pickI18n(child.name_i18n, locale, child.name)}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>

      {/* Značka */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
          {t("brand")}
        </span>
        <select
          className={selectClass}
          value={params.get("znacka") ?? ""}
          onChange={(e) => set("znacka", e.target.value || null)}
        >
          <option value="">{t("allBrands")}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      {/* Řazení */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
          {t("sort")}
        </span>
        <select
          className={selectClass}
          value={params.get("sort") ?? ""}
          onChange={(e) => set("sort", e.target.value || null)}
        >
          <option value="">{t("sortNewest")}</option>
          <option value="price-asc">{t("sortPriceAsc")}</option>
          <option value="price-desc">{t("sortPriceDesc")}</option>
        </select>
      </label>

      {/* Skladem */}
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={params.get("sklad") === "1"}
          onChange={(e) => set("sklad", e.target.checked ? "1" : null)}
          className="size-4 accent-forest"
        />
        {t("inStockOnly")}
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace(pathname))}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-cream-dark px-3 py-2 text-sm font-medium text-gray-soft transition-colors hover:bg-cream"
        >
          <X className="size-4" /> {t("clear")}
        </button>
      )}
    </aside>
  );
}
