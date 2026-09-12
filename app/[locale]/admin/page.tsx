import { Package, ShoppingBag, Wallet, AlertTriangle, TrendingUp, TrendingDown, Percent, ShoppingCart, ClipboardList, Receipt } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCnbEurRate } from "@/lib/exchange-rate";
import { effectiveStock } from "@/lib/stock-alerts/low-stock";
import {
  PERIODS,
  isPeriodKey,
  periodRanges,
  summarize,
  deltaPct,
  bucketize,
  topProducts,
  type StatsOrder,
} from "@/lib/admin/stats";
import { cn } from "@/lib/utils";

const czk = (minor: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(minor / 100);
const dateFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_LABEL: Record<string, string> = {
  new: "Nová",
  paid: "Zaplacená",
  processing: "Zpracovává se",
  shipped: "Odeslaná",
  delivered: "Doručená",
  cancelled: "Zrušená",
  refunded: "Vrácená",
};

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-gray-soft">nové</span>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", flat ? "text-gray-soft" : up ? "text-success" : "text-error")}>
      {flat ? null : up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {up ? "+" : ""}
      {value} % vs. předchozí období
    </span>
  );
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = isPeriodKey(sp.period) ? sp.period : "30";
  const { current, previous } = periodRanges(period);
  const svc = createServiceClient();

  const [ordersRes, pendingRes, productsRes, cartsRes, claimsRes, cnb] = await Promise.all([
    svc
      .from("order")
      .select("id, created_at, status, payment_status, currency, total, order_item(product_id, name, qty, line_total)")
      .gte("created_at", previous.from.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000),
    svc
      .from("order")
      .select("id, number, email, total, currency, status, payment_status, created_at")
      .in("status", ["new", "paid", "processing"])
      .order("created_at", { ascending: true })
      .limit(500),
    svc
      .from("product")
      .select("id, name, sku, stock_qty, low_stock_threshold, is_gift_voucher, product_variant(stock_qty)")
      .eq("is_published", true)
      .limit(2000),
    svc.from("cart").select("id, customer_id, created_at, reminder_sent_at, cart_item(added_at)").limit(2000),
    svc.from("claim").select("id", { count: "exact", head: true }).eq("status", "new"),
    getCnbEurRate().catch(() => null),
  ]);
  const eurRate = cnb?.rate ?? null;

  const orders: StatsOrder[] = (ordersRes.data ?? []).map((o) => ({
    id: o.id,
    created_at: o.created_at,
    status: o.status,
    payment_status: o.payment_status,
    currency: o.currency,
    total: o.total ?? 0,
    items: (o.order_item ?? []) as StatsOrder["items"],
  }));
  const cur = summarize(orders, current, eurRate);
  const prev = summarize(orders, previous, eurRate);
  const buckets = bucketize(orders, current, eurRate);
  const top = topProducts(orders, current, eurRate);

  // Konverze (orientační): objednávky / (objednávky + košíky vzniklé v období, které neskončily objednávkou —
  // košík se po objednání maže).
  const carts = cartsRes.data ?? [];
  const now = current.to.getTime();
  const cartsInPeriod = carts.filter((c) => new Date(c.created_at).getTime() >= current.from.getTime() && (c.cart_item?.length ?? 0) > 0).length;
  const conversion = cur.orders + cartsInPeriod > 0 ? Math.round((cur.orders / (cur.orders + cartsInPeriod)) * 1000) / 10 : null;
  const abandoned = carts.filter((c) => {
    const items = c.cart_item ?? [];
    if (items.length === 0) return false;
    const last = Math.max(new Date(c.created_at).getTime(), ...items.map((i) => new Date(i.added_at).getTime()));
    return now - last > 24 * 3600_000;
  });
  const abandonedLoggedIn = abandoned.filter((c) => c.customer_id).length;

  const lowStock = (productsRes.data ?? [])
    .filter((p) => !p.is_gift_voucher)
    .map((p) => ({ ...p, stock: effectiveStock(p), limit: p.low_stock_threshold ?? 5 }))
    .filter((p) => p.stock <= p.limit)
    .sort((a, b) => a.stock - b.stock);

  const pending = pendingRes.data ?? [];
  const maxRevenue = Math.max(1, ...buckets.map((b) => b.revenue));
  const labelEvery = buckets.length > 31 ? Math.ceil(buckets.length / 12) : buckets.length > 14 ? 3 : 1;

  const kpis = [
    { label: "Tržby (zaplacené)", value: czk(cur.revenue), delta: deltaPct(cur.revenue, prev.revenue), icon: Wallet },
    { label: "Objednávky", value: String(cur.orders), sub: `${cur.paidOrders} zaplacených`, delta: deltaPct(cur.orders, prev.orders), icon: ShoppingBag },
    { label: "Průměrná objednávka", value: cur.aov ? czk(cur.aov) : "—", delta: deltaPct(cur.aov, prev.aov), icon: Receipt },
    { label: "Konverze košíků", value: conversion == null ? "—" : `${conversion} %`, sub: `${cartsInPeriod} košíků bez objednávky`, icon: Percent },
  ];
  const ops = [
    { label: "K vyřízení", value: pending.length, href: "/admin/orders", icon: ClipboardList, warn: pending.length > 0 },
    { label: "Docházející sklad", value: lowStock.length, href: "/admin/products?stock=low", icon: AlertTriangle, warn: lowStock.length > 0 },
    { label: "Opuštěné košíky (24 h+)", value: abandoned.length, sub: `${abandonedLoggedIn} přihlášených`, href: null, icon: ShoppingCart, warn: false },
    { label: "Nové reklamace", value: claimsRes.count ?? 0, href: "/admin/claims", icon: Package, warn: (claimsRes.count ?? 0) > 0 },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Přehled</h1>
          <p className="mt-1 text-sm text-gray-soft">
            {current.from.toLocaleDateString("cs-CZ")} – {current.to.toLocaleDateString("cs-CZ")}
            {eurRate ? ` · EUR objednávky přepočteny kurzem ${eurRate.toFixed(2)} Kč` : " · kurz ČNB nedostupný, EUR × 25"}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-cream-dark bg-white p-1">
          {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => (
            <Link
              key={k}
              href={`/admin?period=${k}`}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", period === k ? "bg-forest text-white" : "text-charcoal hover:bg-cream")}
            >
              {PERIODS[k].label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((c) => (
          <div key={c.label} className="rounded-xl border border-cream-dark bg-white p-5">
            <c.icon className="size-5 text-forest" />
            <p className="mt-3 font-mono text-2xl font-bold text-ink">{c.value}</p>
            <p className="text-sm text-gray-soft">{c.label}</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {"delta" in c && <Delta value={c.delta ?? null} />}
              {c.sub && <span className="text-xs text-gray-soft">{c.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ops.map((c) => {
          const inner = (
            <>
              <c.icon className={cn("size-5", c.warn ? "text-earth" : "text-forest")} />
              <p className="mt-3 font-mono text-2xl font-bold text-ink">{c.value}</p>
              <p className="text-sm text-gray-soft">{c.label}</p>
              {c.sub && <p className="mt-1 text-xs text-gray-soft">{c.sub}</p>}
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className={cn("rounded-xl border bg-white p-5 transition-colors hover:border-forest", c.warn ? "border-gold/50" : "border-cream-dark")}>
              {inner}
            </Link>
          ) : (
            <div key={c.label} className="rounded-xl border border-cream-dark bg-white p-5">
              {inner}
            </div>
          );
        })}
      </div>

      {/* Graf tržeb */}
      <div className="mt-8 rounded-xl border border-cream-dark bg-white p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Tržby v čase</h2>
          <span className="text-xs text-gray-soft">{buckets.length > 0 && buckets.length <= 90 ? "po dnech" : "po měsících"}</span>
        </div>
        {cur.revenue === 0 && cur.orders === 0 ? (
          <p className="py-10 text-center text-sm text-gray-soft">V tomto období zatím žádné objednávky.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${Math.max(600, buckets.length * 14)} 220`} className="h-56 w-full min-w-[600px]" role="img" aria-label="Tržby po obdobích">
              {buckets.map((b, i) => {
                const w = Math.max(600, buckets.length * 14);
                const slot = w / buckets.length;
                const barW = Math.max(3, slot * 0.6);
                const h = Math.round((b.revenue / maxRevenue) * 170);
                const x = i * slot + (slot - barW) / 2;
                return (
                  <g key={b.key}>
                    <title>{`${b.label}: ${czk(b.revenue)} · ${b.orders} obj.`}</title>
                    <rect x={x} y={190 - h} width={barW} height={h} rx={2} className={b.revenue > 0 ? "fill-forest" : "fill-cream-dark"} />
                    {b.revenue === 0 && b.orders > 0 && <rect x={x} y={186} width={barW} height={4} rx={1} className="fill-gold" />}
                    {i % labelEvery === 0 && (
                      <text x={x + barW / 2} y={208} textAnchor="middle" className="fill-gray-soft" fontSize="10">
                        {b.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-soft">Zelená = zaplacené tržby, zlatá značka = objednávky bez zaplacení. Najetím na sloupec zobrazíš hodnoty.</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Top produkty */}
        <div className="rounded-xl border border-cream-dark bg-white">
          <h2 className="border-b border-cream-dark px-5 py-4 font-display text-xl font-semibold">Nejprodávanější</h2>
          {top.length === 0 ? (
            <p className="p-5 text-sm text-gray-soft">Zatím žádné zaplacené objednávky v období.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-cream-dark">
                {top.map((p, i) => (
                  <tr key={p.productId ?? p.name}>
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-soft">{i + 1}.</td>
                    <td className="py-2.5 pr-3">
                      {p.productId ? (
                        <Link href={`/admin/products/${p.productId}`} className="text-forest hover:underline">
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-gray-soft">{p.qty} ks</td>
                    <td className="py-2.5 pr-5 text-right font-mono">{czk(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Docházející sklad */}
        <div className="rounded-xl border border-cream-dark bg-white">
          <h2 className="border-b border-cream-dark px-5 py-4 font-display text-xl font-semibold">Docházející sklad</h2>
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-gray-soft">Vše je nad limitem (limit na produktu, výchozí 5 ks).</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-cream-dark">
                {lowStock.slice(0, 10).map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2.5">
                      <Link href={`/admin/products/${p.id}`} className="text-forest hover:underline">
                        {p.name}
                      </Link>
                      {p.sku && <span className="ml-2 font-mono text-xs text-gray-soft">{p.sku}</span>}
                    </td>
                    <td className="py-2.5 pr-5 text-right font-mono">
                      <span className={p.stock === 0 ? "font-semibold text-error" : "text-earth"}>{p.stock} ks</span>
                      <span className="ml-1 text-xs text-gray-soft">/ {p.limit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {lowStock.length > 10 && (
            <p className="border-t border-cream-dark px-5 py-3 text-xs text-gray-soft">… a dalších {lowStock.length - 10}.</p>
          )}
        </div>
      </div>

      {/* K vyřízení */}
      <h2 className="mb-4 mt-10 font-display text-xl font-semibold">K vyřízení ({pending.length})</h2>
      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
            <tr>
              <th className="px-4 py-3">Číslo</th>
              <th className="px-4 py-3">Vytvořeno</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3 text-right">Částka</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Platba</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-soft">
                  Nic nečeká na vyřízení.
                </td>
              </tr>
            )}
            {pending.slice(0, 10).map((o) => (
              <tr key={o.id} className="border-b border-cream last:border-0">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/admin/orders/${o.id}`} className="text-forest hover:underline">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-soft">{dateFmt.format(new Date(o.created_at))}</td>
                <td className="px-4 py-3">{o.email}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {o.currency === "EUR" ? `${((o.total ?? 0) / 100).toFixed(2)} €` : czk(o.total ?? 0)}
                </td>
                <td className="px-4 py-3">{STATUS_LABEL[o.status] ?? o.status}</td>
                <td className="px-4 py-3">
                  <span className={o.payment_status === "paid" ? "text-success" : "text-earth"}>{o.payment_status === "paid" ? "zaplaceno" : o.payment_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
