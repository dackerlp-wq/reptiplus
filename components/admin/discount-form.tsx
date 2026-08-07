"use client";

import { useState } from "react";
import { saveDiscountAction } from "@/lib/admin/actions";
import type { Locale } from "@/i18n/routing";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

export type DiscountRow = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number; // percent: 1–100; fixed: haléře
  min_order: number | null;
  valid_from: string | null;
  valid_to: string | null;
  usage_limit: number | null;
  is_active: boolean;
};

const money = (v: number | null | undefined) =>
  v == null ? "" : String(v / 100);
const dateVal = (s: string | null) => (s ? s.slice(0, 10) : "");

export function DiscountForm({
  discount,
  locale,
}: {
  discount?: DiscountRow;
  locale: Locale;
}) {
  const [type, setType] = useState<"percent" | "fixed">(
    discount?.type ?? "percent",
  );
  const valueDefault =
    discount == null
      ? ""
      : discount.type === "fixed"
        ? money(discount.value)
        : String(discount.value);

  return (
    <form action={saveDiscountAction} className="max-w-2xl space-y-5">
      {discount && <input type="hidden" name="id" value={discount.id} />}
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Kód</span>
          <input
            name="code"
            required
            defaultValue={discount?.code ?? ""}
            placeholder="LETO2026"
            className={`${input} uppercase`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Typ slevy</span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "fixed")}
            className={input}
          >
            <option value="percent">Procenta (%)</option>
            <option value="fixed">Pevná částka (Kč)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>
            {type === "percent" ? "Sleva (%)" : "Sleva (Kč)"}
          </span>
          <input
            name="value"
            required
            inputMode="decimal"
            defaultValue={valueDefault}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Min. hodnota objednávky (Kč)</span>
          <input
            name="min_order"
            inputMode="decimal"
            defaultValue={money(discount?.min_order)}
            placeholder="—"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Platí od</span>
          <input
            name="valid_from"
            type="date"
            defaultValue={dateVal(discount?.valid_from ?? null)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Platí do</span>
          <input
            name="valid_to"
            type="date"
            defaultValue={dateVal(discount?.valid_to ?? null)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={legend}>Limit použití (celkem)</span>
          <input
            name="usage_limit"
            type="number"
            min={1}
            defaultValue={discount?.usage_limit ?? ""}
            placeholder="neomezeno"
            className={input}
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={discount?.is_active ?? true}
            className="size-4 accent-forest"
          />
          Aktivní
        </label>
      </div>

      <p className="text-xs text-gray-soft">
        Prázdné datum = bez omezení. Prázdný limit = neomezené použití. Pevná
        sleva se zadává v Kč (ukládá se v haléřích).
      </p>

      <button
        type="submit"
        className="rounded-lg bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-light"
      >
        Uložit
      </button>
    </form>
  );
}
