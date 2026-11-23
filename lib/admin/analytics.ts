/**
 * Čisté výpočty pro stránku Analytika v adminu (bez DB, testovatelné).
 * Částky v CZK haléřích; EUR objednávky se přepočítají kurzem ČNB (toCzk).
 * „Tržba" = zaplacená a nestornovaná objednávka (isRevenueOrder), stejně jako dashboard.
 */
import { inRange, isRevenueOrder, toCzk, type Range } from "@/lib/admin/stats";

export type AItem = {
  product_id: string | null;
  variant_id: string | null;
  name: string;
  qty: number;
  line_total: number;
  vat_rate: number | null;
};

export type AOrder = {
  id: string;
  number: string;
  created_at: string;
  status: string;
  payment_status: string;
  currency: string;
  total: number;
  subtotal: number;
  shipping: number;
  payment_fee: number;
  discount: number;
  refunded_amount: number;
  payment_method: string | null;
  shipping_method: string | null;
  customer_id: string | null;
  email: string;
  locale: string | null;
  country: string | null;
  discount_code_id: string | null;
  items: AItem[];
};

export type ProductInfo = { categoryId: string | null; brandId: string | null; purchasePriceCzk: number | null };
export type CategoryInfo = { name: string; parentId: string | null };

/* ── Období ─────────────────────────────────────────────────────────────── */

export const A_PERIODS = {
  "7": "7 dní",
  "30": "30 dní",
  "90": "90 dní",
  "365": "12 měsíců",
  ytd: "Letos",
  all: "Vše",
} as const;
export type APeriodKey = keyof typeof A_PERIODS;

export function isAPeriodKey(v: string | undefined): v is APeriodKey {
  return v != null && v in A_PERIODS;
}

/** Aktuální období a předchozí stejně dlouhé (u „Vše" předchozí není). */
export function aPeriodRanges(
  key: APeriodKey,
  now = new Date(),
  firstOrderAt: Date | null = null,
): { current: Range; previous: Range | null } {
  let from: Date;
  if (key === "all") from = firstOrderAt ?? new Date(now.getTime() - 30 * 86400_000);
  else if (key === "ytd") from = new Date(now.getFullYear(), 0, 1);
  else from = new Date(now.getTime() - Number(key) * 86400_000);
  const len = now.getTime() - from.getTime();
  return {
    current: { from, to: now },
    previous: key === "all" ? null : { from: new Date(from.getTime() - len), to: from },
  };
}

/* ── Pomocné ───────────────────────────────────────────────────────────── */

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** Cena bez DPH (u plátce DPH), jinak beze změny. */
function net(amount: number, vatRate: number | null, vatPayer: boolean): number {
  if (!vatPayer) return amount;
  return Math.round(amount / (1 + (vatRate ?? 21) / 100));
}

/* ── Souhrn ────────────────────────────────────────────────────────────── */

export type ASummary = {
  revenue: number;
  revenueNet: number;
  ordersAll: number; // včetně zrušených
  ordersActive: number; // bez zrušených
  paidOrders: number;
  cancelled: number;
  cancelRate: number | null;
  unpaidOrders: number; // nezrušené, nezaplacené
  unpaidValue: number;
  aov: number;
  medianOrder: number;
  itemsSold: number;
  itemsPerOrder: number;
  discounts: number;
  shippingRevenue: number;
  paymentFees: number;
  refunds: number;
  refundRate: number | null; // % z tržby
  margin: number | null; // hrubá marže u položek se známou nákupní cenou
  marginRate: number | null;
  marginCoverage: number | null; // % tržby zboží, u které známe nákupní cenu
};

