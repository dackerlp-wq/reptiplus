/**
 * Výpočet daňového dokladu z objednávky. Čisté funkce bez "server-only",
 * ceny v minor units (haléře / centy), sazby DPH v procentech (0 / 12 / 21).
 *
 * Ceny v obchodě jsou uvedené VČETNĚ DPH → základ = cena / (1 + sazba),
 * DPH = cena − základ. Sleva se rozpočítá na položky poměrně podle jejich
 * ceny (a tedy i podle sazeb), doprava a poplatek za platbu jsou v 21 %.
 */

export type VatRate = 0 | 12 | 21;
export const VAT_RATES: VatRate[] = [21, 12, 0];
export const SHIPPING_VAT_RATE: VatRate = 21;

export type InvoiceLineKind = "item" | "shipping" | "payment_fee" | "discount";

export type InvoiceLine = {
  kind: InvoiceLineKind;
  name: string;
  sku: string | null;
  qty: number;
  unit_price: number; // s DPH
  line_total: number; // s DPH (u slevy záporné)
  vat_rate: VatRate;
  base: number; // bez DPH
  vat: number;
};

export type VatBreakdownRow = { rate: VatRate; base: number; vat: number; total: number };

export type InvoiceTotals = {
  lines: InvoiceLine[];
  breakdown: VatBreakdownRow[];
  subtotal: number; // základ celkem
  vat_total: number;
  total: number; // s DPH
};

export type OrderItemForInvoice = {
  name: string;
  sku: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
  vat_rate: number;
};

export function toVatRate(v: number | null | undefined): VatRate {
  return v === 0 || v === 12 ? v : 21;
}

/** Základ daně z ceny včetně DPH (zaokrouhleno na minor unit). */
export function baseFromGross(gross: number, rate: VatRate): number {
  return Math.round(gross / (1 + rate / 100));
}

/**
 * Rozpočítá částku na díly poměrně k vahám; zbytek po zaokrouhlení jde
 * na největší díl, aby součet přesně seděl.
 */
export function allocateProportionally(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || amount === 0) return weights.map(() => 0);
  const parts = weights.map((w) => Math.floor((amount * w) / sum));
  let rest = amount - parts.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => [w, i] as const)
    .sort((a, b) => b[0] - a[0])
    .map(([, i]) => i);
  let k = 0;
  while (rest > 0) {
    parts[order[k % order.length]] += 1;
    rest -= 1;
    k += 1;
  }
  return parts;
}

export type InvoiceCalcInput = {
  items: OrderItemForInvoice[];
  shipping: number;
  paymentFee: number;
  discount: number;
  labels: { shipping: string; paymentFee: string; discount: string };
};

