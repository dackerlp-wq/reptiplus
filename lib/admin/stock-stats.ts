/**
 * Čisté výpočty pro sekci Sklad (bez DB, testovatelné).
 * Období prodejů 30/90/365 dní; stavy Prodává se / Pomalé / Ležák / Docházející / Vyprodáno.
 */

export type StockStatus = "ok" | "slow" | "dead" | "low" | "out";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  ok: "Prodává se",
  slow: "Pomalé",
  dead: "Ležák",
  low: "Docházející",
  out: "Vyprodáno",
};

/** Pořadí pro řazení podle naléhavosti. */
export const STOCK_STATUS_ORDER: Record<StockStatus, number> = { out: 0, low: 1, dead: 2, slow: 3, ok: 4 };

export type StockSettings = {
  /** Bez prodeje déle než X dní = ležák. */
  deadDays: number;
  /** Zásoba na víc než X dní = pomalé. */
  slowDays: number;
};

export const DEFAULT_STOCK_SETTINGS: StockSettings = { deadDays: 90, slowDays: 180 };

export const STOCK_PERIODS = {
  "30": { label: "30 dní", days: 30 },
  "90": { label: "90 dní", days: 90 },
  "365": { label: "365 dní", days: 365 },
} as const;
export type StockPeriodKey = keyof typeof STOCK_PERIODS;
export function isStockPeriodKey(v: string | undefined): v is StockPeriodKey {
  return v != null && v in STOCK_PERIODS;
}

/** Typy pohybů (sloupec stock_movement.type). */
export const MOVEMENT_TYPES = ["sale", "cancel", "edit", "in", "adj", "import", "writeoff", "return", "init"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export const MOVEMENT_LABEL: Record<MovementType, string> = {
  sale: "Prodej",
  cancel: "Storno objednávky",
  edit: "Editace objednávky",
  in: "Příjem zboží",
  adj: "Ruční oprava",
  import: "Import CSV",
  writeoff: "Odpis",
  return: "Vrácení",
  init: "Založení",
};
export function isMovementType(v: string | undefined | null): v is MovementType {
  return !!v && (MOVEMENT_TYPES as readonly string[]).includes(v);
}
/** Typy, které smí admin zapsat ručně ve formuláři. */
export const MANUAL_MOVEMENT_TYPES: MovementType[] = ["in", "adj", "writeoff", "return"];

/** Počet celých dní od okamžiku (null = neznámo). */
export function daysSince(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86400_000));
}

/** Dní zásoby = skladem ÷ průměrný denní prodej za období; null = bez prodeje (∞). */
export function daysOfStock(stock: number, sold: number, periodDays: number): number | null {
  if (sold <= 0 || periodDays <= 0) return null;
  return stock / (sold / periodDays);
}

export type StockStatusInput = {
  stock: number;
  lowStockThreshold: number | null;
  sold: number;
  periodDays: number;
  /** Dní od posledního prodeje; null = nikdy / neznámo. */
  daysSinceSale: number | null;
};

export function stockStatus(i: StockStatusInput, s: StockSettings = DEFAULT_STOCK_SETTINGS): StockStatus {
  if (i.stock <= 0) return "out";
  if (i.lowStockThreshold != null && i.stock <= i.lowStockThreshold) return "low";
  if (i.daysSinceSale == null || i.daysSinceSale > s.deadDays) return "dead";
  const dos = daysOfStock(i.stock, i.sold, i.periodDays);
  if (dos == null || dos > s.slowDays) return "slow";
  return "ok";
}

/**
 * Hodnota zásoby v haléřích: nákupní cena, pokud je vyplněná, jinak prodejní
 * cena bez DPH (cena vč. DPH ÷ (1 + sazba)).
 */
export function stockValue(stock: number, priceCzk: number, purchasePriceCzk: number | null, vatRate: number): number {
  if (stock <= 0) return 0;
  const unit = purchasePriceCzk != null && purchasePriceCzk > 0 ? purchasePriceCzk : priceCzk / (1 + (vatRate || 0) / 100);
  return Math.round(stock * unit);
}

/** Prodané kusy po týdnech (poslední týden vpravo). */
export function weeklyBuckets(sales: { at: string; qty: number }[], weeks = 12, now = new Date()): number[] {
  const out = new Array<number>(weeks).fill(0);
  const end = now.getTime();
  for (const s of sales) {
    const t = new Date(s.at).getTime();
    if (!Number.isFinite(t) || t > end) continue;
    const idx = weeks - 1 - Math.floor((end - t) / (7 * 86400_000));
    if (idx >= 0 && idx < weeks) out[idx] += s.qty;
  }
  return out;
}

/**
 * Stav zásoby na konci každého z posledních N týdnů, dopočtený zpětně ze
 * současného stavu a pohybů (delta). Index 0 = nejstarší týden.
 */
