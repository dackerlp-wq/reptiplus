"use client";

import { useState } from "react";
import { Box, Layers } from "lucide-react";
import { saveProductAction } from "@/lib/admin/actions";
import { pickI18n } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { BrandItem, CategoryItem } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { LangFields } from "@/components/admin/lang-fields";
import { Hint } from "@/components/admin/hint";
import { EurFromCzk } from "@/components/admin/eur-from-czk";
import { ProductSpecs, type SpecRow } from "@/components/admin/product-specs";
import {
  ProductVariants,
  type VariantRow,
} from "@/components/admin/product-variants";
import { UpsellPicker } from "@/components/admin/upsell-picker";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const label = "flex flex-col gap-1.5 text-sm";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const card = "space-y-4 rounded-xl border border-cream-dark bg-white p-4";
const cardTitle = "font-display font-semibold text-ink";

type ProductRow = {
  id: string;
  slug: string;
  sku: string | null;
  name_i18n: Record<string, string> | null;
  short_description_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  price_czk: number;
  price_eur: number | null;
  compare_at_czk: number | null;
  compare_at_eur: number | null;
  stock_qty: number;
  category_id: string | null;
  brand_id: string | null;
  is_published: boolean;
  is_featured: boolean;
};

const minor = (v: number | null | undefined) =>
  v == null ? "" : String(v / 100);

