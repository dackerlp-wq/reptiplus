import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { effectiveStock } from "@/lib/stock-alerts/low-stock";
import {
  daysOfStock,
  daysSince,
  isMovementType,
  stockHistory,
  stockStatus,
  stockValue,
  summarizeStock,
  weeklyBuckets,
  type MovementType,
  type StockSettings,
  type StockStatus,
  type StockSummary,
} from "@/lib/admin/stock-stats";

const WEEKS = 12;
const PAGE = 1000; // PostgREST max-rows

type MovementRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  delta: number;
  qty_after: number | null;
  type: string;
  order_id: string | null;
  source: string | null;
  author: string | null;
  note: string | null;
  created_at: string;
};

/** Pohyby za posledních N dní (stránkuje po 1000, PostgREST víc nevrátí). */
async function fetchMovementsSince(since: Date, productId?: string): Promise<MovementRow[]> {
  const svc = createServiceClient();
  const out: MovementRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = svc
      .from("stock_movement")
      .select("id, product_id, variant_id, delta, qty_after, type, order_id, source, author, note, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (productId) q = q.eq("product_id", productId);
    const { data } = await q;
    out.push(...((data ?? []) as MovementRow[]));
    if (!data || data.length < PAGE || out.length >= 50_000) break;
  }
  return out;
}

/** Prodané kusy z pohybu: prodej −delta, storno/edit započítat s opačným znaménkem. */
function soldQty(m: { type: string; delta: number }): number {
  if (m.type === "sale" || m.type === "cancel" || m.type === "edit") return -m.delta;
  return 0;
}
const INBOUND: MovementType[] = ["in", "init", "import", "adj", "return"];
function isInbound(m: { type: string; delta: number }): boolean {
  return m.delta > 0 && isMovementType(m.type) && INBOUND.includes(m.type);
}

export type StockVariant = { id: string; name: string; sku: string | null; stock: number };

export type StockProductRow = {
  id: string;
  name: string;
  sku: string | null;
  slug: string;
  category: string | null;
  published: boolean;
  stock: number;
  lowStockThreshold: number | null;
  priceCzk: number;
  purchasePriceCzk: number | null;
  vatRate: number;
  variants: StockVariant[];
  sold: number;
  weekly: number[];
  lastSaleAt: string | null;
  daysSinceSale: number | null;
  lastInAt: string | null;
  daysSinceIn: number | null;
  daysOfStock: number | null;
  status: StockStatus;
  valueCzk: number;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  slug: string;
  price_czk: number;
  purchase_price_czk: number | null;
  vat_rate: number;
  stock_qty: number;
  low_stock_threshold: number | null;
  is_published: boolean;
  category: { name: string } | { name: string }[] | null;
  product_variant: { id: string; name: string; sku: string | null; stock_qty: number }[] | null;
};

const PRODUCT_SELECT =
  "id, name, sku, slug, price_czk, purchase_price_czk, vat_rate, stock_qty, low_stock_threshold, is_published, category:category_id(name), product_variant(id, name, sku, stock_qty)";