export function stockHistory(
  currentStock: number,
  movements: { at: string; delta: number }[],
  weeks = 12,
  now = new Date(),
): number[] {
  const out = new Array<number>(weeks).fill(currentStock);
  const end = now.getTime();
  const week = 7 * 86400_000;
  for (let i = 0; i < weeks; i++) {
    // Stav na konci týdne i = současný stav − pohyby, které nastaly po konci toho týdne.
    const boundary = end - (weeks - 1 - i) * week;
    let s = currentStock;
    for (const m of movements) {
      const t = new Date(m.at).getTime();
      if (Number.isFinite(t) && t > boundary) s -= m.delta;
    }
    out[i] = s;
  }
  return out;
}

export type StockRowInput = {
  stock: number;
  lowStockThreshold: number | null;
  sold: number;
  daysSinceSale: number | null;
  priceCzk: number;
  purchasePriceCzk: number | null;
  vatRate: number;
};

export type StockSummary = {
  products: number;
  units: number;
  valueCzk: number;
  soldUnits: number;
  /** Prodáno za období v hodnotě zásoby (stejný základ jako valueCzk). */
  soldValueCzk: number;
  /** Obrátka zásob za rok (prodaná hodnota × 365/období ÷ hodnota zásob). */
  turnover: number | null;
  dead: number;
  deadValueCzk: number;
  low: number;
  out: number;
};

export function summarizeStock(rows: StockRowInput[], periodDays: number, s: StockSettings = DEFAULT_STOCK_SETTINGS): StockSummary {
  const sum: StockSummary = { products: rows.length, units: 0, valueCzk: 0, soldUnits: 0, soldValueCzk: 0, turnover: null, dead: 0, deadValueCzk: 0, low: 0, out: 0 };
  for (const r of rows) {
    const v = stockValue(r.stock, r.priceCzk, r.purchasePriceCzk, r.vatRate);
    const unit = r.purchasePriceCzk != null && r.purchasePriceCzk > 0 ? r.purchasePriceCzk : r.priceCzk / (1 + (r.vatRate || 0) / 100);
    sum.units += Math.max(0, r.stock);
    sum.valueCzk += v;
    sum.soldUnits += r.sold;
    sum.soldValueCzk += Math.round(r.sold * unit);
    const st = stockStatus({ stock: r.stock, lowStockThreshold: r.lowStockThreshold, sold: r.sold, periodDays, daysSinceSale: r.daysSinceSale }, s);
    if (st === "dead") { sum.dead++; sum.deadValueCzk += v; }
    if (st === "low") sum.low++;
    if (st === "out") sum.out++;
  }
  sum.turnover = sum.valueCzk > 0 ? (sum.soldValueCzk * 365) / periodDays / sum.valueCzk : null;
  return sum;
}

/** Doporučení k produktu (jedna věta). */
export function stockAdvice(
  i: StockStatusInput & { leadDays?: number },
  s: StockSettings = DEFAULT_STOCK_SETTINGS,
): string {
  const st = stockStatus(i, s);
  const perDay = i.periodDays > 0 ? i.sold / i.periodDays : 0;
  const dos = daysOfStock(i.stock, i.sold, i.periodDays);
  const lead = i.leadDays ?? 21;
  switch (st) {
    case "out":
      return perDay > 0
        ? `Vyprodáno. Při tempu ${(perDay * 7).toFixed(1)} ks/týden doobjednejte ${Math.max(1, Math.ceil(perDay * 60))} ks (zásoba na 60 dní).`
        : "Vyprodáno a bez prodejů v období. Zvažte, zda znovu naskladnit.";
    case "low":
      return perDay > 0
        ? `Docházející. Při tempu ${(perDay * 7).toFixed(1)} ks/týden doobjednejte ${Math.max(1, Math.ceil(perDay * 60))} ks.`
        : "Docházející, ale bez prodejů v období — naskladnit jen po menších množstvích.";
    case "dead":
      return i.daysSinceSale == null
        ? "Bez prodeje za celé sledované období. Zvažte slevu, zařazení do newsletteru nebo odpis."
        : `Bez prodeje ${i.daysSinceSale} dní. Zvažte slevu nebo zařazení do newsletteru; dlouhodobě odpis.`;
    case "slow":
      return dos == null ? "Prodeje jsou ojedinělé, další objednávku u dodavatele odložte." : `Zásoba vydrží ${Math.round(dos)} dní. Další objednávku u dodavatele odložte.`;
    default:
      return dos == null ? "Prodeje stabilní." : `Prodeje stabilní, zásoba na ${Math.round(dos)} dní. Doobjednat zhruba za ${Math.max(0, Math.round(dos) - lead)} dní.`;
  }
}
