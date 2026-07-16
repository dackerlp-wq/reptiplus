"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

/**
 * Tlačítko „Přepočítat € z Kč" — načte aktuální kurz ČNB a doplní eurové
 * ceny z korunových. Hodnoty jsou pak volně editovatelné (korekce).
 */
export function EurFromCzk({ pairs }: { pairs: [string, string][] }) {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  const convert = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.closest("form");
    if (!form) return;
    setBusy(true);
    setInfo(null);
    setErr(false);
    try {
      const res = await fetch("/api/exchange-rate");
      const data = (await res.json()) as { rate?: number; date?: string };
      if (!res.ok || !data.rate) {
        setErr(true);
        setInfo("Kurz se nepodařilo načíst, zkus to znovu.");
        return;
      }
      const rate = data.rate;
      for (const [czkName, eurName] of pairs) {
        const czkEl = form.querySelector<HTMLInputElement>(
          `input[name="${czkName}"]`,
        );
        const eurEl = form.querySelector<HTMLInputElement>(
          `input[name="${eurName}"]`,
        );
        if (!czkEl || !eurEl) continue;
        const czk = parseFloat(czkEl.value.replace(",", "."));
        eurEl.value =
          Number.isFinite(czk) && czk > 0 ? (czk / rate).toFixed(2) : "";
      }
      setInfo(
        `Přepočteno kurzem ČNB ${rate} Kč/€${data.date ? ` (${data.date})` : ""}. Uprav dle potřeby.`,
      );
    } catch {
      setErr(true);
      setInfo("Kurz se nepodařilo načíst, zkus to znovu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={convert}
        disabled={busy}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/10 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        Přepočítat € z Kč (kurz ČNB)
      </button>
      {info && (
        <p className={err ? "text-xs text-error" : "text-xs text-gray-soft"}>
          {info}
        </p>
      )}
    </div>
  );
}