function buildRow(p: ProductRow, moves: MovementRow[], periodDays: number, settings: StockSettings, now: Date): StockProductRow {
  const variants: StockVariant[] = (p.product_variant ?? []).map((v) => ({ id: v.id, name: v.name, sku: v.sku, stock: v.stock_qty ?? 0 }));
  // U produktu s variantami počítat jen pohyby variant (produktový sklad je nevyužitý).
  const relevant = variants.length > 0 ? moves.filter((m) => m.variant_id) : moves.filter((m) => !m.variant_id);
  const periodFrom = now.getTime() - periodDays * 86400_000;
  let sold = 0;
  let lastSaleAt: string | null = null;
  let lastInAt: string | null = null;
  const sales: { at: string; qty: number }[] = [];
  for (const m of relevant) {
    const t = new Date(m.created_at).getTime();
    const q = soldQty(m);
    if (q !== 0) {
      if (t >= periodFrom) sold += q;
      sales.push({ at: m.created_at, qty: q });
    }
    if (m.type === "sale" && (!lastSaleAt || m.created_at > lastSaleAt)) lastSaleAt = m.created_at;
    if (isInbound(m) && (!lastInAt || m.created_at > lastInAt)) lastInAt = m.created_at;
  }
  const stock = effectiveStock({ stock_qty: p.stock_qty ?? 0, product_variant: p.product_variant });
  const daysSinceSale = daysSince(lastSaleAt, now);
  const cat = p.category;
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    slug: p.slug,
    category: Array.isArray(cat) ? (cat[0]?.name ?? null) : (cat?.name ?? null),
    published: p.is_published,
    stock,
    lowStockThreshold: p.low_stock_threshold,
    priceCzk: p.price_czk ?? 0,
    purchasePriceCzk: p.purchase_price_czk,
    vatRate: p.vat_rate ?? 21,
    variants,
    sold: Math.max(0, sold),
    weekly: weeklyBuckets(sales, WEEKS, now),
    lastSaleAt,
    daysSinceSale,
    lastInAt,
    daysSinceIn: daysSince(lastInAt, now),
    daysOfStock: daysOfStock(stock, Math.max(0, sold), periodDays),
    status: stockStatus({ stock, lowStockThreshold: p.low_stock_threshold, sold: Math.max(0, sold), periodDays, daysSinceSale }, settings),
    valueCzk: stockValue(stock, p.price_czk ?? 0, p.purchase_price_czk, p.vat_rate ?? 21),
  };
}

/** Přehled skladu: všechny produkty s prodejností za období a stavem. */
export async function getStockOverview(
  periodDays: number,
  settings: StockSettings,
  now = new Date(),
): Promise<{ rows: StockProductRow[]; summary: StockSummary }> {
  const svc = createServiceClient();
  const since = new Date(now.getTime() - 365 * 86400_000);
  const [{ data: products }, moves] = await Promise.all([
    svc.from("product").select(PRODUCT_SELECT).order("name"),
    fetchMovementsSince(since),
  ]);
  const byProduct = new Map<string, MovementRow[]>();
  for (const m of moves) {
    const arr = byProduct.get(m.product_id) ?? [];
    arr.push(m);
    byProduct.set(m.product_id, arr);
  }
  const rows = ((products ?? []) as unknown as ProductRow[]).map((p) =>
    buildRow(p, byProduct.get(p.id) ?? [], periodDays, settings, now),
  );
  const summary = summarizeStock(rows, periodDays, settings);
  return { rows, summary };
}

export type StockMovementView = {
  id: string;
  productId: string;
  variantId: string | null;
  variantName: string | null;
  delta: number;
  qtyAfter: number | null;
  type: MovementType;
  orderId: string | null;
  orderNumber: string | null;
  source: string | null;
  author: string | null;
  note: string | null;
  createdAt: string;
};

export type StockProductDetail = {
  row: StockProductRow;
  movements: StockMovementView[];
  /** Stav zásoby na konci každého z posledních 12 týdnů. */
  history: number[];
};