export function aSummary(
  orders: AOrder[],
  r: Range,
  eurRate: number | null,
  products: Map<string, ProductInfo>,
  vatPayer: boolean,
): ASummary {
  let revenue = 0,
    revenueNet = 0,
    all = 0,
    active = 0,
    paid = 0,
    cancelled = 0,
    unpaid = 0,
    unpaidValue = 0,
    items = 0,
    discounts = 0,
    shipping = 0,
    fees = 0,
    refunds = 0,
    goodsNet = 0,
    knownGoodsNet = 0,
    knownCost = 0;
  const paidValues: number[] = [];

  for (const o of orders) {
    if (!inRange(o.created_at, r)) continue;
    all++;
    if (o.status === "cancelled") {
      cancelled++;
      continue;
    }
    active++;
    const c = (v: number) => toCzk(v, o.currency, eurRate);
    if (!isRevenueOrder(o)) {
      if (o.payment_status !== "refunded") {
        unpaid++;
        unpaidValue += c(o.total);
      }
      refunds += c(o.refunded_amount);
      continue;
    }
    paid++;
    const total = c(o.total);
    revenue += total;
    paidValues.push(total);
    discounts += c(o.discount);
    shipping += c(o.shipping);
    fees += c(o.payment_fee);
    refunds += c(o.refunded_amount);
    // Tržba bez DPH: zboží po sazbách, doprava a poplatek 21 %, sleva poměrně.
    const goods = o.items.reduce((s, i) => s + i.line_total, 0);
    const discountShare = goods > 0 ? Math.min(1, o.discount / goods) : 0;
    let orderNet = net(c(o.shipping + o.payment_fee), 21, vatPayer);
    for (const it of o.items) {
      items += it.qty;
      const lineNet = net(c(Math.round(it.line_total * (1 - discountShare))), it.vat_rate, vatPayer);
      orderNet += lineNet;
      goodsNet += lineNet;
      const info = it.product_id ? products.get(it.product_id) : undefined;
      if (info?.purchasePriceCzk != null) {
        knownGoodsNet += lineNet;
        knownCost += info.purchasePriceCzk * it.qty;
      }
    }
    revenueNet += orderNet;
  }

  const margin = knownGoodsNet > 0 ? knownGoodsNet - knownCost : null;
  return {
    revenue,
    revenueNet,
    ordersAll: all,
    ordersActive: active,
    paidOrders: paid,
    cancelled,
    cancelRate: pct(cancelled, all),
    unpaidOrders: unpaid,
    unpaidValue,
    aov: paid ? Math.round(revenue / paid) : 0,
    medianOrder: median(paidValues),
    itemsSold: items,
    itemsPerOrder: paid ? Math.round((items / paid) * 10) / 10 : 0,
    discounts,
    shippingRevenue: shipping,
    paymentFees: fees,
    refunds,
    refundRate: pct(refunds, revenue),
    margin,
    marginRate: margin != null ? pct(margin, knownGoodsNet) : null,
    marginCoverage: margin != null ? pct(knownGoodsNet, goodsNet) : null,
  };
}

/* ── Rozpady (metoda platby, doprava, měna, země, stav…) ───────────────── */

export type Slice = { key: string; orders: number; revenue: number; share: number | null };

/** Rozpad nestornovaných objednávek podle klíče; tržba jen ze zaplacených. */
export function breakdown(
  orders: AOrder[],
  r: Range,
  eurRate: number | null,
  keyOf: (o: AOrder) => string | null,
  opts: { includeCancelled?: boolean } = {},
): Slice[] {
  const acc = new Map<string, Slice>();
  let total = 0;
  for (const o of orders) {
    if (!inRange(o.created_at, r)) continue;
    if (!opts.includeCancelled && o.status === "cancelled") continue;
    const key = keyOf(o) ?? "—";
    const s = acc.get(key) ?? { key, orders: 0, revenue: 0, share: null };
    s.orders++;
    if (isRevenueOrder(o)) s.revenue += toCzk(o.total, o.currency, eurRate);
    acc.set(key, s);
    total++;
  }
  return Array.from(acc.values())
    .map((s) => ({ ...s, share: pct(s.orders, total) }))
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
}

/* ── Kdy se nakupuje (den v týdnu × hodina, čas v Praze) ───────────────── */

const pragueParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Prague",
  weekday: "short",
  hour: "2-digit",
  hourCycle: "h23",
});
const WD: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Matice 7 × 24 (Po–Ne × 0–23 h) s počtem nestornovaných objednávek. */
export function heatmap(orders: AOrder[], r: Range): number[][] {
  const m = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const o of orders) {
    if (!inRange(o.created_at, r) || o.status === "cancelled") continue;
    const parts = pragueParts.formatToParts(new Date(o.created_at));
    const wd = WD[parts.find((p) => p.type === "weekday")?.value ?? ""];
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    if (wd == null || Number.isNaN(h)) continue;
    m[wd][h % 24]++;
  }
  return m;
}

/* ── Zákazníci ─────────────────────────────────────────────────────────── */

