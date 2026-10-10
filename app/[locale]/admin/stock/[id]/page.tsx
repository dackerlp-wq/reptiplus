import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/i18n";
import { getProductStock } from "@/lib/admin/stock";
import { getStockSettings } from "@/lib/settings";
import { MOVEMENT_LABEL, STOCK_PERIODS, isMovementType, isStockPeriodKey, stockAdvice, type StockPeriodKey } from "@/lib/admin/stock-stats";
import { StockBadge } from "@/components/admin/stock-badge";
import { StockChart } from "@/components/admin/stock-chart";
import { StockMovementForm } from "@/components/admin/stock-movement-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const czk = (minor: number) => formatPrice(minor, "cs");
const ago = (d: number | null) => (d == null ? "—" : d === 0 ? "dnes" : d === 1 ? "včera" : `před ${d} dny`);
const dateFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function AdminStockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ period?: string; type?: string }>;
}) {
  const [{ locale, id }, sp] = await Promise.all([params, searchParams]);
  const period: StockPeriodKey = isStockPeriodKey(sp.period) ? sp.period : "90";
  const days = STOCK_PERIODS[period].days;
  const settings = await getStockSettings();
  const detail = await getProductStock(id, days, settings);
  if (!detail) notFound();
  const { row, history, variantStats } = detail;

  const typeFilter = sp.type ?? "";
  const groups: Record<string, string[]> = { sale: ["sale", "cancel", "edit"], in: ["in", "init", "import", "return"], adj: ["adj", "writeoff"] };
  const movements = typeFilter && groups[typeFilter] ? detail.movements.filter((m) => groups[typeFilter].includes(m.type)) : detail.movements;

  const advice = stockAdvice({ stock: row.stock, lowStockThreshold: row.lowStockThreshold, sold: row.sold, periodDays: days, daysSinceSale: row.daysSinceSale }, settings);
  const kpi = "rounded-xl border border-cream-dark bg-white px-4 py-3.5";
  const kpiLabel = "text-[11px] font-semibold uppercase tracking-wide text-gray-soft";
  const kpiValue = "mt-1 font-mono text-2xl font-semibold text-ink tabular-nums";
  const kpiSub = "mt-0.5 text-xs text-gray-soft";
  const pill = (active: boolean) => cn("rounded-full px-3 py-1 text-xs font-medium", active ? "bg-forest text-white" : "text-gray-soft hover:text-ink");

  return (
    <div className="max-w-7xl">
      <Link href={`/admin/stock?period=${period}`} className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Sklad
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{row.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-soft">
            <span className="font-mono text-xs">{row.sku ?? "bez SKU"}</span>
            {row.category && <span>· {row.category}</span>}
            <StockBadge status={row.status} />
          </p>
          {row.variants.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.variants.map((v) => (
                <span key={v.id} className="rounded-lg border border-cream-dark bg-paper px-2 py-1 text-xs">
                  {v.name} <b className="font-mono font-medium text-ink">{v.stock} ks</b>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-cream-dark bg-white text-sm">
            {(Object.keys(STOCK_PERIODS) as StockPeriodKey[]).map((k) => (
              <Link key={k} href={`/admin/stock/${id}?period=${k}`} className={cn("px-3 py-2 font-medium", k === period ? "bg-forest text-white" : "text-gray-soft hover:text-ink")}>
                {STOCK_PERIODS[k].label}
              </Link>
            ))}
          </div>
          <Link href={`/admin/products/${id}`} className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
            <Pencil className="size-4" /> Upravit produkt
          </Link>
          <Link href={`/produkt/${row.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm text-gray-soft hover:border-forest hover:text-forest">
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className={kpi}>
          <div className={kpiLabel}>Skladem</div>
          <div className={kpiValue}>{row.stock} ks</div>
          <div className={kpiSub}>{row.lowStockThreshold != null ? `limit upozornění ${row.lowStockThreshold} ks · ` : ""}{czk(row.valueCzk)}</div>
        </div>
        <div className={kpi}>
          <div className={kpiLabel}>Prodáno</div>
          <div className={kpiValue}>{row.sold} ks</div>
          <div className={kpiSub}>za {days} dní</div>
        </div>
        <div className={kpi}>
          <div className={kpiLabel}>Dní zásoby</div>
          <div className={cn(kpiValue, (row.status === "slow" || row.status === "dead") && "text-gold")}>{row.daysOfStock == null ? "∞" : Math.round(row.daysOfStock)}</div>
          <div className={kpiSub}>{row.daysOfStock == null ? "bez prodeje v období" : "při současném tempu"}</div>
        </div>
        <div className={kpi}>
          <div className={kpiLabel}>Poslední prodej</div>
          <div className={cn(kpiValue, "text-lg")}>{ago(row.daysSinceSale)}</div>
          <div className={kpiSub}>naskladněno {ago(row.daysSinceIn)}</div>
        </div>
        <div className={kpi}>
          <div className={kpiLabel}>Ceny</div>
          <div className={cn(kpiValue, "text-lg")}>{czk(row.priceCzk)}</div>
          <div className={kpiSub}>{row.purchasePriceCzk ? `nákupní ${czk(row.purchasePriceCzk)}` : "nákupní cena nevyplněna"}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {variantStats.length > 0 && (
            <div className="rounded-xl border border-cream-dark bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-dark px-4 py-3">
                <h2 className="font-display text-lg font-semibold">Varianty</h2>
                <span className="text-xs text-gray-soft">prodejnost za {days} dní · limit „docházející“ z produktu</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-gray-soft">
                      <th className="px-4 py-2 font-semibold">Varianta</th>
                      <th className="px-3 py-2 text-right font-semibold">Skladem</th>
                      <th className="px-3 py-2 text-right font-semibold">Prodáno</th>
                      <th className="px-3 py-2 text-right font-semibold">Dní zásoby</th>
                      <th className="px-3 py-2 text-right font-semibold">Poslední prodej</th>
                      <th className="px-3 py-2 text-right font-semibold">Naskladněno</th>
                      <th className="px-3 py-2 font-semibold">Stav</th>
                      <th className="px-4 py-2 text-right font-semibold">Hodnota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-dark">
                    {[...variantStats]
                      .sort((a, b) => b.sold - a.sold || b.stock - a.stock)
                      .map((v) => (
                        <tr key={v.id}>
                          <td className="px-4 py-2">
                            <span className="font-semibold text-ink">{v.name}</span>
                            {v.sku && <span className="ml-2 font-mono text-[11px] text-gray-soft">{v.sku}</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{v.stock}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{v.sold}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{v.daysOfStock == null ? "∞" : Math.round(v.daysOfStock)}</td>
                          <td className={cn("whitespace-nowrap px-3 py-2 text-right", v.status === "dead" && "text-error")}>{ago(v.daysSinceSale)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-gray-soft">{ago(v.daysSinceIn)}</td>
                          <td className="px-3 py-2"><StockBadge status={v.status} /></td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums">{czk(v.valueCzk)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-cream-dark bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Stav zásoby a prodeje po týdnech</h2>
              <span className="text-xs text-gray-soft">posledních 12 týdnů</span>
            </div>
            <StockChart history={history} weekly={row.weekly} lowStockThreshold={row.lowStockThreshold} />
          </div>

          <div className="rounded-xl border border-cream-dark bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-dark px-4 py-3">
              <h2 className="font-display text-lg font-semibold">Pohyby</h2>
              <div className="inline-flex gap-1 rounded-full border border-cream-dark bg-white p-0.5">
                <Link href={`/admin/stock/${id}?period=${period}`} className={pill(!typeFilter)}>Vše</Link>
                <Link href={`/admin/stock/${id}?period=${period}&type=sale`} className={pill(typeFilter === "sale")}>Prodeje</Link>
                <Link href={`/admin/stock/${id}?period=${period}&type=in`} className={pill(typeFilter === "in")}>Příjmy</Link>
                <Link href={`/admin/stock/${id}?period=${period}&type=adj`} className={pill(typeFilter === "adj")}>Úpravy</Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-gray-soft">
                    <th className="px-4 py-2 font-semibold">Datum</th>
                    <th className="px-3 py-2 font-semibold">Typ</th>
                    {row.variants.length > 0 && <th className="px-3 py-2 font-semibold">Varianta</th>}
                    <th className="px-3 py-2 text-right font-semibold">Změna</th>
                    <th className="px-3 py-2 text-right font-semibold">Stav po</th>
                    <th className="px-3 py-2 font-semibold">Zdroj</th>
                    <th className="px-3 py-2 font-semibold">Kdo</th>
                    <th className="px-4 py-2 font-semibold">Poznámka</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark">
                  {movements.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-soft">Zatím žádné pohyby.</td></tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-soft">{dateFmt.format(new Date(m.createdAt))}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold">{isMovementType(m.type) ? MOVEMENT_LABEL[m.type] : m.type}</td>
                        {row.variants.length > 0 && <td className="px-3 py-2 text-xs text-gray-soft">{m.variantName ?? "—"}</td>}
                        <td className={cn("px-3 py-2 text-right font-mono tabular-nums", m.delta > 0 ? "text-success" : m.delta < 0 ? "text-error" : "text-gray-soft")}>
                          {m.delta > 0 ? "+" : ""}{m.delta}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{m.qtyAfter ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {m.orderId ? (
                            <Link href={`/admin/orders/${m.orderId}`} className="font-mono text-forest hover:underline">{m.orderNumber ?? "objednávka"}</Link>
                          ) : (
                            <span className="text-gray-soft">{m.source ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-soft">{m.author ?? (m.orderId ? "objednávka" : "systém")}</td>
                        <td className="px-4 py-2 text-xs text-gray-soft">{m.note ?? ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-cream-dark bg-white p-4">
            <h2 className="mb-3 font-display text-lg font-semibold">Naskladnit / upravit sklad</h2>
            <StockMovementForm productId={id} variants={row.variants} locale={locale} />
          </div>
          <div className="rounded-xl border border-cream-dark bg-white p-4">
            <h2 className="mb-2 font-display text-lg font-semibold">Doporučení</h2>
            <p className="text-sm text-charcoal">{advice}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
