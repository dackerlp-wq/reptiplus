/**
 * Čisté výpočty pro dashboard adminu (bez DB, testovatelné).
 * Částky v CZK haléřích; EUR objednávky se přepočítají kurzem ČNB.
 */

export type StatsOrder = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  currency: string;
  total: number;
  items: { product_id: string | null; name: string; qty: number; line_total: number }[];
};

export type Range = { from: Date; to: Date };

export const PERIODS = {
  "7": { label: "7 dní", days: 7 },
  "30": { label: "30 dní", days: 30 },
  "90": { label: "90 dní", days: 90 },
  "365": { label: "12 měsíců", days: 365 },
} as const;
export type PeriodKey = keyof typeof PERIODS;

export function isPeriodKey(v: string | undefined): v is PeriodKey {
  return v != null && v in PERIODS;
}

/** Aktuální a předchozí období stejné délky (konec = teď). */
export function periodRanges(key: PeriodKey, now = new Date()): { current: Range; previous: Range } {
  const days = PERIODS[key].days;
  const to = now;
  const from = new Date(now.getTime() - days * 86400_000);
  const prevFrom = new Date(from.getTime() - days * 86400_000);
  return { current: { from, to }, previous: { from: prevFrom, to: from } };
}

export function inRange(iso: string, r: Range): boolean {
  const t = new Date(iso).getTime();
  return t >= r.from.getTime() && t < r.to.getTime();
}

/** Zaplacené a nestornované objednávky = tržba. */
export function isRevenueOrder(o: Pick<StatsOrder, "status" | "payment_status">): boolean {
  return o.payment_status === "paid" && o.status !== "cancelled";
}

/** Převod částky objednávky do CZK haléřů (EUR kurzem ČNB, bez kurzu 1:1 → radši označit). */
export function toCzk(amount: number, currency: string, eurRate: number | null): number {
  if (currency === "EUR") return Math.round(amount * (eurRate ?? 25));
  return amount;
}

export type PeriodSummary = {
  revenue: number; // CZK haléře
  orders: number; // všechny nestornované
  paidOrders: number;
  aov: number; // průměrná hodnota zaplacené objednávky
  items: number; // prodané kusy (zaplacené)
};

export function summarize(orders: StatsOrder[], r: Range, eurRate: number | null): PeriodSummary {
  let revenue = 0;
  let count = 0;
  let paid = 0;
  let items = 0;
  for (const o of orders) {
    if (!inRange(o.created_at, r) || o.status === "cancelled") continue;
    count++;
    if (isRevenueOrder(o)) {
      paid++;
      revenue += toCzk(o.total, o.currency, eurRate);
      items += o.items.reduce((s, i) => s + i.qty, 0);
    }
  }
  return { revenue, orders: count, paidOrders: paid, aov: paid ? Math.round(revenue / paid) : 0, items };
}

/** Změna v % proti předchozímu období (null = nelze spočítat). */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export type Bucket = { key: string; label: string; revenue: number; orders: number };

/** Tržby po dnech (≤ 90 dní) nebo měsících; prázdné intervaly = 0. */
export function bucketize(orders: StatsOrder[], r: Range, eurRate: number | null): Bucket[] {
  const days = Math.round((r.to.getTime() - r.from.getTime()) / 86400_000);
  const monthly = days > 90;
  const buckets = new Map<string, Bucket>();
  const keyOf = (d: Date) => (monthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : d.toISOString().slice(0, 10));
  const labelOf = (d: Date) =>
    monthly ? d.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" }) : d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });

  if (monthly) {
    const d = new Date(r.from.getFullYear(), r.from.getMonth(), 1);
    while (d.getTime() < r.to.getTime()) {
      buckets.set(keyOf(d), { key: keyOf(d), label: labelOf(d), revenue: 0, orders: 0 });
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    for (let i = 0; i < days; i++) {
      const d = new Date(r.from.getTime() + i * 86400_000);
      buckets.set(keyOf(d), { key: keyOf(d), label: labelOf(d), revenue: 0, orders: 0 });
    }
  }
  for (const o of orders) {
    if (!inRange(o.created_at, r) || o.status === "cancelled") continue;
    const b = buckets.get(keyOf(new Date(o.created_at)));
    if (!b) continue;
    b.orders++;
    if (isRevenueOrder(o)) b.revenue += toCzk(o.total, o.currency, eurRate);
  }
  return Array.from(buckets.values());
}

export type TopProduct = { productId: string | null; name: string; qty: number; revenue: number };

/** Nejprodávanější produkty (zaplacené objednávky v období), podle tržby. */
export function topProducts(orders: StatsOrder[], r: Range, eurRate: number | null, limit = 8): TopProduct[] {
  const acc = new Map<string, TopProduct>();
  for (const o of orders) {
    if (!inRange(o.created_at, r) || !isRevenueOrder(o)) continue;
    for (const it of o.items) {
      const key = it.product_id ?? `name:${it.name}`;
      const cur = acc.get(key) ?? { productId: it.product_id, name: it.name.split(" – ")[0], qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += toCzk(it.line_total, o.currency, eurRate);
      acc.set(key, cur);
    }
  }
  return Array.from(acc.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
