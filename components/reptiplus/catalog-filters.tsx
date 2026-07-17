"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { AttrFacet, BrandItem, CategoryItem } from "@/lib/queries";
import { localeCurrency, pickI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const selectClass =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const sectionLabel =
  "text-xs font-semibold uppercase tracking-wide text-gray-soft";

export function CatalogFilters({
  categories,
  brands,
  priceRange,
  facets = [],
  hideCategory = false,
}: {
  categories: CategoryItem[];
  brands: BrandItem[];
  priceRange: { min: number; max: number };
  facets?: AttrFacet[];
  hideCategory?: boolean;
}) {
  const t = useTranslations("Catalog");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const currency = localeCurrency[locale];
  const priceMinUnit = Math.floor(priceRange.min / 100);
  const priceMaxUnit = Math.ceil(priceRange.max / 100);

  const [from, setFrom] = useState(params.get("cena_od") ?? "");
  const [to, setTo] = useState(params.get("cena_do") ?? "");

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };

  const commitPrice = () => {
    const next = new URLSearchParams(params.toString());
    const f = from.trim();
    const tv = to.trim();
    if (f) next.set("cena_od", f);
    else next.delete("cena_od");
    if (tv) next.set("cena_do", tv);
    else next.delete("cena_do");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };

  const toggleAttr = (key: string, value: string, checked: boolean) => {
    const token = `${key}|${value}`;
    const next = new URLSearchParams(params.toString());
    const existing = new Set(next.getAll("attr"));
    next.delete("attr");
    if (checked) existing.add(token);
    else existing.delete(token);
    existing.forEach((v) => next.append("attr", v));
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  };
  const activeAttrs = new Set(params.getAll("attr"));

  const parents = categories.filter((c) => !c.parent_id);
  const filterKeys = ["znacka", "sort", "sklad", "akce", "q", "cena_od", "cena_do"];
  if (!hideCategory) filterKeys.push("kategorie");
  const activeCount =
    filterKeys.filter((k) => params.get(k)).length + activeAttrs.size;

  const clearAll = () => {
    setFrom("");
    setTo("");
    startTransition(() => router.replace(pathname));
  };

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      {/* Mobilní přepínač */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-cream-dark bg-white px-4 py-2.5 text-sm font-semibold lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" /> {t("filters")}
          {activeCount > 0 && (
            <span className="rounded-full bg-forest px-2 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </span>
      </button>

      <div
        className={cn(
          "flex-col gap-5 rounded-xl border border-cream-dark bg-white p-5",
          open ? "flex" : "hidden",
          "lg:flex",
          isPending && "opacity-60",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-base font-semibold">
            <SlidersHorizontal className="size-4 text-forest" /> {t("filters")}
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-xs font-medium text-gray-soft hover:text-error"
            >
              <X className="size-3.5" /> {t("clear")}
            </button>
          )}
        </div>

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
        {!hideCategory && (
          <label className="flex flex-col gap-1.5">
            <span className={sectionLabel}>{t("category")}</span>
            <select
              className={selectClass}
              value={params.get("kategorie") ?? ""}
              onChange={(e) => set("kategorie", e.target.value || null)}
            >
              <option value="">{t("allCategories")}</option>
              {parents.map((parent) => (
                <optgroup
                  key={parent.id}
                  label={pickI18n(parent.name_i18n, locale, parent.name)}
                >
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
        )}

        {/* Řazení */}
        <label className="flex flex-col gap-1.5">
          <span className={sectionLabel}>{t("sort")}</span>
          <select
            className={selectClass}
            value={params.get("sort") ?? ""}
            onChange={(e) => set("sort", e.target.value || null)}
          >
            <option value="">{t("sortNewest")}</option>
            <option value="price-asc">{t("sortPriceAsc")}</option>
            <option value="price-desc">{t("sortPriceDesc")}</option>
            <option value="name">{t("sortName")}</option>
            <option value="discount">{t("sortDiscount")}</option>
          </select>
        </label>

        {/* Značka */}
        {brands.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className={sectionLabel}>{t("brand")}</span>
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
        )}

        {/* Cena */}
        {priceMaxUnit > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className={sectionLabel}>
              {t("price")} ({currency === "CZK" ? "Kč" : "€"})
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={priceMinUnit}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                onBlur={commitPrice}
                onKeyDown={(e) => e.key === "Enter" && commitPrice()}
                placeholder={String(priceMinUnit)}
                aria-label={t("priceFrom")}
                className="w-full rounded-lg border border-cream-dark bg-white px-2.5 py-2 text-sm outline-none focus:border-forest"
              />
              <span className="text-gray-soft">–</span>
              <input
                type="number"
                inputMode="numeric"
                max={priceMaxUnit}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onBlur={commitPrice}
                onKeyDown={(e) => e.key === "Enter" && commitPrice()}
                placeholder={String(priceMaxUnit)}
                aria-label={t("priceTo")}
                className="w-full rounded-lg border border-cream-dark bg-white px-2.5 py-2 text-sm outline-none focus:border-forest"
              />
            </div>
          </div>
        )}

        <div className="border-t border-cream pt-4">
          {/* Skladem */}
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={params.get("sklad") === "1"}
              onChange={(e) => set("sklad", e.target.checked ? "1" : null)}
              className="size-4 accent-forest"
            />
            {t("inStockOnly")}
          </label>
          {/* V akci */}
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={params.get("akce") === "1"}
              onChange={(e) => set("akce", e.target.checked ? "1" : null)}
              className="size-4 accent-forest"
            />
            {t("onSaleOnly")}
          </label>
        </div>

        {/* Parametry (product_attribute) */}
        {facets.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-cream pt-4">
            <span className={sectionLabel}>{t("parameters")}</span>
            {facets.map((facet) => {
              const activeInFacet = facet.values.some((v) =>
                activeAttrs.has(`${facet.key}|${v.value}`),
              );
              return (
                <details
                  key={facet.key}
                  open={activeInFacet || undefined}
                  className="group rounded-lg border border-cream-dark"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium">
                    {facet.label}
                    <span className="text-gray-soft transition-transform group-open:rotate-180">
                      ⌄
                    </span>
                  </summary>
                  <div className="flex max-h-52 flex-col gap-1 overflow-y-auto border-t border-cream px-3 py-2">
                    {facet.values.map((v) => {
                      const checked = activeAttrs.has(`${facet.key}|${v.value}`);
                      return (
                        <label
                          key={v.value}
                          className="flex cursor-pointer items-center gap-2 py-0.5 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              toggleAttr(facet.key, v.value, e.target.checked)
                            }
                            className="size-4 accent-forest"
                          />
                          <span className="flex-1">{v.label}</span>
                          <span className="text-xs text-gray-soft">{v.count}</span>
                        </label>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
