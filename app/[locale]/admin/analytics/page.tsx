import type { ComponentType, ReactNode } from "react";
import {
  Wallet,
  ShoppingBag,
  Receipt,
  Package,
  Percent,
  Ticket,
  Undo2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Coins,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getCnbEurRate } from "@/lib/exchange-rate";
import { getShopContact } from "@/lib/settings";
import { pickI18n } from "@/lib/i18n";
import { bucketize, deltaPct } from "@/lib/admin/stats";
import {
  A_PERIODS,
  aPeriodRanges,
  aSummary,
  brandRows,
  breakdown,
  categoryRows,
  customerStats,
  discountRows,
  fulfillment,
  heatmap,
  isAPeriodKey,
  productRows,
  type AEvent,
  type AOrder,
  type ARow,
  type CategoryInfo,
  type ProductInfo,
  type Slice,
} from "@/lib/admin/analytics";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytika" };

/* ── Formátování ───────────────────────────────────────────────────────── */

const czk = (minor: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(minor / 100);
const num = (v: number) => new Intl.NumberFormat("cs-CZ").format(v);
const pctFmt = (v: number | null) => (v == null ? "—" : `${String(v).replace(".", ",")} %`);
const hoursFmt = (h: number | null) => (h == null ? "—" : h < 48 ? `${String(h).replace(".", ",")} h` : `${Math.round(h / 24)} dní`);

const STATUS_LABEL: Record<string, string> = {
  new: "Nová",
  paid: "Zaplacená",
  processing: "Zpracovává se",
  shipped: "Odeslaná",
  delivered: "Doručená",
  cancelled: "Zrušená",
  refunded: "Vrácená",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Čeká na platbu",
  paid: "Zaplaceno",
  failed: "Neúspěšná",
  refunded: "Vráceno",
};
const GATEWAY_LABEL: Record<string, string> = {
  CARD_ALL: "Platební karta",
  APPLEPAY_REDIRECT: "Apple Pay",
  GOOGLEPAY_REDIRECT: "Google Pay",
  BANK_ONLY: "Online bankovní převod",
  LATER_ALL: "Zaplatit později",
  ALL: "Výběr na bráně",
};
const LOCALE_LABEL: Record<string, string> = { cs: "Čeština (CZK)", en: "Angličtina (EUR)", de: "Němčina (EUR)" };
const CLAIM_TYPE: Record<string, string> = { claim: "Reklamace", withdrawal: "Odstoupení" };
const INQUIRY_LABEL: Record<string, string> = {
  new: "Nové",
  in_progress: "V řešení",
  quoted: "Nabídka odeslána",
  won: "Objednáno",
  lost: "Zamítnuto",
  cancelled: "Zrušeno",
};
const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

/* ── Stavební prvky (mimo render, kvůli React Compileru) ───────────────── */

function Delta({ value }: { value: number | null | undefined }) {
  if (value === undefined) return null;
  if (value === null) return <span className="text-xs text-gray-soft">nové</span>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", flat ? "text-gray-soft" : up ? "text-success" : "text-error")}>
      {flat ? null : up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {up ? "+" : ""}
      {String(value).replace(".", ",")} %
    </span>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  delta,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border border-cream-dark bg-white p-5">
      <Icon className="size-5 text-forest" />
      <p className="mt-3 font-mono text-2xl font-bold text-ink">{value}</p>
      <p className="text-sm text-gray-soft">{label}</p>
      <div className="mt-1 flex flex-col gap-0.5">
        <Delta value={delta} />
        {sub && <span className="text-xs text-gray-soft">{sub}</span>}
      </div>
    </div>
  );
}

function Card({ title, note, children, className }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-cream-dark bg-white", className)}>
      <div className="flex items-baseline justify-between gap-3 border-b border-cream-dark px-5 py-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {note && <span className="text-right text-xs text-gray-soft">{note}</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Empty({ children = "V tomto období žádná data." }: { children?: ReactNode }) {
  return <p className="py-4 text-center text-sm text-gray-soft">{children}</p>;
}

/** Vodorovné pruhy: podíl objednávek + tržba. */
function SliceBars({ rows, label }: { rows: Slice[]; label: (key: string) => string }) {
  if (rows.length === 0) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => r.orders));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{label(r.key)}</span>
            <span className="font-mono text-xs text-gray-soft">
              {num(r.orders)} obj. · {pctFmt(r.share)}
              {r.revenue > 0 && <> · {czk(r.revenue)}</>}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-cream">
            <div className="h-2 rounded-full bg-forest" style={{ width: `${Math.max(2, (r.orders / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tabulka produktů / kategorií / značek. */
function RowsTable({ rows, limit = 10, linkProducts = false }: { rows: ARow[]; limit?: number; linkProducts?: boolean }) {
  if (rows.length === 0) return <Empty>Zatím žádné zaplacené objednávky v období.</Empty>;
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-gray-soft">
        <tr>
          <th className="pb-2">Název</th>
          <th className="pb-2 text-right">Ks</th>
          <th className="pb-2 text-right">Obj.</th>
          <th className="pb-2 text-right">Tržba</th>
          <th className="pb-2 text-right">Podíl</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-cream-dark">
        {rows.slice(0, limit).map((r) => (
          <tr key={r.key}>
            <td className="py-2 pr-3">
              {linkProducts && !r.key.startsWith("name:") ? (
                <Link href={`/admin/products/${r.key}`} className="text-forest hover:underline">
                  {r.name}
                </Link>
              ) : (
                r.name
              )}
            </td>
            <td className="py-2 text-right font-mono text-gray-soft">{num(r.qty)}</td>
            <td className="py-2 text-right font-mono text-gray-soft">{num(r.orders)}</td>
            <td className="py-2 text-right font-mono">{czk(r.revenue)}</td>
            <td className="py-2 text-right font-mono text-xs text-gray-soft">{pctFmt(total ? Math.round((r.revenue / total) * 1000) / 10 : null)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-soft">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold text-ink">{value}</p>
      {sub && <p className="text-xs text-gray-soft">{sub}</p>}
    </div>
  );
}

/* ── Stránka ───────────────────────────────────────────────────────────── */

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = isAPeriodKey(sp.period) ? sp.period : "30";
  const svc = createServiceClient();

  const [
    ordersRes,
    productsRes,
    categoriesRes,
    brandsRes,
    payRes,
    shipRes,
    codesRes,
    customersRes,
    subsRes,
    reviewsRes,
    claimsRes,
    inquiriesRes,
    alertsRes,
    cartsRes,
    cnb,
    shop,
  ] = await Promise.all([
    svc
      .from("order")
      .select(
        "id, number, created_at, status, payment_status, currency, total, subtotal, shipping, payment_fee, discount, refunded_amount, payment_method, shipping_method, customer_id, email, locale, shipping_address, discount_code_id, order_item(product_id, variant_id, name, qty, line_total, vat_rate)",
      )
      .order("created_at", { ascending: true })
      .limit(20000),
    svc.from("product").select("id, category_id, brand_id, purchase_price_czk, is_published").limit(5000),
    svc.from("category").select("id, name, parent_id").limit(1000),
    svc.from("brand").select("id, name").limit(1000),
    svc.from("payment_method").select("code, name_i18n"),
    svc.from("shipping_method").select("code, name_i18n"),
    svc.from("discount_code").select("id, code").limit(5000),
    svc.from("customer").select("created_at").limit(20000),
    svc.from("newsletter_subscriber").select("confirmed_at, unsubscribed_at").limit(20000),
    svc.from("review").select("created_at, rating, is_approved").limit(20000),
    svc.from("claim").select("created_at, type").limit(5000),
    svc.from("ledx_inquiry").select("created_at, status, quote_amount, quote_currency").limit(5000),
    svc.from("stock_alert").select("created_at, notified_at").limit(20000),
    svc.from("cart").select("id, created_at, customer_id, cart_item(added_at)").limit(5000),
    getCnbEurRate().catch(() => null),
    getShopContact().catch(() => null),
  ]);

  const eurRate = cnb?.rate ?? null;
  const vatPayer = Boolean(shop?.dic);

  const orders: AOrder[] = (ordersRes.data ?? []).map((o) => ({
    id: o.id,
    number: o.number,
    created_at: o.created_at,
    status: o.status,
    payment_status: o.payment_status,
    currency: o.currency,
    total: o.total ?? 0,
    subtotal: o.subtotal ?? 0,
    shipping: o.shipping ?? 0,
    payment_fee: o.payment_fee ?? 0,
    discount: o.discount ?? 0,
    refunded_amount: o.refunded_amount ?? 0,
    payment_method: o.payment_method,
    shipping_method: o.shipping_method,
    customer_id: o.customer_id,
    email: o.email ?? "",
    locale: o.locale,
    country: ((o.shipping_address as { country?: string } | null)?.country ?? null) || null,
    discount_code_id: o.discount_code_id,
    items: (o.order_item ?? []) as AOrder["items"],
  }));

  const firstOrderAt = orders.length ? new Date(orders[0].created_at) : null;
  const { current, previous } = aPeriodRanges(period, new Date(), firstOrderAt);
  const inCur = (iso: string | null) => iso != null && new Date(iso) >= current.from && new Date(iso) < current.to;

  // Historie objednávek jen pro objednávky v období (rychlost vyřízení, metoda na bráně).
  const periodIds = orders.filter((o) => inCur(o.created_at)).map((o) => o.id);
  const events: AEvent[] = [];
  for (let i = 0; i < periodIds.length; i += 500) {
    const { data } = await svc
      .from("order_event")
      .select("order_id, type, created_at, meta")
      .in("type", ["payment", "status"])
      .in("order_id", periodIds.slice(i, i + 500))
      .limit(20000);
    for (const e of data ?? []) events.push({ ...e, meta: (e.meta ?? null) as Record<string, unknown> | null });
  }

  const products = new Map<string, ProductInfo>(
    (productsRes.data ?? []).map((p) => [p.id, { categoryId: p.category_id, brandId: p.brand_id, purchasePriceCzk: p.purchase_price_czk }]),
  );
  const cats = new Map<string, CategoryInfo>((categoriesRes.data ?? []).map((c) => [c.id, { name: c.name, parentId: c.parent_id }]));
  const brands = new Map<string, string>((brandsRes.data ?? []).map((b) => [b.id, b.name]));
  const payNames = new Map((payRes.data ?? []).map((m) => [m.code, pickI18n(m.name_i18n as Record<string, string> | null, "cs")]));
  const shipNames = new Map((shipRes.data ?? []).map((m) => [m.code, pickI18n(m.name_i18n as Record<string, string> | null, "cs")]));
  const codeNames = new Map((codesRes.data ?? []).map((d) => [d.id, d.code]));

  /* Výpočty */
  const sum = aSummary(orders, current, eurRate, products, vatPayer);
  const prev = previous ? aSummary(orders, previous, eurRate, products, vatPayer) : null;
  const d = (a: number, b: number | undefined) => (prev && b !== undefined ? deltaPct(a, b) : undefined);
  const buckets = bucketize(orders, current, eurRate);
  const heat = heatmap(orders, current);
  const heatMax = Math.max(1, ...heat.flat());
  const cust = customerStats(orders, current, eurRate);
  const prodRows = productRows(orders, current, eurRate);
  const byQty = [...prodRows].sort((a, b) => b.qty - a.qty);
  const catRows = categoryRows(orders, current, eurRate, products, cats);
  const brRows = brandRows(orders, current, eurRate, products, brands);
  const discRows = discountRows(orders, current, eurRate);
  const ful = fulfillment(orders, events, current);
  const soldIds = new Set(prodRows.map((r) => r.key));
  const publishedCount = (productsRes.data ?? []).filter((p) => p.is_published).length;
  const unsold = (productsRes.data ?? []).filter((p) => p.is_published && !soldIds.has(p.id)).length;

  const byPayment = breakdown(orders, current, eurRate, (o) => o.payment_method);
  const byShipping = breakdown(orders, current, eurRate, (o) => o.shipping_method);
  const byCountry = breakdown(orders, current, eurRate, (o) => o.country);
  const byLocale = breakdown(orders, current, eurRate, (o) => o.locale ?? (o.currency === "EUR" ? "en" : "cs"));
  const byStatus = breakdown(orders, current, eurRate, (o) => o.status, { includeCancelled: true });
  const byPayStatus = breakdown(orders, current, eurRate, (o) => o.payment_status, { includeCancelled: true });

  // Ostatní (marketing, obsah, péče)
  const registrations = (customersRes.data ?? []).filter((c) => inCur(c.created_at)).length;
  const subs = subsRes.data ?? [];
  const newSubs = subs.filter((s) => inCur(s.confirmed_at)).length;
  const unsubs = subs.filter((s) => inCur(s.unsubscribed_at)).length;
  const activeSubs = subs.filter((s) => s.confirmed_at && !s.unsubscribed_at).length;
  const reviews = (reviewsRes.data ?? []).filter((r) => inCur(r.created_at));
  const avgRating = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null;
  const claims = (claimsRes.data ?? []).filter((c) => inCur(c.created_at));
  const inquiries = (inquiriesRes.data ?? []).filter((q) => inCur(q.created_at));
  const won = inquiries.filter((q) => q.status === "won").length;
  const quotedCzk = inquiries
    .filter((q) => q.quote_amount && (q.status === "quoted" || q.status === "won"))
    .reduce((s, q) => s + (q.quote_currency === "EUR" ? Math.round((q.quote_amount ?? 0) * (eurRate ?? 25)) : (q.quote_amount ?? 0)), 0);
  const alerts = (alertsRes.data ?? []).filter((a) => inCur(a.created_at));
  const carts = (cartsRes.data ?? []).filter((c) => (c.cart_item?.length ?? 0) > 0);
  const abandoned = carts.filter((c) => {
    const last = Math.max(new Date(c.created_at).getTime(), ...(c.cart_item ?? []).map((i) => new Date(i.added_at).getTime()));
    return current.to.getTime() - last > 24 * 3600_000;
  }).length;
  const cartsInPeriod = carts.filter((c) => inCur(c.created_at)).length;
  const conversion = sum.ordersActive + cartsInPeriod > 0 ? Math.round((sum.ordersActive / (sum.ordersActive + cartsInPeriod)) * 1000) / 10 : null;

  const maxRevenue = Math.max(1, ...buckets.map((b) => b.revenue));
  const labelEvery = buckets.length > 31 ? Math.ceil(buckets.length / 12) : buckets.length > 14 ? 3 : 1;
  const noData = sum.ordersAll === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytika</h1>
          <p className="mt-1 text-sm text-gray-soft">
            {current.from.toLocaleDateString("cs-CZ")} – {current.to.toLocaleDateString("cs-CZ")}
            {prev ? " · změny proti předchozímu stejně dlouhému období" : ""}
            {eurRate ? ` · EUR přepočteno kurzem ${eurRate.toFixed(2).replace(".", ",")} Kč` : " · kurz ČNB nedostupný, EUR × 25"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-cream-dark bg-white p-1">
          {(Object.keys(A_PERIODS) as (keyof typeof A_PERIODS)[]).map((k) => (
            <Link
              key={k}
              href={`/admin/analytics?period=${k}`}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", period === k ? "bg-forest text-white" : "text-charcoal hover:bg-cream")}
            >
              {A_PERIODS[k]}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Prodeje ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Tržby (zaplacené)" value={czk(sum.revenue)} delta={d(sum.revenue, prev?.revenue)} sub={vatPayer ? `bez DPH ${czk(sum.revenueNet)}` : "neplátce DPH"} />
        <Kpi icon={ShoppingBag} label="Objednávky" value={num(sum.ordersActive)} delta={d(sum.ordersActive, prev?.ordersActive)} sub={`${num(sum.paidOrders)} zaplacených`} />
        <Kpi icon={Receipt} label="Průměrná objednávka" value={sum.aov ? czk(sum.aov) : "—"} delta={d(sum.aov, prev?.aov)} sub={`medián ${sum.medianOrder ? czk(sum.medianOrder) : "—"}`} />
        <Kpi icon={Package} label="Prodané kusy" value={num(sum.itemsSold)} delta={d(sum.itemsSold, prev?.itemsSold)} sub={`${String(sum.itemsPerOrder).replace(".", ",")} ks na objednávku`} />
        <Kpi
          icon={Coins}
          label="Hrubá marže"
          value={sum.margin != null ? czk(sum.margin) : "—"}
          sub={sum.margin != null ? `${pctFmt(sum.marginRate)} z tržby zboží · nákupka známa u ${pctFmt(sum.marginCoverage)}` : "doplň nákupní ceny u produktů"}
        />
        <Kpi icon={Percent} label="Konverze košíků (orientačně)" value={pctFmt(conversion)} sub={`${num(cartsInPeriod)} košíků bez objednávky`} />
        <Kpi icon={Ticket} label="Poskytnuté slevy" value={czk(sum.discounts)} delta={d(sum.discounts, prev?.discounts)} sub={`doprava ${czk(sum.shippingRevenue)} · poplatky ${czk(sum.paymentFees)}`} />
        <Kpi icon={Undo2} label="Vrácené peníze" value={czk(sum.refunds)} sub={`${pctFmt(sum.refundRate)} z tržeb`} />
        <Kpi icon={XCircle} label="Zrušené objednávky" value={num(sum.cancelled)} sub={`${pctFmt(sum.cancelRate)} ze všech`} />
        <Kpi icon={Clock} label="Čeká na zaplacení" value={num(sum.unpaidOrders)} sub={czk(sum.unpaidValue)} />
        <Kpi icon={Clock} label="Do zaplacení (online)" value={hoursFmt(ful.hoursToPaid)} sub="medián od objednání" />
        <Kpi icon={Clock} label="Do odeslání" value={hoursFmt(ful.hoursToShipped)} sub={`medián · ${num(ful.shippedOrders)} odeslaných`} />
      </div>

      {/* ── Tržby v čase ── */}
      <Card title="Tržby v čase" note={buckets.length <= 90 ? "po dnech" : "po měsících"}>
        {noData ? (
          <Empty />
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
      </Card>

      {/* ── Kdy se nakupuje ── */}
      <Card title="Kdy zákazníci objednávají" note="den v týdnu × hodina (čas v Praze)">
        {noData ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] border-separate border-spacing-0.5 text-[10px]">
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: 24 }, (_, h) => (
                    <th key={h} className="w-6 font-mono font-normal text-gray-soft">
                      {h % 3 === 0 ? h : ""}
                    </th>
                  ))}
                  <th className="pl-2 text-right font-normal text-gray-soft">Σ</th>
                </tr>
              </thead>
              <tbody>
                {heat.map((row, wd) => (
                  <tr key={wd}>
                    <td className="pr-2 text-xs font-medium text-charcoal">{WEEKDAYS[wd]}</td>
                    {row.map((v, h) => (
                      <td
                        key={h}
                        title={`${WEEKDAYS[wd]} ${h}:00–${h}:59 · ${v} obj.`}
                        className="h-6 w-6 rounded-sm bg-forest"
                        style={{ opacity: v === 0 ? 0.06 : 0.2 + (v / heatMax) * 0.8 }}
                      />
                    ))}
                    <td className="pl-2 text-right font-mono text-xs text-gray-soft">{row.reduce((s, v) => s + v, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Platba, doprava, odkud ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Způsob platby">
          <SliceBars rows={byPayment} label={(k) => payNames.get(k) ?? k} />
        </Card>
        <Card title="Metoda na platební bráně" note="Comgate, vybráno v pokladně">
          <SliceBars rows={ful.gatewayMethods} label={(k) => GATEWAY_LABEL[k] ?? k} />
        </Card>
        <Card title="Doprava">
          <SliceBars rows={byShipping} label={(k) => shipNames.get(k) ?? k} />
        </Card>
        <Card title="Země doručení">
          <SliceBars rows={byCountry} label={(k) => k} />
        </Card>
        <Card title="Jazyk a měna obchodu">
          <SliceBars rows={byLocale} label={(k) => LOCALE_LABEL[k] ?? k} />
        </Card>
        <Card title="Stav objednávek" note="včetně zrušených">
          <SliceBars rows={byStatus} label={(k) => STATUS_LABEL[k] ?? k} />
          <div className="mt-5 border-t border-cream-dark pt-4">
            <SliceBars rows={byPayStatus} label={(k) => PAYMENT_STATUS_LABEL[k] ?? k} />
          </div>
        </Card>
      </div>

      {/* ── Zákazníci ── */}
      <Card title="Zákazníci" note="podle e-mailu, jen zaplacené objednávky">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Nakupujících v období" value={num(cust.customers)} sub={`${num(cust.newCustomers)} nových · ${num(cust.returningCustomers)} vracejících se`} />
          <Stat label="Tržba od vracejících se" value={pctFmt(cust.returningRevenueShare)} sub={`registrovaní: ${pctFmt(cust.registeredShare)} objednávek`} />
          <Stat label="Opakovaný nákup (celkově)" value={pctFmt(cust.repeatRate)} sub={`průměrně ${String(cust.avgOrdersPerCustomer).replace(".", ",")} obj. na zákazníka`} />
          <Stat
            label="Hodnota zákazníka (celkově)"
            value={cust.avgLifetimeValue ? czk(cust.avgLifetimeValue) : "—"}
            sub={cust.avgDaysBetweenOrders != null ? `další nákup v průměru za ${cust.avgDaysBetweenOrders} dní` : undefined}
          />
        </div>
        {cust.top.length > 0 && (
          <table className="mt-6 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="pb-2">Nejlepší zákazníci v období</th>
                <th className="pb-2 text-right">Obj.</th>
                <th className="pb-2 text-right">Utraceno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {cust.top.map((c) => (
                <tr key={c.email}>
                  <td className="py-2">
                    {c.email}
                    {c.registered && <span className="ml-2 rounded bg-forest/10 px-1.5 py-0.5 text-[10px] font-semibold text-forest">účet</span>}
                  </td>
                  <td className="py-2 text-right font-mono text-gray-soft">{c.orders}</td>
                  <td className="py-2 text-right font-mono">{czk(c.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Produkty ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Nejvyšší tržba" note={`neprodáno ${num(unsold)} z ${num(publishedCount)} zveřejněných produktů`}>
          <RowsTable rows={prodRows} linkProducts />
        </Card>
        <Card title="Nejvíc prodaných kusů">
          <RowsTable rows={byQty} linkProducts />
        </Card>
        <Card title="Kategorie" note="hlavní kategorie">
          <RowsTable rows={catRows} limit={15} />
        </Card>
        <Card title="Značky">
          <RowsTable rows={brRows} limit={15} />
        </Card>
      </div>

      {/* ── Slevy ── */}
      <Card title="Slevové kódy">
        {discRows.length === 0 ? (
          <Empty>V období nebyl použit žádný slevový kód.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="pb-2">Kód</th>
                <th className="pb-2 text-right">Použito</th>
                <th className="pb-2 text-right">Sleva celkem</th>
                <th className="pb-2 text-right">Tržba s kódem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {discRows.slice(0, 20).map((r) => (
                <tr key={r.codeId}>
                  <td className="py-2 font-mono">{codeNames.get(r.codeId) ?? "smazaný kód"}</td>
                  <td className="py-2 text-right font-mono text-gray-soft">{r.orders}×</td>
                  <td className="py-2 text-right font-mono">{czk(r.discount)}</td>
                  <td className="py-2 text-right font-mono">{czk(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ── Marketing, péče o zákazníky ── */}
      <Card title="Marketing a péče o zákazníky" note="za zvolené období">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Nové registrace" value={num(registrations)} />
          <Stat label="Newsletter" value={`+${num(newSubs)}`} sub={`${num(unsubs)} odhlášení · aktivních celkem ${num(activeSubs)}`} />
          <Stat label="Recenze" value={num(reviews.length)} sub={avgRating != null ? `průměr ${String(avgRating).replace(".", ",")} ★` : undefined} />
          <Stat label="Hlídání skladu" value={num(alerts.length)} sub={`${num(alerts.filter((a) => a.notified_at).length)} upozornění odesláno`} />
          <Stat label="Opuštěné košíky (teď)" value={num(abandoned)} sub="košíky starší 24 h" />
          <Stat
            label="Reklamace a vrácení"
            value={num(claims.length)}
            sub={Object.entries(CLAIM_TYPE).map(([k, l]) => `${l}: ${claims.filter((c) => c.type === k).length}`).join(" · ")}
          />
          <Stat label="Poptávky LEDX" value={num(inquiries.length)} sub={`objednáno ${won} (${pctFmt(inquiries.length ? Math.round((won / inquiries.length) * 1000) / 10 : null)})`} />
          <Stat label="Nabídky LEDX (odeslané + objednané)" value={czk(quotedCzk)} />
        </div>
        {inquiries.length > 0 && (
          <p className="mt-4 text-xs text-gray-soft">
            Poptávky podle stavu:{" "}
            {Object.entries(INQUIRY_LABEL)
              .map(([k, l]) => [l, inquiries.filter((q) => q.status === k).length] as const)
              .filter(([, n]) => n > 0)
              .map(([l, n]) => `${l} ${n}`)
              .join(" · ")}
          </p>
        )}
      </Card>

      <p className="text-xs text-gray-soft">
        Tržba = zaplacené a nezrušené objednávky (stejně jako na Přehledu). Marže se počítá jen u položek s vyplněnou nákupní cenou
        {vatPayer ? " a z cen bez DPH" : ""}. Návštěvnost webu najdeš v Google Analytics.
      </p>
    </div>
  );
}
