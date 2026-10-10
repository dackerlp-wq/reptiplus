"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { STOCK_STATUS_LABEL, STOCK_STATUS_ORDER, type StockStatus } from "@/lib/admin/stock-stats";
import type { StockProductRow } from "@/lib/admin/stock";
import { Sparkline, StockBadge } from "./stock-badge";

type SortKey = "value" | "days" | "idle" | "sold" | "stock" | "status" | "name";

const czk = (minor: number) => formatPrice(minor, "cs");
const ago = (d: number | null) => (d == null ? "—" : d === 0 ? "dnes" : d === 1 ? "včera" : `před ${d} dny`);

const input = "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

/** Tabulka přehledu skladu: hledání, filtr kategorie/stavu, řazení (vše na klientu, data ze serveru). */
export function StockTable({ rows, periodDays, initialStatus = "" }: { rows: StockProductRow[]; periodDays: number; initialStatus?: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<StockStatus | "">(isStatus(initialStatus) ? initialStatus : "");
  const [sort, setSort] = useState<SortKey>("status");
  const [hidden, setHidden] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category).filter((c): c is string => !!c))).sort((a, b) => a.localeCompare(b, "cs")),
    [rows],
  );

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (hidden || r.published) &&
        (!cat || r.category === cat) &&
        (!status || r.status === status) &&
        (!needle || `${r.name} ${r.sku ?? ""}`.toLowerCase().includes(needle)),
    );
    const inf = (v: number | null) => (v == null ? Number.POSITIVE_INFINITY : v);
    out.sort((a, b) => {
      switch (sort) {
        case "value": return b.valueCzk - a.valueCzk;
        case "days": return inf(b.daysOfStock) - inf(a.daysOfStock);
        case "idle": return inf(b.daysSinceSale) - inf(a.daysSinceSale);
        case "sold": return b.sold - a.sold;
        case "stock": return b.stock - a.stock;
        case "name": return a.name.localeCompare(b.name, "cs");
        default: return STOCK_STATUS_ORDER[a.status] - STOCK_STATUS_ORDER[b.status] || b.valueCzk - a.valueCzk;
      }
    });
    return out;
  }, [rows, q, cat, status, sort, hidden]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Název nebo SKU" className={cn(input, "pl-9 min-w-[220px]")} />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-soft hover:text-ink" aria-label="Smazat hledání">
              <X className="size-4" />
            </button>
          )}
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={input}>
          <option value="">Všechny kategorie</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StockStatus | "")} className={input}>
          <option value="">Všechny stavy</option>
          {(Object.keys(STOCK_STATUS_LABEL) as StockStatus[]).map((s) => (
            <option key={s} value={s}>{STOCK_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={input}>
          <option value="status">Řadit: stav (naléhavé první)</option>
          <option value="value">Řadit: hodnota zásoby</option>
          <option value="days">Řadit: dní zásoby</option>
          <option value="idle">Řadit: nejdéle bez prodeje</option>
          <option value="sold">Řadit: nejprodávanější</option>
          <option value="stock">Řadit: skladem</option>
          <option value="name">Řadit: název</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-soft">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4 accent-forest" />
          i nepublikované
        </label>
        <span className="ml-auto text-sm text-gray-soft">{list.length} produktů</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-dark text-left text-[11px] uppercase tracking-wide text-gray-soft">
              <th className="px-3 py-2.5 font-semibold">Produkt</th>
              <th className="px-3 py-2.5 text-right font-semibold">Skladem</th>
              <th className="px-3 py-2.5 text-right font-semibold">Prodáno / {periodDays} d</th>
              <th className="px-3 py-2.5 font-semibold">Trend 12 týdnů</th>
              <th className="px-3 py-2.5 text-right font-semibold">Dní zásoby</th>
              <th className="px-3 py-2.5 text-right font-semibold">Poslední prodej</th>
              <th className="px-3 py-2.5 text-right font-semibold">Naskladněno</th>
              <th className="px-3 py-2.5 font-semibold">Stav</th>
              <th className="px-3 py-2.5 text-right font-semibold">Hodnota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-dark">
            {list.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-gray-soft">Nic neodpovídá filtru.</td></tr>
            ) : (
              list.map((r) => (
                <tr key={r.id} className="hover:bg-paper">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/stock/${r.id}`} className="font-semibold text-ink hover:text-forest">{r.name}</Link>
                    <div className="font-mono text-[11px] text-gray-soft">
                      {r.sku ?? "bez SKU"}{r.category ? ` · ${r.category}` : ""}{r.variants.length > 0 ? ` · ${r.variants.length} var.` : ""}{!r.published ? " · nepublikováno" : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{r.stock}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{r.sold}</td>
                  <td className="px-3 py-2.5"><Sparkline data={r.weekly} /></td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{r.daysOfStock == null ? "∞" : Math.round(r.daysOfStock)}</td>
                  <td className={cn("px-3 py-2.5 text-right whitespace-nowrap", r.status === "dead" && "text-error")}>{ago(r.daysSinceSale)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-gray-soft">{ago(r.daysSinceIn)}</td>
                  <td className="px-3 py-2.5"><StockBadge status={r.status} /></td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{czk(r.valueCzk)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isStatus(v: string): v is StockStatus {
  return v in STOCK_STATUS_LABEL;
}