/** Sestaví řádky dokladu a rozpis DPH z objednávky. */
export function calcInvoice(input: InvoiceCalcInput): InvoiceTotals {
  const lines: InvoiceLine[] = [];

  for (const it of input.items) {
    const rate = toVatRate(it.vat_rate);
    const gross = it.line_total;
    const base = baseFromGross(gross, rate);
    lines.push({
      kind: "item",
      name: it.name,
      sku: it.sku,
      qty: it.qty,
      unit_price: it.unit_price,
      line_total: gross,
      vat_rate: rate,
      base,
      vat: gross - base,
    });
  }

  if (input.shipping > 0) {
    const base = baseFromGross(input.shipping, SHIPPING_VAT_RATE);
    lines.push({
      kind: "shipping",
      name: input.labels.shipping,
      sku: null,
      qty: 1,
      unit_price: input.shipping,
      line_total: input.shipping,
      vat_rate: SHIPPING_VAT_RATE,
      base,
      vat: input.shipping - base,
    });
  }
  if (input.paymentFee > 0) {
    const base = baseFromGross(input.paymentFee, SHIPPING_VAT_RATE);
    lines.push({
      kind: "payment_fee",
      name: input.labels.paymentFee,
      sku: null,
      qty: 1,
      unit_price: input.paymentFee,
      line_total: input.paymentFee,
      vat_rate: SHIPPING_VAT_RATE,
      base,
      vat: input.paymentFee - base,
    });
  }

  // Sleva: poměrně na položky zboží → sečíst po sazbách → záporné řádky.
  if (input.discount > 0) {
    const itemLines = lines.filter((l) => l.kind === "item");
    const parts = allocateProportionally(
      input.discount,
      itemLines.map((l) => Math.max(0, l.line_total)),
    );
    const perRate = new Map<VatRate, number>();
    itemLines.forEach((l, i) => {
      if (parts[i] > 0) perRate.set(l.vat_rate, (perRate.get(l.vat_rate) ?? 0) + parts[i]);
    });
    const multi = perRate.size > 1;
    for (const rate of VAT_RATES) {
      const amount = perRate.get(rate);
      if (!amount) continue;
      const gross = -amount;
      const base = -baseFromGross(amount, rate);
      lines.push({
        kind: "discount",
        name: multi ? `${input.labels.discount} (${rate} %)` : input.labels.discount,
        sku: null,
        qty: 1,
        unit_price: gross,
        line_total: gross,
        vat_rate: rate,
        base,
        vat: gross - base,
      });
    }
  }

  const breakdown: VatBreakdownRow[] = [];
  for (const rate of VAT_RATES) {
    const rows = lines.filter((l) => l.vat_rate === rate);
    if (rows.length === 0) continue;
    const total = rows.reduce((a, l) => a + l.line_total, 0);
    const base = rows.reduce((a, l) => a + l.base, 0);
    breakdown.push({ rate, base, vat: total - base, total });
  }
  const subtotal = breakdown.reduce((a, r) => a + r.base, 0);
  const total = breakdown.reduce((a, r) => a + r.total, 0);
  return { lines, breakdown, subtotal, vat_total: total - subtotal, total };
}

/**
 * Dobropis na částku: rozdělí ji po sazbách poměrně k rozpisu původní
 * faktury, aby DPH odpovídalo vracené části plnění.
 */
export function calcCreditNote(
  amount: number,
  original: VatBreakdownRow[],
  label: string,
): InvoiceTotals {
  const weights = original.map((r) => Math.max(0, r.total));
  const parts = allocateProportionally(amount, weights);
  const lines: InvoiceLine[] = [];
  const breakdown: VatBreakdownRow[] = [];
  original.forEach((r, i) => {
    const gross = parts[i];
    if (gross <= 0) return;
    const base = baseFromGross(gross, r.rate);
    lines.push({
      kind: "item",
      name: original.length > 1 ? `${label} (${r.rate} %)` : label,
      sku: null,
      qty: 1,
      unit_price: gross,
      line_total: gross,
      vat_rate: r.rate,
      base,
      vat: gross - base,
    });
    breakdown.push({ rate: r.rate, base, vat: gross - base, total: gross });
  });
  const subtotal = breakdown.reduce((a, r) => a + r.base, 0);
  const total = breakdown.reduce((a, r) => a + r.total, 0);
  return { lines, breakdown, subtotal, vat_total: total - subtotal, total };
}

/** Formát čísla dokladu: prefix + rok + „-" + pořadí na 4 místa (FV2026-0001). */
export function formatInvoiceNumber(prefix: string, year: number, seq: number): string {
  return `${prefix}${year}-${String(seq).padStart(4, "0")}`;
}

/** Variabilní symbol = jen číslice z čísla dokladu (max 10 znaků). */
export function variableSymbolFrom(number: string): string {
  return number.replace(/\D/g, "").slice(0, 10);
}

export function formatMoney(minor: number, currency: string, locale = "cs"): string {
  const cur = currency === "EUR" ? "EUR" : "CZK";
  const loc = locale === "de" ? "de-DE" : locale === "en" ? "en-IE" : "cs-CZ";
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
