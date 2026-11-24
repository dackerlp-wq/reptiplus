"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, CheckCircle2, PackageCheck, Truck, XCircle } from "lucide-react";
import { packAndShipAction } from "@/lib/admin/shipping-actions";
import { checkPackage, type ServiceRule } from "@/lib/shipping/package-rules";

export type PanelBox = { name: string; lengthCm: number; widthCm: number; heightCm: number; weightKg: number };

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

const parse = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const show = (n: number | null | undefined) => (n ? String(n).replace(".", ",") : "");

/** Podmínky služby jedním řádkem („max. 15 kg · strana 120 cm · součet 150 cm"). */
function ruleSummary(r: ServiceRule): string {
  const parts = [`max. ${r.maxKg} kg`];
  if (r.box) parts.push(`schránka ${r.box.join(" × ")} cm`);
  if (r.maxSide) parts.push(`strana max. ${r.maxSide} cm`);
  if (r.maxSum) parts.push(`součet stran max. ${r.maxSum} cm`);
  return parts.join(" · ");
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={disabled || pending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Truck className="size-4" /> {pending ? "Odesílám…" : "Odeslat dopravci"}
    </button>
  );
}

/**
 * Zabalit a odeslat: obsluha vybere krabici (nebo zadá rozměry), zváží balík a panel hned ukáže,
 * jestli balík splňuje podmínky služby. Teprve pak jde zásilka k dopravci (server kontrolu zopakuje).
 */
export function PackagePanel({
  orderId,
  carrierLabel,
  rule,
  paidTier,
  boxes,
  estimateKg,
  missingWeights,
  initial,
  suggestedBox = null,
  largestItem = null,
}: {
  orderId: string;
  carrierLabel: string;
  rule: ServiceRule;
  paidTier: "light" | "heavy" | null;
  boxes: PanelBox[];
  /** Odhad hmotnosti zboží z produktů (kg). */
  estimateKg: number;
  /** Kolik položek nemá u produktu hmotnost. */
  missingWeights: number;
  /** Dřív zadané balení (např. po chybě dopravce). */
  initial: { weightKg: number | null; lengthCm: number | null; widthCm: number | null; heightCm: number | null };
  /** Nejmenší uložená krabice, do které se zboží vejde (podle rozměrů produktů). */
  suggestedBox?: string | null;
  /** Největší kus zboží (cm), pokud mají produkty rozměry. */
  largestItem?: [number, number, number] | null;
}) {
  // Bez dřív zadaného balení se předvybere navržená krabice (rozměry z ní, hmotnost se zadává vždy).
  const preset = initial.lengthCm ? undefined : boxes.find((b) => b.name === suggestedBox);
  const [box, setBox] = useState(preset?.name ?? "");
  const [l, setL] = useState(show(initial.lengthCm ?? preset?.lengthCm));
  const [w, setW] = useState(show(initial.widthCm ?? preset?.widthCm));
  const [h, setH] = useState(show(initial.heightCm ?? preset?.heightCm));
  const [kg, setKg] = useState(show(initial.weightKg));

  const selectedBox = boxes.find((b) => b.name === box);
  const pickBox = (name: string) => {
    setBox(name);
    const b = boxes.find((x) => x.name === name);
    if (!b) return;
    setL(show(b.lengthCm));
    setW(show(b.widthCm));
    setH(show(b.heightCm));
  };

  const check = checkPackage(rule, { weightKg: parse(kg), lengthCm: parse(l), widthCm: parse(w), heightCm: parse(h) }, paidTier);
  const touched = kg !== "" || l !== "" || w !== "" || h !== "";
  const ok = check.errors.length === 0;
  const expected = Math.round((estimateKg + (selectedBox?.weightKg ?? 0)) * 100) / 100;

  return (
    <form action={packAndShipAction} className="space-y-3 rounded-lg border border-cream-dark p-3">
      <input type="hidden" name="id" value={orderId} />
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <PackageCheck className="size-4 text-forest" /> Zabalit a odeslat
        </p>
        <p className="text-xs text-gray-soft">
          {carrierLabel}: <span className="font-medium text-ink">{rule.label}</span> — {ruleSummary(rule)}
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={legend}>1. Krabice</span>
        <select value={box} onChange={(e) => pickBox(e.target.value)} className={input}>
          <option value="">Vlastní rozměry…</option>
          {boxes.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name} — {b.lengthCm} × {b.widthCm} × {b.heightCm} cm
            </option>
          ))}
        </select>
        {(suggestedBox || largestItem) && (
          <span className="text-xs text-gray-soft">
            {largestItem && `Největší kus zboží ${largestItem.map((n) => String(n).replace(".", ",")).join(" × ")} cm. `}
            {suggestedBox ? `Navržená krabice: ${suggestedBox}.` : largestItem ? "Žádná uložená krabice nestačí — zadej vlastní rozměry." : ""}
          </span>
        )}
      </label>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["length_cm", "Délka cm", l, setL],
            ["width_cm", "Šířka cm", w, setW],
            ["height_cm", "Výška cm", h, setH],
          ] as const
        ).map(([name, label, value, set]) => (
          <label key={name} className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-soft">{label}</span>
            <input
              name={name}
              inputMode="decimal"
              required
              value={value}
              onChange={(e) => {
                set(e.target.value);
                setBox("");
              }}
              className={input}
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={legend}>2. Hmotnost zváženého balíku (kg)</span>
        <input
          name="weight_kg"
          inputMode="decimal"
          required
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          placeholder={expected > 0 ? `odhad ${String(expected).replace(".", ",")}` : "zvaž balík"}
          className={input}
        />
        <span className="text-xs text-gray-soft">
          {estimateKg > 0
            ? `Odhad z produktů ${String(estimateKg).replace(".", ",")} kg${selectedBox ? ` + krabice ${String(selectedBox.weightKg).replace(".", ",")} kg` : ""}. Zadej skutečnou váhu.`
            : "Produkty nemají zadanou hmotnost — balík zvaž."}
          {missingWeights > 0 && ` U ${missingWeights} položek chybí hmotnost produktu.`}
        </span>
      </label>

      {touched && (
        <div className="space-y-1.5 text-xs">
          {check.errors.map((e) => (
            <p key={e} className="flex gap-1.5 text-error">
              <XCircle className="mt-px size-3.5 shrink-0" /> {e}
            </p>
          ))}
          {check.warnings.map((e) => (
            <p key={e} className="flex gap-1.5 text-amber-700">
              <AlertTriangle className="mt-px size-3.5 shrink-0" /> {e}
            </p>
          ))}
          {ok && check.warnings.length === 0 && (
            <p className="flex gap-1.5 text-success">
              <CheckCircle2 className="mt-px size-3.5 shrink-0" /> Balík splňuje podmínky — můžeš odeslat.
            </p>
          )}
        </div>
      )}

      <SubmitButton disabled={!ok} />
    </form>
  );
}
