"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  price_czk: string;
  price_eur: string;
  stock_qty: string;
};

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-[11px] font-semibold uppercase tracking-wide text-gray-soft";

/**
 * Editor variant produktu (název, SKU, cena Kč/€, sklad). Prázdná cena =
 * použije se cena produktu. Serializuje se do skrytého pole `variants` (JSON),
 * zpracuje saveProductAction (zachovává ID existujících variant).
 */
export function ProductVariants({ initial }: { initial: VariantRow[] }) {
  const [rows, setRows] = useState<VariantRow[]>(initial);

  const add = () =>
    setRows((r) => [
      ...r,
      { name: "", sku: "", price_czk: "", price_eur: "", stock_qty: "0" },
    ]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof VariantRow, val: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const serialized = JSON.stringify(rows.filter((r) => r.name.trim()));

  return (
    <div className="rounded-xl border border-cream-dark bg-paper p-4">
      <h2 className="font-display text-lg font-semibold">Varianty</h2>
      <p className="mb-3 text-xs text-gray-soft">
        Např. výkon (54 W / 24 W), velikost, %UVB. Prázdná cena = použije se cena
        produktu. Sklad se sleduje pro každou variantu zvlášť.
      </p>

      <input type="hidden" name="variants" value={serialized} />

      {rows.length === 0 && (
        <p className="mb-3 rounded-lg border border-dashed border-cream-dark px-3 py-4 text-center text-sm text-gray-soft">
          Produkt bez variant.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.id ?? `new-${i}`}
            className="grid grid-cols-2 gap-2 rounded-lg border border-cream-dark bg-white p-3 sm:grid-cols-[1.4fr_1fr_0.9fr_0.9fr_0.7fr_auto]"
          >
            <label className="flex flex-col gap-1">
              <span className={legend}>Název</span>
              <input
                value={row.name}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder="54 W"
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={legend}>SKU</span>
              <input
                value={row.sku}
                onChange={(e) => update(i, "sku", e.target.value)}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={legend}>Cena Kč</span>
              <input
                inputMode="decimal"
                value={row.price_czk}
                onChange={(e) => update(i, "price_czk", e.target.value)}
                placeholder="—"
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={legend}>Cena €</span>
              <input
                inputMode="decimal"
                value={row.price_eur}
                onChange={(e) => update(i, "price_eur", e.target.value)}
                placeholder="—"
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={legend}>Sklad</span>
              <input
                type="number"
                min={0}
                value={row.stock_qty}
                onChange={(e) => update(i, "stock_qty", e.target.value)}
                className={input}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => remove(i)}
                title="Odebrat variantu"
                className="rounded-md p-2 text-gray-soft transition-colors hover:bg-cream hover:text-error"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-sm font-semibold text-forest transition-colors hover:bg-forest/10"
      >
        <Plus className="size-4" /> Přidat variantu
      </button>
    </div>
  );
}
