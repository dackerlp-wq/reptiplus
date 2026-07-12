"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Values = { cs?: string; en?: string; de?: string } | null | undefined;

type Field = {
  name: string;
  label: string;
  type?: "input" | "textarea";
  values?: Values;
  placeholder?: string;
};

const LOCALES = [
  ["cs", "Čeština"],
  ["en", "English"],
  ["de", "Deutsch"],
] as const;

const inputClass =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

/**
 * Přepínač jazyků nad i18n poli. Všechna pole zůstávají v DOM (skrytá), takže
 * se odešlou hodnoty všech jazyků — přepínání jen mění, co je vidět.
 * required NEpoužíváme (skrytý required blokuje submit) — validaci řeší server / cs default.
 */
export function LangFields({
  fields,
  compact = false,
}: {
  fields: Field[];
  compact?: boolean;
}) {
  const [locale, setLocale] = useState<"cs" | "en" | "de">("cs");

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
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
              defaultValue: f.values?.[code] ?? "",
              placeholder: compact ? `${f.label} (${code})` : f.placeholder,
              className: cn(inputClass, hidden && "hidden"),
            };
            return f.type === "textarea" ? (
              <textarea key={code} rows={3} {...common} />
            ) : (
              <input key={code} {...common} />
            );
          })}
        </label>
      ))}
    </div>
  );
}
