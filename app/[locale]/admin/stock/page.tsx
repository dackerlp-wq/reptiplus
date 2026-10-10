import { Download, ListOrdered, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/i18n";
import { getStockOverview } from "@/lib/admin/stock";
import { getStockSettings } from "@/lib/settings";
import { STOCK_PERIODS, isStockPeriodKey, type StockPeriodKey } from "@/lib/admin/stock-stats";
import { StockTable } from "@/components/admin/stock-table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const czk = (minor: number) => formatPrice(minor, "cs");

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const period: StockPeriodKey = isStockPeriodKey(sp.period) ? sp.period : "90";
  const days = STOCK_PERIODS[period].days;
  const settings = await getStockSettings();
  const { rows, summary } = await getStockOverview(days, settings);

  const kpi = "rounded-xl border border-cream-dark bg-white px-4 py-3.5";
  const kpiLabel = "text-[11px] font-semibold uppercase tracking-wide text-gray-soft";
  const kpiValue = "mt-1 font-mono text-2xl font-semibold text-ink tabular-nums";
  const kpiSub = "mt-0.5 text-xs text-gray-soft";

  return (
    <div className="max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Sklad</h1>
          <p className="mt-1 text-sm text-gray-soft">Co se prodává, co leží a každý pohyb zásoby na jednom místě.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-cream-dark bg-white text-sm">
            {(Object.keys(STOCK_PERIODS) as StockPeriodKey[]).map((k) => (
              <Link
                key={k}
                href={`/admin/stock?period=${k}`}
                className={cn("px-3 py-2 font-medium transition-colors", k === period ? "bg-forest text-white" : "text-gray-soft hover:text-ink")}
              >
                {STOCK_PERIODS[k].label}
              </Link>
            ))}
          </div>
          <Link href="/admin/stock/movements" className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
            <ListOrdered className="size-4" /> Všechny pohyby
          </Link>
          <a href={`/api/admin/stock/export?period=${period}`} className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
            <Download className="size-4" /> Export CSV
          </a>
          <Link href="/admin/settings" title="Nastavení → Sklad: limity pro Ležák / Pomalé" className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-gray-soft hover:border-forest hover:text-forest">
            <Settings2 className="size-4" />
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={kpi}>
          <div className={kpiLabel}>Hodnota zásob</div>
          <div className={kpiValue}>{czk(summary.valueCzk)}</div>
          <div className={kpiSub}>{summary.units} ks v {summary.products} produktech</div>
        </div>
        <div className={kpi}>
          <div className={kpiLabel}>Prodáno za {days} dní</div>
          <div className={kpiValue}>{czk(summary.soldValueCzk)}</div>
          <div className={kpiSub}>
            {summary.soldUnits} ks{summary.turnover != null ? ` · obrátka zásob ${summary.turnover.toFixed(1)}× ročně` : ""}
          </div>
        </div>
        <div className={kpi}>
          <div className={kpiLabel}>Ležáky</div>
          <div className={cn(kpiValue, summary.dead > 0 && "text-gold")}>{summary.dead}</div>
          <div className={kpiSub}>{czk(summary.deadValueCzk)} bez prodeje přes {settings.deadDays} dní</div>
        </div>
        <div className={kpi}>
          <div className={kpiLabel}>Docházející / vyprodané</div>
          <div className={cn(kpiValue, summary.low + summary.out > 0 && "text-error")}>{summary.low + summary.out}</div>
          <div className={kpiSub}>{summary.out} vyprodáno · {summary.low} pod limitem</div>
        </div>
      </div>

      <StockTable rows={rows} periodDays={days} initialStatus={sp.status ?? ""} />

      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-soft">
        <span><b className="font-semibold text-charcoal">Dní zásoby</b> = skladem ÷ průměrný denní prodej za období (∞ = bez prodeje)</span>
        <span><b className="font-semibold text-charcoal">Ležák</b> = skladem a bez prodeje déle než {settings.deadDays} dní</span>
        <span><b className="font-semibold text-charcoal">Pomalé</b> = zásoba na víc než {settings.slowDays} dní</span>
        <span><b className="font-semibold text-charcoal">Hodnota</b> = ks × nákupní cena, bez ní prodejní cena bez DPH</span>
      </p>
    </div>
  );
}
