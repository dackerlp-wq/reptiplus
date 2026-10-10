"use client";

import { useState } from "react";
import { recordStockMovementAction } from "@/lib/admin/stock-actions";
import { MANUAL_MOVEMENT_TYPES, MOVEMENT_LABEL, type MovementType } from "@/lib/admin/stock-stats";
import type { StockVariant } from "@/lib/admin/stock";

const input = "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const label = "flex flex-col gap-1.5 text-sm";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

const HELP: Record<MovementType, string> = {
  in: "Přičte kusy ke skladu (dodávka od dodavatele).",
  return: "Přičte kusy zpět (vrácené zboží v pořádku).",
  writeoff: "Odečte kusy (poškozené, expirace, ztráta).",
  adj: "Nastaví nový stav podle inventury (zadejte výsledný počet kusů).",
  sale: "", cancel: "", edit: "", import: "", init: "",
};

/** Formulář „Naskladnit / upravit sklad“ v detailu produktu (sekce Sklad). */
export function StockMovementForm({ productId, variants, locale }: { productId: string; variants: StockVariant[]; locale: string }) {
  const [type, setType] = useState<MovementType>("in");
  return (
    <form action={recordStockMovementAction} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="product_id" value={productId} />
      {variants.length > 0 && (
        <label className={label}>
          <span className={legend}>Varianta</span>
          <select name="variant_id" required className={input} defaultValue={variants[0]?.id}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.name} · {v.stock} ks</option>
            ))}
          </select>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          <span className={legend}>Typ pohybu</span>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as MovementType)} className={input}>
            {MANUAL_MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t === "adj" ? "Inventura / oprava stavu" : MOVEMENT_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          <span className={legend}>{type === "adj" ? "Nový stav (ks)" : "Množství (ks)"}</span>
          <input name="qty" type="number" min={0} step={1} required defaultValue={type === "adj" ? "" : "1"} className={input} />
        </label>
      </div>
      <p className="text-xs text-gray-soft">{HELP[type]}</p>
      <label className={label}>
        <span className={legend}>Dodavatel / doklad</span>
        <input name="source" placeholder="např. Arcadia, faktura 2026-118" className={input} />
      </label>
      <label className={label}>
        <span className={legend}>Poznámka</span>
        <textarea name="note" rows={2} placeholder="volitelné" className={input} />
      </label>
      <button type="submit" className="w-full rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
        Zapsat pohyb
      </button>
      <p className="text-xs text-gray-soft">
        Každá změna skladu vytvoří záznam v pohybech včetně toho, kdo ji udělal. Rychlá změna čísla v tabulce Produkty a změny v kartě produktu se zapíší jako „Ruční oprava“.
      </p>
    </form>
  );
}
