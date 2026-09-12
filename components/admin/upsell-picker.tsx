"use client";

import { useMemo, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string };

/**
 * Vyhledávací výběr doporučených produktů (upsell). Nahrazuje <select multiple>
 * — hledání + zaškrtávání + odznaky vybraných. Vybrané se posílají jako skrytá
 * pole `upsell` (zpracuje saveProductAction přes `upsell_present`).
 */
export function UpsellPicker({
  allProducts,
  selected: initialSelected = [],
  currentId,
}: {
  allProducts: Item[];
  selected?: string[];
  currentId?: string;
}) {
  const pool = useMemo(
    () => allProducts.filter((p) => p.id !== currentId),
    [allProducts, currentId],
  );
  const byId = useMemo(
    () => new Map(pool.map((p) => [p.id, p] as const)),
    [pool],
  );

  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected.filter((id) => id !== currentId)),
  );
  const [q, setQ] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? pool.filter((p) => p.name.toLowerCase().includes(needle))
      : pool;
    return list.slice(0, 50);
  }, [pool, q]);

  const selectedItems = [...selected]
    .map((id) => byId.get(id))
    .filter((p): p is Item => !!p);

  return (
    <div className="rounded-xl border border-cream-dark bg-paper p-4">
      <h2 className="font-display text-lg font-semibold">
        Doporučené produkty (upsell)
      </h2>
      <p className="mb-3 text-xs text-gray-soft">
        Zobrazí se na detailu v sekci „Doporučujeme k tomuto“. Vyhledej a
        zaškrtni produkty.
      </p>

      <input type="hidden" name="upsell_present" value="1" />
      {selectedItems.map((p) => (
        <input key={p.id} type="hidden" name="upsell" value={p.id} />
      ))}

      {/* Vybrané odznaky */}
      {selectedItems.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selectedItems.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/5 py-1 pl-3 pr-2 text-xs font-medium text-forest"
            >
              {p.name}
              <X className="size-3.5 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      {/* Hledání */}
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hledat produkt…"
          className="w-full rounded-lg border border-cream-dark bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-forest"
        />
      </div>

      {/* Seznam */}
      <div className="max-h-64 overflow-y-auto rounded-lg border border-cream-dark bg-white">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-soft">
            Nic nenalezeno.
          </p>
        ) : (
          filtered.map((p) => {
            const checked = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b border-cream px-3 py-2 text-left text-sm last:border-0 transition-colors hover:bg-cream",
                  checked && "bg-forest/5",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    checked
                      ? "border-forest bg-forest text-white"
                      : "border-cream-dark bg-white",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span className="flex-1 text-ink">{p.name}</span>
              </button>
            );
          })
        )}
      </div>
      <p className="mt-2 text-xs text-gray-soft">
        Vybráno {selectedItems.length}
        {q && filtered.length === 50 ? " · zpřesni hledání" : ""}
      </p>
    </div>
  );
}
