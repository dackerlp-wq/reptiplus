"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { translateFromCs } from "@/lib/admin/translate-client";

type Lang = "cs" | "en" | "de";
export type SpecRow = {
  key: Record<Lang, string>;
  value: Record<Lang, string>;
};

const LOCALES: [Lang, string][] = [
  ["cs", "CS"],
  ["en", "EN"],
  ["de", "DE"],
];

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

const emptyRow = (): SpecRow => ({
  key: { cs: "", en: "", de: "" },
  value: { cs: "", en: "", de: "" },
});

/**
 * Editor specifikací (název/hodnota) s i18n a AI překladem z češtiny.
 * Serializuje se do skrytého pole `attributes` (JSON), zpracuje saveProductAction.
 */
export function ProductSpecs({
  initial,
  keys,
  keyValues = {},
}: {
  initial: SpecRow[];
  keys: string[];
  keyValues?: Record<string, string[]>;
}) {
  const [rows, setRows] = useState<SpecRow[]>(initial);

  // Datalisty hodnot pro každý známý klíč (našeptávání už zaznamenaných hodnot)
  const valueLists = Object.entries(keyValues).map(([key, values], i) => ({
    key,
    values,
    id: `spec-val-${i}`,
  }));
  const valueListIdByKey = new Map(valueLists.map((v) => [v.key, v.id]));
  const [lang, setLang] = useState<Lang>("cs");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = () => setRows((r) => [...r, emptyRow()]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const setField = (i: number, field: "key" | "value", val: string) =>
    setRows((r) =>
      r.map((row, idx) =>
        idx === i ? { ...row, [field]: { ...row[field], [lang]: val } } : row,
      ),
    );

  const serialized = JSON.stringify(
    rows
      .filter((r) => r.key.cs.trim() && r.value.cs.trim())
      .map((r) => ({
        key: r.key.cs.trim(),
        value: r.value.cs.trim(),
        key_i18n: r.key,
        value_i18n: r.value,
      })),
  );

  async function translate() {
    setBusy(true);
    setError(null);
    const texts: Record<string, string> = {};
    rows.forEach((r, i) => {
      if (r.key.cs.trim()) texts[`k${i}`] = r.key.cs;
      if (r.value.cs.trim()) texts[`v${i}`] = r.value.cs;
    });
    const res = await translateFromCs(texts);
    if (!res.ok) {
      setError("Překlad se nezdařil. Zkontroluj AI Gateway a zkus to znovu.");
      setBusy(false);
      return;
    }
    setRows((r) =>
      r.map((row, i) => ({
        key: {
          ...row.key,
          en: res.en[`k${i}`] ?? row.key.en,
          de: res.de[`k${i}`] ?? row.key.de,
        },
        value: {
          ...row.value,
          en: res.en[`v${i}`] ?? row.value.en,
          de: res.de[`v${i}`] ?? row.value.de,
        },
      })),
    );
    setLang("en");
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-cream-dark bg-paper p-4">
      <h2 className="font-display text-lg font-semibold">Specifikace</h2>
      <p className="mb-3 text-xs text-gray-soft">
        Parametry produktu (např. Příkon → 35 W). Vyplň česky a přelož do EN/DE
        tlačítkem. Číselné hodnoty a jednotky se překladem nemění.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-cream-dark bg-white p-0.5 text-xs font-semibold">
          {LOCALES.map(([code, l]) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                lang === code
                  ? "bg-forest text-white"
                  : "text-gray-soft hover:bg-cream",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={translate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/10 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Přeložit z ČJ (AI)
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}

      <input type="hidden" name="attributes" value={serialized} />
      <datalist id="spec-key-list">
        {keys.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      {valueLists.map((vl) => (
        <datalist key={vl.id} id={vl.id}>
          {vl.values.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      ))}

      {rows.length === 0 && (
        <p className="mb-3 rounded-lg border border-dashed border-cream-dark px-3 py-4 text-center text-sm text-gray-soft">
          Zatím žádné specifikace.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              list={lang === "cs" ? "spec-key-list" : undefined}
              placeholder="Název (např. Příkon)"
              value={row.key[lang]}
              onChange={(e) => setField(i, "key", e.target.value)}
              className={input}
            />
            <input
              list={
                lang === "cs"
                  ? valueListIdByKey.get(row.key.cs.trim())
                  : undefined
              }
              placeholder="Hodnota (např. 35 W)"
              value={row.value[lang]}
              onChange={(e) => setField(i, "value", e.target.value)}
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