/** Detail produktu: souhrn, pohyby (nejnovější první) a týdenní historie zásoby. */
export async function getProductStock(
  productId: string,
  periodDays: number,
  settings: StockSettings,
  now = new Date(),
): Promise<StockProductDetail | null> {
  const svc = createServiceClient();
  const since = new Date(now.getTime() - 365 * 86400_000);
  const [{ data: product }, yearMoves, { data: recent }] = await Promise.all([
    svc.from("product").select(PRODUCT_SELECT).eq("id", productId).maybeSingle(),
    fetchMovementsSince(since, productId),
    svc
      .from("stock_movement")
      .select("id, product_id, variant_id, delta, qty_after, type, order_id, source, author, note, created_at, order:order_id(number)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  if (!product) return null;
  const p = product as unknown as ProductRow;
  const row = buildRow(p, yearMoves, periodDays, settings, now);
  const variantName = new Map(row.variants.map((v) => [v.id, v.name]));
  const movements: StockMovementView[] = ((recent ?? []) as unknown as (MovementRow & { order: { number: string } | { number: string }[] | null })[]).map(
    (m) => {
      const o = m.order;
      return {
        id: m.id,
        productId: m.product_id,
        variantId: m.variant_id,
        variantName: m.variant_id ? (variantName.get(m.variant_id) ?? "smazaná varianta") : null,
        delta: m.delta,
        qtyAfter: m.qty_after,
        type: isMovementType(m.type) ? m.type : "adj",
        orderId: m.order_id,
        orderNumber: Array.isArray(o) ? (o[0]?.number ?? null) : (o?.number ?? null),
        source: m.source,
        author: m.author,
        note: m.note,
        createdAt: m.created_at,
      };
    },
  );
  const relevant = row.variants.length > 0 ? yearMoves.filter((m) => m.variant_id) : yearMoves.filter((m) => !m.variant_id);
  const history = stockHistory(
    row.stock,
    relevant.map((m) => ({ at: m.created_at, delta: m.delta })),
    WEEKS,
    now,
  );
  return { row, movements, history };
}

export type MovementFilter = {
  type?: MovementType | "";
  q?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page?: number;
  pageSize?: number;
};

export type MovementLogRow = StockMovementView & { productName: string; productSku: string | null };

/** Globální deník pohybů s filtrem (typ, hledání, období) a stránkováním. */
export async function getStockMovements(f: MovementFilter): Promise<{ rows: MovementLogRow[]; total: number }> {
  const svc = createServiceClient();
  const pageSize = f.pageSize ?? 50;
  const page = Math.max(1, f.page ?? 1);
  let productIds: string[] | null = null;
  const q = (f.q ?? "").trim();
  if (q) {
    const { data: ps } = await svc.from("product").select("id").or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,sku.ilike.%${q.replace(/[%,()]/g, "")}%`).limit(200);
    productIds = (ps ?? []).map((p) => p.id);
  }
  let query = svc
    .from("stock_movement")
    .select(
      "id, product_id, variant_id, delta, qty_after, type, order_id, source, author, note, created_at, product:product_id(name, sku), variant:variant_id(name), order:order_id(number)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (f.type && isMovementType(f.type)) query = query.eq("type", f.type);
  if (f.from) query = query.gte("created_at", `${f.from}T00:00:00`);
  if (f.to) query = query.lt("created_at", `${f.to}T23:59:59.999`);
  if (q) {
    const safe = q.replace(/[%,()]/g, "");
    query = productIds && productIds.length > 0
      ? query.or(`product_id.in.(${productIds.join(",")}),source.ilike.%${safe}%,note.ilike.%${safe}%`)
      : query.or(`source.ilike.%${safe}%,note.ilike.%${safe}%`);
  }
  const { data, count } = await query;
  type Raw = MovementRow & {
    product: { name: string; sku: string | null } | { name: string; sku: string | null }[] | null;
    variant: { name: string } | { name: string }[] | null;
    order: { number: string } | { number: string }[] | null;
  };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const rows: MovementLogRow[] = ((data ?? []) as unknown as Raw[]).map((m) => ({
    id: m.id,
    productId: m.product_id,
    variantId: m.variant_id,
    variantName: one(m.variant)?.name ?? (m.variant_id ? "smazaná varianta" : null),
    delta: m.delta,
    qtyAfter: m.qty_after,
    type: isMovementType(m.type) ? m.type : "adj",
    orderId: m.order_id,
    orderNumber: one(m.order)?.number ?? null,
    source: m.source,
    author: m.author,
    note: m.note,
    createdAt: m.created_at,
    productName: one(m.product)?.name ?? "—",
    productSku: one(m.product)?.sku ?? null,
  }));
  return { rows, total: count ?? rows.length };
}
