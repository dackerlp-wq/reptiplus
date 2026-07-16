import { saveProductAction } from "@/lib/admin/actions";
import { pickI18n } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { BrandItem, CategoryItem } from "@/lib/queries";
import { LangFields } from "@/components/admin/lang-fields";
import { Hint } from "@/components/admin/hint";
import { EurFromCzk } from "@/components/admin/eur-from-czk";
import { ProductSpecs } from "@/components/admin/product-specs";
import {
  ProductVariants,
  type VariantRow,
} from "@/components/admin/product-variants";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const label = "flex flex-col gap-1.5 text-sm";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

type ProductRow = {
  id: string;
  slug: string;
  sku: string | null;
  name_i18n: Record<string, string> | null;
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
  variants = [],
}: {
  product?: ProductRow;
  categories: CategoryItem[];
  brands: BrandItem[];
  locale: Locale;
  attributes?: { key: string; value: string }[];
  specKeys?: string[];
  variants?: VariantRow[];
}) {
  const n = product?.name_i18n ?? {};
  const d = product?.description_i18n ?? {};

  return (
    <form action={saveProductAction} className="max-w-3xl space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="locale" value={locale} />

      {/* Název + popis s přepínačem jazyků */}
      <div className="rounded-xl border border-cream-dark bg-paper p-4">
        <Hint>
          Přepni jazyk a vyplň překlad. Čeština je základ, EN/DE se zobrazí
          zákazníkům podle jejich jazyka (chybějící překlad se doplní z češtiny).
        </Hint>
        <div className="mt-4">
          <LangFields
            fields={[
              { name: "name", label: "Název", values: n },
              { name: "description", label: "Popis", type: "textarea", values: d },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          <span className={legend}>Slug</span>
          <input name="slug" required defaultValue={product?.slug ?? ""} className={input} />
        </label>
        <label className={label}>
          <span className={legend}>SKU</span>
          <input name="sku" defaultValue={product?.sku ?? ""} className={input} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          <span className={legend}>Cena Kč</span>
          <input name="price_czk" required inputMode="decimal" defaultValue={minor(product?.price_czk)} className={input} />
        </label>
        <label className={label}>
          <span className={legend}>Cena €</span>
          <input name="price_eur" inputMode="decimal" defaultValue={minor(product?.price_eur)} className={input} />
        </label>
        <label className={label}>
          <span className={legend}>Původní cena Kč (sleva)</span>
          <input name="compare_at_czk" inputMode="decimal" defaultValue={minor(product?.compare_at_czk)} className={input} />
        </label>
        <label className={label}>
          <span className={legend}>Původní cena € (sleva)</span>
          <input name="compare_at_eur" inputMode="decimal" defaultValue={minor(product?.compare_at_eur)} className={input} />
        </label>
      </div>

      <EurFromCzk
        pairs={[
          ["price_czk", "price_eur"],
          ["compare_at_czk", "compare_at_eur"],
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
        <label className={label}>
          <span className={legend}>Skladem (ks)</span>
          <input name="stock_qty" type="number" min={0} defaultValue={product?.stock_qty ?? 0} className={input} />
        </label>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={product?.is_published ?? false} className="size-4 accent-forest" />
          Publikováno
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} className="size-4 accent-forest" />
          Doporučujeme
        </label>
      </div>

      <ProductSpecs initial={attributes} keys={specKeys} />

      <ProductVariants initial={variants} />

      <button type="submit" className="rounded-lg bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
        Uložit
      </button>
    </form>
  );
}
