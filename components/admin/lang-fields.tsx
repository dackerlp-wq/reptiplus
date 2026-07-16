"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Values = { cs?: string; en?: string; de?: string } | null | undefined;

type Field = {
  name: string;
  label: string;
  type?: "input" | "textarea";
  values?: Values;
  placeholder?: string;
  rows?: number;
};

type Locale = "cs" | "en" | "de";
const LOCALES: [Locale, string][] = [
  ["cs", "Čeština"],
  ["en", "English"],
  ["de", "Deutsch"],
];

const inputClass =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

/**
 * i18n pole s přepínačem jazyků + tlačítkem AI překladu z češtiny.
 * Controlled state → všechny jazyky se odešlou; AI doplní EN/DE z CS.
 */
export function LangFields({
  fields,
  compact = false,
}: {
  fields: Field[];
  compact?: boolean;
}) {
  const [locale, setLocale] = useState<Locale>("cs");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<string, Record<Locale, string>>>(
    () => {
      const init: Record<string, Record<Locale, string>> = {};
      for (const f of fields) {
        init[f.name] = {
          cs: f.values?.cs ?? "",
          en: f.values?.en ?? "",
          de: f.values?.de ?? "",
        };
      }
      return init;
    },
  );

  const setVal = (field: string, loc: Locale, value: string) =>
    setVals((p) => ({ ...p, [field]: { ...p[field], [loc]: value } }));

  async function translate() {
    setBusy(true);
    setError(null);
    const texts: Record<string, string> = {};
    for (const f of fields) texts[f.name] = vals[f.name]?.cs ?? "";
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "NO_KEY"
            ? "Chybí AI klíč — doplň ho v Nastavení → Integrace → AI překlady."
            : "Překlad se nezdařil, zkus to znovu.",
        );
        return;
      }
      setVals((p) => {
        const next = { ...p };
        for (const f of fields) {
          next[f.name] = {
            ...next[f.name],
            en: data.en?.[f.name] ?? next[f.name].en,
            de: data.de?.[f.name] ?? next[f.name].de,
          };
        }
        return next;
      });
      setLocale("en");
    } catch {
      setError("Překlad se nezdařil, zkus to znovu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-cream-dark bg-white p-0.5 text-xs font-semibold">
          {LOCALES.map(([code, label]) => (
            <button
              key={code}
              type="button"
              title={label}
              onClick={() => setLocale(code)}
              className={cn(
                "rounded-md px-3 py-1.5 uppercase transition-colors",
                locale === code
                  ? "bg-forest text-white"
                  : "text-gray-soft hover:bg-cream",
              )}
            >
              {code}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={translate}
          disabled={busy}
          title="Přeložit z češtiny do EN a DE pomocí AI"
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
        <p className="rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}

      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1.5">
          {!compact && (
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">
              {f.label}
            </span>
          )}
          {LOCALES.map(([code]) => {
            const hidden = code !== locale;
            const common = {
              name: `${f.name}_${code}`,
              value: vals[f.name]?.[code] ?? "",
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => setVal(f.name, code, e.target.value),
              placeholder: compact ? `${f.label} (${code})` : f.placeholder,
              className: cn(inputClass, hidden && "hidden"),
            };
            return f.type === "textarea" ? (
              <textarea key={code} rows={f.rows ?? 3} {...common} />
            ) : (
              <input key={code} {...common} />
            );
          })}
        </label>
      ))}
    </div>
  );
}