export function ProductForm({
  product,
  categories,
  brands,
  locale,
  attributes = [],
  specKeys = [],
  keyValues = {},
  variants = [],
  imagesSlot,
  allProducts = [],
  upsellIds = [],
}: {
  product?: ProductRow;
  categories: CategoryItem[];
  brands: BrandItem[];
  locale: Locale;
  attributes?: SpecRow[];
  specKeys?: string[];
  keyValues?: Record<string, string[]>;
  variants?: VariantRow[];
  imagesSlot?: React.ReactNode;
  allProducts?: { id: string; name: string }[];
  upsellIds?: string[];
}) {
  const n = product?.name_i18n ?? {};
  const sd = product?.short_description_i18n ?? {};
  const d = product?.description_i18n ?? {};

  const [mode, setMode] = useState<"simple" | "variants">(
    variants.length > 0 ? "variants" : "simple",
  );
  const hasVariants = mode === "variants";

  const typeBtn = (active: boolean) =>
    cn(
      "flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors",
      active
        ? "border-forest bg-forest/5"
        : "border-cream-dark bg-white hover:border-forest/40",
    );

  return (
    <form action={saveProductAction} className="max-w-6xl">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="locale" value={locale} />

      {/* Typ produktu */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setMode("simple")}
          className={typeBtn(!hasVariants)}
        >
          <Box
            className={cn(
              "size-6 shrink-0",
              !hasVariants ? "text-forest" : "text-gray-soft",
            )}
          />
          <span>
            <span className="block font-semibold text-ink">Jednoduchý produkt</span>
            <span className="block text-xs text-gray-soft">
              Jedna cena a sklad.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode("variants")}
          className={typeBtn(hasVariants)}
        >
          <Layers
            className={cn(
              "size-6 shrink-0",
              hasVariants ? "text-forest" : "text-gray-soft",
            )}
          />
          <span>
            <span className="block font-semibold text-ink">
              Produkt s variantami
            </span>
            <span className="block text-xs text-gray-soft">
              Např. výkon, velikost — vlastní cena, sklad, obrázek i parametry.
            </span>
          </span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Levý sloupec — obsah */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-cream-dark bg-paper p-4">
            <Hint>
              Přepni jazyk a vyplň překlad. Čeština je základ, EN/DE se zobrazí
              zákazníkům podle jejich jazyka (chybějící překlad se doplní z
              češtiny).
            </Hint>
            <div className="mt-4">
              <LangFields
                fields={[
                  { name: "name", label: "Název", values: n },
                  {
                    name: "short_description",
                    label: "Krátký popis (perex)",
                    type: "textarea",
                    rows: 2,
                    values: sd,
                  },
                  {
                    name: "description",
                    label: "Popis",
                    type: "rich",
                    values: d,
                  },
                ]}
              />
            </div>
          </div>

          {imagesSlot}

          <ProductSpecs
            initial={attributes}
            keys={specKeys}
            keyValues={keyValues}
          />

          {/* Varianty — jen v režimu „s variantami"; jinak vyčistíme */}
          {hasVariants ? (
            <ProductVariants initial={variants} />
          ) : (
            <input type="hidden" name="variants" value="[]" />
          )}

          <UpsellPicker
            allProducts={allProducts}
            selected={upsellIds}
            currentId={product?.id}
          />
        </div>

        {/* Pravý sloupec — postranní panel */}
        <div className="space-y-6">
          {/* Ceny */}
          <div className={card}>
            <p className={cardTitle}>Ceny</p>
            {hasVariants ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-soft">
                  Ceny a sklad se zadávají u jednotlivých variant níže. Zde
                  můžeš nechat volitelně původní cenu (pro zobrazení slevy).
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={label}>
                    <span className={legend}>Původní Kč (sleva)</span>
                    <input name="compare_at_czk" inputMode="decimal" defaultValue={minor(product?.compare_at_czk)} className={input} />
                  </label>
                  <label className={label}>
                    <span className={legend}>Původní € (sleva)</span>
                    <input name="compare_at_eur" inputMode="decimal" defaultValue={minor(product?.compare_at_eur)} className={input} />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={label}>
                    <span className={legend}>Cena Kč</span>
                    <input name="price_czk" inputMode="decimal" defaultValue={minor(product?.price_czk)} className={input} />
                  </label>
                  <label className={label}>
                    <span className={legend}>Cena €</span>
                    <input name="price_eur" inputMode="decimal" defaultValue={minor(product?.price_eur)} className={input} />
                  </label>
                  <label className={label}>
                    <span className={legend}>Původní Kč (sleva)</span>
                    <input name="compare_at_czk" inputMode="decimal" defaultValue={minor(product?.compare_at_czk)} className={input} />
                  </label>
                  <label className={label}>
                    <span className={legend}>Původní € (sleva)</span>
                    <input name="compare_at_eur" inputMode="decimal" defaultValue={minor(product?.compare_at_eur)} className={input} />
                  </label>
                </div>
                <EurFromCzk
                  pairs={[
                    ["price_czk", "price_eur"],
                    ["compare_at_czk", "compare_at_eur"],
                  ]}
                />
              </>
            )}
          </div>

          {/* Zařazení */}
          <div className={card}>
            <p className={cardTitle}>Zařazení</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>
                <span className={legend}>Slug</span>
                <input name="slug" required defaultValue={product?.slug ?? ""} className={input} />
              </label>
              <label className={label}>
                <span className={legend}>SKU</span>
                <input name="sku" defaultValue={product?.sku ?? ""} className={input} />
              </label>
              <label className={label}>
                <span className={legend}>Kategorie</span>
                <select name="category_id" defaultValue={product?.category_id ?? ""} className={input}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? "— " : ""}
                      {pickI18n(c.name_i18n, locale, c.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                <span className={legend}>Značka</span>
                <select name="brand_id" defaultValue={product?.brand_id ?? ""} className={input}>
                  <option value="">—</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              {!hasVariants && (
                <label className={label}>
                  <span className={legend}>Skladem (ks)</span>
                  <input name="stock_qty" type="number" min={0} defaultValue={product?.stock_qty ?? 0} className={input} />
                </label>
              )}
            </div>
            {hasVariants && (
              <p className="text-xs text-gray-soft">
                Sklad se řídí variantami (součet jejich skladů).
              </p>
            )}
          </div>

          {/* Stav */}
          <div className={card}>
            <p className={cardTitle}>Stav</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_published" defaultChecked={product?.is_published ?? false} className="size-4 accent-forest" />
              Publikováno
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} className="size-4 accent-forest" />
              Doporučujeme
            </label>
          </div>

          <button type="submit" className="w-full rounded-lg bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
            Uložit produkt
          </button>
        </div>
      </div>
    </form>
  );
}
