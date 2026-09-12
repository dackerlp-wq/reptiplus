"use client";

import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { Loader2, Upload, Check, AlertTriangle } from "lucide-react";
import { applyImportAction, previewImportAction, type ImportState } from "@/lib/admin/import-actions";

const btn = "inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-60";
const money = (m: number | null) => (m == null ? "—" : (m / 100).toLocaleString("cs-CZ"));

export function StockImportForm() {
  const [preview, doPreview, previewPending] = useActionState<ImportState, FormData>(previewImportAction, { status: "idle" });
  const [result, doApply, applyPending] = useActionState<ImportState, FormData>(applyImportAction, { status: "idle" });

  if (result.status === "done") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-sm">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Check className="size-5" /> Import hotový
        </p>
        <p className="mt-1 text-charcoal">
          Aktualizováno {result.updated} položek, přeskočeno {result.skipped}.
        </p>
        <Link href="/admin/products/import" className="mt-4 inline-block text-sm font-medium text-forest hover:underline">
          Další import
        </Link>
      </div>
    );
  }

  const rows = preview.status === "preview" ? preview.rows : [];
  const ok = rows.filter((r) => !r.error).length;

  return (
    <div className="space-y-6">
      <form action={doPreview} className="space-y-4 rounded-xl border border-cream-dark bg-white p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">CSV soubor</span>
          <input name="file" type="file" accept=".csv,text/csv,text/plain" required className="text-sm" />
        </label>
        {preview.status === "error" && (
          <p className="flex items-center gap-2 text-sm text-error">
            <AlertTriangle className="size-4" /> {preview.message}
          </p>
        )}
        {result.status === "error" && (
          <p className="flex items-center gap-2 text-sm text-error">
            <AlertTriangle className="size-4" /> {result.message}
          </p>
        )}
        <button className={btn} disabled={previewPending}>
          {previewPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Načíst náhled
        </button>
      </form>

      {preview.status === "preview" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
            <table className="w-full text-sm">
              <thead className="bg-cream text-left text-xs uppercase tracking-wide text-gray-soft">
                <tr>
                  <th className="px-3 py-2">Ř.</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Položka</th>
                  <th className="px-3 py-2 text-right">Sklad</th>
                  <th className="px-3 py-2 text-right">Cena Kč</th>
                  <th className="px-3 py-2 text-right">Cena €</th>
                  <th className="px-3 py-2">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-dark">
                {rows.map((r) => (
                  <tr key={r.line} className={r.error ? "bg-error/5" : ""}>
                    <td className="px-3 py-2 font-mono text-xs text-gray-soft">{r.line}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                    <td className="px-3 py-2">{r.target?.name ?? <span className="text-gray-soft">—</span>}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.target && <span className="text-gray-soft">{r.target.stock} → </span>}
                      {r.stock ?? <span className="text-gray-soft">beze změny</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.target && <span className="text-gray-soft">{money(r.target.priceCzk)} → </span>}
                      {r.priceCzk != null ? money(r.priceCzk) : <span className="text-gray-soft">beze změny</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.target && <span className="text-gray-soft">{money(r.target.priceEur)} → </span>}
                      {r.priceEur != null ? money(r.priceEur) : <span className="text-gray-soft">beze změny</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.error ? <span className="text-error">{r.error}</span> : <span className="text-success">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form action={doApply} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="csv" value={preview.csv} />
            <button className={btn} disabled={applyPending || ok === 0}>
              {applyPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Zapsat {ok} položek
            </button>
            <span className="text-sm text-gray-soft">Řádky s chybou se přeskočí.</span>
          </form>
        </div>
      )}
    </div>
  );
}
