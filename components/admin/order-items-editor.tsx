"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, Loader2, Save, X } from "lucide-react";
import { toast } from "./toast";
import {
  editOrderItemsAction,
  searchProductsForOrderAction,
  type OrderProductOption,
} from "@/lib/admin/actions";

export type EditableItem = {
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string | null;
  unit_price: number; // minor units
  qty: number;
};

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "CZK" ? "cs-CZ" : "de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CZK" ? 0 : 2,
  }).format(minor / 100);

const sameLine = (a: EditableItem, o: OrderProductOption) =>
  a.product_id === o.productId && (a.variant_id ?? "") === (o.variantId ?? "");

export function OrderItemsEditor({
  orderId,
  currency,
  initialItems,
}: {
  orderId: string;
  currency: string;
  initialItems: EditableItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<EditableItem[]>(initialItems);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  // Vyhledávání produktů
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrderProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // krátký dotaz: výsledky maže onChange
    const t = setTimeout(async () => {
      setSearching(true); // až při skutečném požadavku (po debounce)
      try {
        const r = await searchProductsForOrderAction(q, currency);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, currency]);

  const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0);

  const setQty = (i: number, qty: number) =>
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, qty: Math.max(1, qty) } : it)),
    );
  const setPrice = (i: number, minor: number) =>
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? { ...it, unit_price: Math.max(0, minor) } : it,
      ),
    );
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const addProduct = (o: OrderProductOption) => {
    setItems((prev) => {
      const found = prev.findIndex((it) => sameLine(it, o));
      if (found >= 0)
        return prev.map((it, idx) =>
          idx === found ? { ...it, qty: it.qty + 1 } : it,
        );
      return [
        ...prev,
        {
          product_id: o.productId,
          variant_id: o.variantId,
          name: o.name,
          sku: o.sku,
          unit_price: o.unitPrice,
          qty: 1,
        },
      ];
    });
    setQuery("");
    setResults([]);
  };

  const cancel = () => {
    setItems(initialItems);
    setEditing(false);
    setQuery("");
    setResults([]);
  };

  const save = () => {
    if (items.length === 0) {
      toast.error("Objednávka musí mít alespoň jednu položku.");
      return;
    }
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", orderId);
        fd.set("items", JSON.stringify(items));
        await editOrderItemsAction(fd);
        toast.success("Položky uloženy");
        setEditing(false);
        router.refresh();
      } catch {
        toast.error("Uložení se nepodařilo (zkontrolujte sklad).");
      }
    });
  };

  if (!editing) {
    return (
      <div className="overflow-hidden rounded-xl border border-cream-dark bg-white">
        <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
            Položky
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-semibold text-forest hover:underline"
          >
            Upravit položky
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-cream last:border-0">
                <td className="px-4 py-3">
                  {it.name}
                  {it.sku && (
                    <span className="ml-2 font-mono text-xs text-gray-soft">
                      {it.sku}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono">{it.qty}×</td>
                <td className="px-4 py-3 text-right font-mono">
                  {money(it.unit_price * it.qty, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-forest/40 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-forest">
          Úprava položek
        </span>
        <button
          type="button"
          onClick={cancel}
          className="inline-flex items-center gap-1 text-sm text-gray-soft hover:text-charcoal"
        >
          <X className="size-4" /> Zrušit
        </button>
      </div>

      {/* Položky */}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-cream-dark px-3 py-2"
          >
            <div className="min-w-[10rem] flex-1">
              <p className="text-sm font-medium text-ink">{it.name}</p>
              {it.sku && (
                <p className="font-mono text-xs text-gray-soft">{it.sku}</p>
              )}
            </div>
            {/* Cena za kus */}
            <label className="flex items-center gap-1 text-xs text-gray-soft">
              á
              <input
                type="number"
                step="0.01"
                min="0"
                value={(it.unit_price / 100).toFixed(2)}
                onChange={(e) =>
                  setPrice(i, Math.round(parseFloat(e.target.value || "0") * 100))
                }
                className="w-20 rounded-md border border-cream-dark px-2 py-1 text-right font-mono text-sm text-ink outline-none focus:border-forest"
              />
            </label>
            {/* Množství */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQty(i, it.qty - 1)}
                className="rounded-md border border-cream-dark p-1 text-gray-soft hover:border-forest hover:text-forest"
              >
                <Minus className="size-3.5" />
              </button>
              <input
                type="number"
                min="1"
                value={it.qty}
                onChange={(e) => setQty(i, parseInt(e.target.value || "1", 10))}
                className="w-12 rounded-md border border-cream-dark px-1 py-1 text-center font-mono text-sm text-ink outline-none focus:border-forest"
              />
              <button
                type="button"
                onClick={() => setQty(i, it.qty + 1)}
                className="rounded-md border border-cream-dark p-1 text-gray-soft hover:border-forest hover:text-forest"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <span className="w-24 text-right font-mono text-sm font-medium text-ink">
              {money(it.unit_price * it.qty, currency)}
            </span>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="rounded-md p-1 text-gray-soft hover:bg-error/10 hover:text-error"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-error/40 px-3 py-4 text-center text-sm text-error">
            Přidejte alespoň jednu položku.
          </p>
        )}
      </div>

      {/* Přidat produkt */}
      <div ref={boxRef} className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input
            value={query}
            onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value.trim().length < 2) setResults([]);
                }}
            placeholder="Přidat produkt — hledat název nebo SKU…"
            className="w-full rounded-lg border border-cream-dark bg-white py-2 pl-9 pr-9 text-sm text-ink outline-none focus:border-forest"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-soft" />
          )}
        </div>
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-cream-dark bg-white shadow-lg">
            {results.map((o) => (
              <button
                key={`${o.productId}:${o.variantId ?? ""}`}
                type="button"
                onClick={() => addProduct(o)}
                className="flex w-full items-center gap-2 border-b border-cream px-3 py-2 text-left last:border-0 hover:bg-forest/5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{o.name}</span>
                  <span className="block text-xs text-gray-soft">
                    {o.sku ? `${o.sku} · ` : ""}skladem {o.stock}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm text-forest">
                  {money(o.unitPrice, currency)}
                </span>
                <Plus className="size-4 shrink-0 text-forest" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mezisoučet + uložit */}
      <div className="flex items-center justify-between border-t border-cream-dark pt-3">
        <span className="text-sm text-gray-soft">
          Mezisoučet:{" "}
          <span className="font-mono font-semibold text-ink">
            {money(subtotal, currency)}
          </span>
        </span>
        <button
          type="button"
          onClick={save}
          disabled={pending || items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Uložit položky
        </button>
      </div>
      <p className="text-xs text-gray-soft">
        Doprava, poplatek za platbu a sleva zůstávají beze změny; celková částka
        se přepočítá. Sklad se automaticky upraví.
      </p>
    </div>
  );
}
