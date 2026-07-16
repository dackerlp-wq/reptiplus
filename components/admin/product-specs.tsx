"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Spec = { key: string; value: string };

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

/**
 * Editor specifikací produktu (název / hodnota). Název lze vybrat z již
 * použitých (datalist) nebo napsat nový. Serializuje se do skrytého pole
 * `attributes` (JSON), které zpracuje saveProductAction.
 */
export function ProductSpecs({
  initial,
  keys,
}: {
  initial: Spec[];
  keys: string[];
}) {
  const [rows, setRows] = useState<Spec[]>(initial);

  const add = () => setRows((r) => [...r, { key: "", value: "" }]);
  const remove = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Spec, val: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));

  const serialized = JSON.stringify(
    rows.filter((r) => r.key.trim() && r.value.trim()),
  );

  return (
    <div className="rounded-xl border border-cream-dark bg-paper p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Specifikace</h2>
      </div>
      <p className="mb-3 text-xs text-gray-soft">
        Parametry produktu (např. Příkon → 35 W). Název můžeš vybrat z již
        použitých, nebo zadat nový.
      </p>

      <input type="hidden" name="attributes" value={serialized} />
      <datalist id="spec-key-list">
        {keys.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      {rows.length === 0 && (
        <p className="mb-3 rounded-lg border border-dashed border-cream-dark px-3 py-4 text-center text-sm text-gray-soft">
          Zatím žádné specifikace.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              list="spec-key-list"
              placeholder="Název (např. Příkon)"
              value={row.key}
              onChange={(e) => update(i, "key", e.target.value)}
              className={input}
            />
            <input
              placeholder="Hodnota (např. 35 W)"
              value={row.value}
              onChange={(e) => update(i, "value", e.target.value)}
              className={input}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              title="Odebrat"
              className="shrink-0 rounded-md p-2 text-gray-soft transition-colors hover:bg-white hover:text-error"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-sm font-semibold text-forest transition-colors hover:bg-forest/10"
      >
        <Plus className="size-4" /> Přidat specifikaci
      </button>
    </div>
  );
}