export type ACustomers = {
  customers: number; // unikátní e-maily se zaplacenou objednávkou v období
  newCustomers: number; // první zaplacená objednávka vůbec je v období
  returningCustomers: number;
  returningRevenueShare: number | null;
  registeredShare: number | null; // % objednávek od přihlášených
  repeatRate: number | null; // % zákazníků (celá historie) s 2+ zaplacenými objednávkami
  avgOrdersPerCustomer: number; // celá historie
  avgLifetimeValue: number; // celá historie
  avgDaysBetweenOrders: number | null; // celá historie, u opakovaných
  top: { email: string; orders: number; revenue: number; registered: boolean }[];
};

export function customerStats(allOrders: AOrder[], r: Range, eurRate: number | null): ACustomers {
  const paid = allOrders
    .filter(isRevenueOrder)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const history = new Map<string, { first: string; dates: number[]; revenue: number }>();
  for (const o of paid) {
    const e = o.email.trim().toLowerCase();
    if (!e) continue;
    const h = history.get(e) ?? { first: o.created_at, dates: [], revenue: 0 };
    h.dates.push(new Date(o.created_at).getTime());
    h.revenue += toCzk(o.total, o.currency, eurRate);
    history.set(e, h);
  }

  const period = new Map<string, { orders: number; revenue: number; registered: boolean }>();
  let ordersInPeriod = 0,
    registeredOrders = 0,
    returningRevenue = 0,
    periodRevenue = 0;
  for (const o of paid) {
    if (!inRange(o.created_at, r)) continue;
    const e = o.email.trim().toLowerCase();
    const v = toCzk(o.total, o.currency, eurRate);
    const p = period.get(e) ?? { orders: 0, revenue: 0, registered: false };
    p.orders++;
    p.revenue += v;
    p.registered ||= Boolean(o.customer_id);
    period.set(e, p);
    ordersInPeriod++;
    if (o.customer_id) registeredOrders++;
    periodRevenue += v;
    if (!inRange(history.get(e)?.first ?? o.created_at, r)) returningRevenue += v;
  }
  let newC = 0;
  for (const e of period.keys()) if (inRange(history.get(e)!.first, r)) newC++;

  let repeaters = 0,
    gapSum = 0,
    gapCount = 0,
    lifetime = 0,
    lifetimeOrders = 0;
  for (const h of history.values()) {
    lifetime += h.revenue;
    lifetimeOrders += h.dates.length;
    if (h.dates.length >= 2) {
      repeaters++;
      for (let i = 1; i < h.dates.length; i++) {
        gapSum += h.dates[i] - h.dates[i - 1];
        gapCount++;
      }
    }
  }
  const n = history.size;
  return {
    customers: period.size,
    newCustomers: newC,
    returningCustomers: period.size - newC,
    returningRevenueShare: pct(returningRevenue, periodRevenue),
    registeredShare: pct(registeredOrders, ordersInPeriod),
    repeatRate: pct(repeaters, n),
    avgOrdersPerCustomer: n ? Math.round((lifetimeOrders / n) * 10) / 10 : 0,
    avgLifetimeValue: n ? Math.round(lifetime / n) : 0,
    avgDaysBetweenOrders: gapCount ? Math.round(gapSum / gapCount / 86400_000) : null,
    top: Array.from(period.entries())
      .map(([email, p]) => ({ email, ...p }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
  };
}

/* ── Produkty, kategorie, značky ───────────────────────────────────────── */

export type ARow = { key: string; name: string; qty: number; revenue: number; orders: number };

function itemRows(
  orders: AOrder[],
  r: Range,
  eurRate: number | null,
  keyOf: (it: AItem) => { key: string; name: string } | null,
): ARow[] {
  const acc = new Map<string, ARow & { _o: Set<string> }>();
  for (const o of orders) {
    if (!inRange(o.created_at, r) || !isRevenueOrder(o)) continue;
    for (const it of o.items) {
      const k = keyOf(it);
      if (!k) continue;
      const row = acc.get(k.key) ?? { key: k.key, name: k.name, qty: 0, revenue: 0, orders: 0, _o: new Set<string>() };
      row.qty += it.qty;
      row.revenue += toCzk(it.line_total, o.currency, eurRate);
      row._o.add(o.id);
      acc.set(k.key, row);
    }
  }
  return Array.from(acc.values())
    .map(({ _o, ...row }) => ({ ...row, orders: _o.size }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function productRows(orders: AOrder[], r: Range, eurRate: number | null): ARow[] {
  return itemRows(orders, r, eurRate, (it) => ({
    key: it.product_id ?? `name:${it.name}`,
    name: it.name.split(" – ")[0],
  }));
}

/** Kořenová kategorie produktu (přes parent_id). */
export function rootCategory(id: string | null, cats: Map<string, CategoryInfo>): { id: string; name: string } | null {
  let cur = id;
  for (let guard = 0; cur && guard < 10; guard++) {
    const c = cats.get(cur);
    if (!c) return null;
    if (!c.parentId) return { id: cur, name: c.name };
    cur = c.parentId;
  }
  return null;
}

export function categoryRows(
  orders: AOrder[],
  r: Range,
  eurRate: number | null,
  products: Map<string, ProductInfo>,
  cats: Map<string, CategoryInfo>,
): ARow[] {
  return itemRows(orders, r, eurRate, (it) => {
    const root = rootCategory(it.product_id ? (products.get(it.product_id)?.categoryId ?? null) : null, cats);
    return root ? { key: root.id, name: root.name } : { key: "none", name: "Bez kategorie" };
  });
}

export function brandRows(
  orders: AOrder[],
  r: Range,
  eurRate: number | null,
  products: Map<string, ProductInfo>,
  brands: Map<string, string>,
): ARow[] {
  return itemRows(orders, r, eurRate, (it) => {
    const b = it.product_id ? products.get(it.product_id)?.brandId : null;
    return b && brands.has(b) ? { key: b, name: brands.get(b)! } : { key: "none", name: "Bez značky" };
  });
}

/* ── Slevové kódy ──────────────────────────────────────────────────────── */

export type DiscountRow = { codeId: string; orders: number; discount: number; revenue: number };

export function discountRows(orders: AOrder[], r: Range, eurRate: number | null): DiscountRow[] {
  const acc = new Map<string, DiscountRow>();
  for (const o of orders) {
    if (!o.discount_code_id || !inRange(o.created_at, r) || o.status === "cancelled") continue;
    const row = acc.get(o.discount_code_id) ?? { codeId: o.discount_code_id, orders: 0, discount: 0, revenue: 0 };
    row.orders++;
    if (isRevenueOrder(o)) {
      row.discount += toCzk(o.discount, o.currency, eurRate);
      row.revenue += toCzk(o.total, o.currency, eurRate);
    }
    acc.set(o.discount_code_id, row);
  }
  return Array.from(acc.values()).sort((a, b) => b.orders - a.orders);
}

/* ── Rychlost vyřízení (z historie objednávek) ─────────────────────────── */

export type AEvent = { order_id: string; type: string; created_at: string; meta: Record<string, unknown> | null };

export type AFulfillment = {
  hoursToPaid: number | null; // online platby: vytvoření → zaplaceno (medián)
  hoursToShipped: number | null; // vytvoření → odesláno (medián)
  shippedOrders: number;
  gatewayMethods: Slice[]; // vybraná metoda na bráně Comgate
};

export function fulfillment(orders: AOrder[], events: AEvent[], r: Range): AFulfillment {
  const byId = new Map(orders.filter((o) => inRange(o.created_at, r)).map((o) => [o.id, o]));
  const toPaid: number[] = [];
  const toShipped: number[] = [];
  const paidSeen = new Set<string>();
  const shippedSeen = new Set<string>();
  const methods = new Map<string, number>();
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const e of sorted) {
    const o = byId.get(e.order_id);
    if (!o) continue;
    const h = (new Date(e.created_at).getTime() - new Date(o.created_at).getTime()) / 3600_000;
    const meta = e.meta ?? {};
    if (e.type === "payment" && meta.status === "paid" && meta.source === "comgate" && !paidSeen.has(o.id)) {
      paidSeen.add(o.id);
      toPaid.push(h);
    }
    if (e.type === "status" && meta.to === "shipped" && !shippedSeen.has(o.id)) {
      shippedSeen.add(o.id);
      toShipped.push(h);
    }
    if (e.type === "payment" && meta.status === "created" && meta.source === "comgate") {
      const m = String(meta.method ?? "ALL");
      methods.set(m, (methods.get(m) ?? 0) + 1);
    }
  }
  const totalMethods = Array.from(methods.values()).reduce((s, v) => s + v, 0);
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    hoursToPaid: toPaid.length ? round1(medianFloat(toPaid)) : null,
    hoursToShipped: toShipped.length ? round1(medianFloat(toShipped)) : null,
    shippedOrders: toShipped.length,
    gatewayMethods: Array.from(methods.entries())
      .map(([key, n]) => ({ key, orders: n, revenue: 0, share: pct(n, totalMethods) }))
      .sort((a, b) => b.orders - a.orders),
  };
}

function medianFloat(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
