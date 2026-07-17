"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles, Loader2, X } from "lucide-react";
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

const splitVals = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

/**
 * Chip vstup pro více hodnot jednoho parametru. Interně uloženo jako řetězec
 * oddělený čárkou (kompatibilní s product_attribute.value), na frontendu se
 * zobrazí jako „hodnota1, hodnota2".
 */
function ValueChips({
  value,
  onChange,
  listId,
}: {
  value: string;
  onChange: (v: string) => void;
  listId?: string;
}) {
  const [draft, setDraft] = useState("");
  const items = splitVals(value);

  const commit = (raw: string) => {
    const v = raw.trim();
    if (v && !items.includes(v)) onChange([...items, v].join(", "));
    setDraft("");
  };
  const removeAt = (i: number) =>
    onChange(items.filter((_, idx) => idx !== i).join(", "));

  return (
    <div className="flex w-full flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-cream-dark bg-white px-2 py-1.5 focus-within:border-forest">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-xs text-ink"
        >
          {it}
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="text-gray-soft hover:text-error"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(e) => {
          const val = e.target.value;
          if (val.endsWith(",")) commit(val.slice(0, -1));
          else setDraft(val);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && items.length) {
            removeAt(items.length - 1);
          }
        }}
        onBlur={() => draft && commit(draft)}
        placeholder={items.length ? "" : "Hodnota (Enter přidá další)"}
        className="min-w-[7rem] flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

/**
 * Editor specifikací (název/hodnota) s i18n a AI překladem z češtiny.
 * Serializuje se do skrytého pole `attributes` (JSON), zpracuje saveProductAction.
 */
export function ProductSpecs({
  initial,
  keys,
  keyValues = {},
  variantMode = false,
}: {
  initial: SpecRow[];
  keys: string[];
  keyValues?: Record<string, string[]>;
  variantMode?: boolean;
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
      <h2 className="font-display text-lg font-semibold">
        {variantMode ? "Společné parametry" : "Parametry"}
      </h2>
      <p className="mb-3 text-xs text-gray-soft">
        {variantMode ? (
          <>
            Parametry <strong>společné pro všechny varianty</strong> (např.
            značka, materiál). To, čím se varianty liší (výkon, velikost…), přidej
            u jednotlivých variant níže.
          </>
        ) : (
          <>Parametry produktu (např. Příkon → 35 W).</>
        )}{" "}
        Jeden parametr může mít víc hodnot — piš je jako samostatné chipy (Enter
        nebo čárka přidá další), např. Obsah vitamínů → hořčík, vápník. Vyplň
        česky a přelož do EN/DE tlačítkem.
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
          Zatím žádné parametry.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              list={lang === "cs" ? "spec-key-list" : undefined}
              placeholder="Název (např. Obsah vitamínů)"
              value={row.key[lang]}
              onChange={(e) => setField(i, "key", e.target.value)}
              className={cn(input, "mt-0.5 max-w-[40%]")}
            />
            <ValueChips
              value={row.value[lang]}
              onChange={(v) => setField(i, "value", v)}
              listId={
                lang === "cs" ? valueListIdByKey.get(row.key.cs.trim()) : undefined
              }
            />
            <button
              type="button"
              onClick={() => remove(i)}
              title="Odebrat"
              className="mt-1 shrink-0 rounded-md p-2 text-gray-soft transition-colors hover:bg-white hover:text-error"
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
        <Plus className="size-4" /> Přidat parametr
      </button>
    </div>
  );
}
