"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { STOCK_STATUS_LABEL, STOCK_STATUS_ORDER, type StockStatus } from "@/lib/admin/stock-stats";
import type { StockProductRow } from "@/lib/admin/stock";
import { Sparkline, StockBadge } from "./stock-badge";

type SortKey = "name" | "stock" | "sold" | "trend" | "days" | "idle" | "in" | "status" | "value";
type SortDir = "asc" | "desc";

/** Výchozí směr při prvním kliknutí na sloupec (čísla od nejvyššího, název a stav vzestupně). */
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: "asc", stock: "desc", sold: "desc", trend: "desc", days: "desc", idle: "desc", in: "desc", status: "asc", value: "desc",
};
const trendSum = (w: number[]) => w.reduce((a, b) => a + b, 0);

const czk = (minor: number) => formatPrice(minor, "cs");
const ago = (d: number | null) => (d == null ? "—" : d === 0 ? "dnes" : d === 1 ? "včera" : `před ${d} dny`);

const input = "rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";

/** Tabulka přehledu skladu: hledání, filtr kategorie/stavu, řazení (vše na klientu, data ze serveru). */
export function StockTable({ rows, periodDays, initialStatus = "" }: { rows: StockProductRow[]; periodDays: number; initialStatus?: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<StockStatus | "">(isStatus(initialStatus) ? initialStatus : "");
  const [sort, setSort] = useState<SortKey>("status");
  const [dir, setDir] = useState<SortDir>("asc");
  const [hidden, setHidden] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(DEFAULT_DIR[key]);
    }
  };

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
    // ∞ / neznámé řadit vždy na konec bez ohledu na směr.
    const inf = (v: number | null) => (v == null ? Number.POSITIVE_INFINITY : v);
    const cmp = (a: StockProductRow, b: StockProductRow): number => {
      switch (sort) {
        case "name": return a.name.localeCompare(b.name, "cs");
        case "stock": return a.stock - b.stock;
        case "sold": return a.sold - b.sold;
        case "trend": return trendSum(a.weekly) - trendSum(b.weekly);
        case "days": return inf(a.daysOfStock) - inf(b.daysOfStock);
        case "idle": return inf(a.daysSinceSale) - inf(b.daysSinceSale);
        case "in": return inf(a.daysSinceIn) - inf(b.daysSinceIn);
        case "value": return a.valueCzk - b.valueCzk;
        default: return STOCK_STATUS_ORDER[a.status] - STOCK_STATUS_ORDER[b.status] || b.valueCzk - a.valueCzk;
      }
    };
    out.sort((a, b) => {
      const c = cmp(a, b);
      if (c === 0) return a.name.localeCompare(b.name, "cs");
      const unknownA = (sort === "days" && a.daysOfStock == null) || (sort === "idle" && a.daysSinceSale == null) || (sort === "in" && a.daysSinceIn == null);
      const unknownB = (sort === "days" && b.daysOfStock == null) || (sort === "idle" && b.daysSinceSale == null) || (sort === "in" && b.daysSinceIn == null);
      if (unknownA !== unknownB) return unknownA ? 1 : -1;
      return dir === "asc" ? c : -c;
    });
    return out;
  }, [rows, q, cat, status, sort, dir, hidden]);


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
        <label className="flex items-center gap-2 text-sm text-gray-soft">
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="size-4 accent-forest" />
          i nepublikované
        </label>
        <span className="ml-auto text-sm text-gray-soft">{list.length} produktů</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-dark text-left text-[11px] text-gray-soft">
              <Th k="name" sort={sort} dir={dir} onToggle={toggleSort}>Produkt</Th>
              <Th k="stock" right sort={sort} dir={dir} onToggle={toggleSort}>Skladem</Th>
              <Th k="sold" right sort={sort} dir={dir} onToggle={toggleSort}>Prodáno / {periodDays} d</Th>
              <Th k="trend" sort={sort} dir={dir} onToggle={toggleSort}>Trend 12 týdnů</Th>
              <Th k="days" right sort={sort} dir={dir} onToggle={toggleSort}>Dní zásoby</Th>
              <Th k="idle" right sort={sort} dir={dir} onToggle={toggleSort}>Poslední prodej</Th>
              <Th k="in" right sort={sort} dir={dir} onToggle={toggleSort}>Naskladněno</Th>
              <Th k="status" sort={sort} dir={dir} onToggle={toggleSort}>Stav</Th>
              <Th k="value" right sort={sort} dir={dir} onToggle={toggleSort}>Hodnota</Th>
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

/** Záhlaví sloupce s řazením — klik přepne sloupec, další klik směr. */
function Th({
  k, sort, dir, onToggle, right, children,
}: {
  k: SortKey; sort: SortKey; dir: SortDir; onToggle: (k: SortKey) => void; right?: boolean; children: React.ReactNode;
}) {
  const active = sort === k;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("px-3 py-2.5 font-semibold", right && "text-right")} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onToggle(k)}
        className={cn("inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink", right && "flex-row-reverse", active && "text-forest")}
        title="Řadit podle sloupce (další klik obrátí směr)"
      >
        {children}
        <Icon className={cn("size-3", !active && "opacity-50")} />
      </button>
    </th>
  );
}

function isStatus(v: string): v is StockStatus {
  return v in STOCK_STATUS_LABEL;
}
