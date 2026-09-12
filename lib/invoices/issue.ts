import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getContentI18n, getShopContact, type ShopContact } from "@/lib/settings";
import { getCnbEurRate } from "@/lib/exchange-rate";
import { formatPrice, pickI18n } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { Json, Tables } from "@/types/database";
import {
  calcCreditNote,
  calcInvoice,
  formatInvoiceNumber,
  variableSymbolFrom,
  type InvoiceLine,
  type VatBreakdownRow,
} from "@/lib/invoices/calc";

export type InvoiceRow = Tables<"invoice">;

export type InvoiceSettings = {
  prefix: string;
  creditPrefix: string;
  dueDays: number;
  note: string;
};

export const INVOICE_SETTINGS_KEY = "invoices.settings";

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const v = (await getContentI18n(INVOICE_SETTINGS_KEY).catch(() => ({}))) as Record<
    string,
    string | number | undefined
  >;
  const dueDays = Number(v.dueDays);
  return {
    prefix: typeof v.prefix === "string" ? v.prefix : "FV",
    creditPrefix: typeof v.creditPrefix === "string" ? v.creditPrefix : "D",
    dueDays: Number.isFinite(dueDays) && dueDays >= 0 ? dueDays : 14,
    note: typeof v.note === "string" ? v.note : "",
  };
}

export type InvoiceParty = {
  name: string;
  company?: string | null;
  street?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  ico?: string | null;
  dic?: string | null;
  email?: string | null;
  phone?: string | null;
  registration?: string | null;
  bankAccount?: string | null;
  iban?: string | null;
  bic?: string | null;
  /** Jazyk dokladu (jen u odběratele = jazyk objednávky). */
  locale?: string;
};

/** Labely řádků dokladu v jazyce objednávky. */
const LABELS: Record<Locale, { shipping: string; paymentFee: string; discount: string; refund: (n: string) => string }> = {
  cs: { shipping: "Doprava", paymentFee: "Poplatek za platbu", discount: "Sleva", refund: (n) => `Vrácení platby k faktuře ${n}` },
  en: { shipping: "Shipping", paymentFee: "Payment fee", discount: "Discount", refund: (n) => `Refund for invoice ${n}` },
  de: { shipping: "Versand", paymentFee: "Zahlungsgebühr", discount: "Rabatt", refund: (n) => `Erstattung zur Rechnung ${n}` },
};

function safeLocale(v: string | null | undefined): Locale {
  return v === "en" || v === "de" ? v : "cs";
}

function sellerParty(shop: ShopContact): InvoiceParty {
  return {
    name: shop.name,
    street: shop.address,
    ico: shop.ico,
    dic: shop.dic,
    email: shop.email,
    phone: shop.phone,
    registration: shop.registration,
    bankAccount: shop.bankAccount,
    iban: shop.iban,
    bic: shop.bic,
  };
}

type Addr = {
  full_name?: string;
  company?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  ico?: string;
  dic?: string;
} | null;

function buyerParty(order: Tables<"order">): InvoiceParty {
  const a = (order.billing_address ?? order.shipping_address) as Addr;
  return {
    locale: safeLocale(order.locale),
    name: a?.full_name || order.email,
    company: a?.company ?? null,
    street: a?.street ?? null,
    city: a?.city ?? null,
    postal_code: a?.postal_code ?? null,
    country: a?.country ?? null,
    ico: a?.ico ?? null,
    dic: a?.dic ?? null,
    email: order.email,
    phone: a?.phone ?? null,
  };
}

function addDays(d: Date, days: number): string {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x.toISOString().slice(0, 10);
}

async function nextNumber(series: "invoice" | "credit_note", prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const { data, error } = await createServiceClient().rpc("next_invoice_number", {
    p_series: series,
    p_year: year,
  });
  if (error || typeof data !== "number") {
    throw new Error(`Nepodařilo se přidělit číslo dokladu: ${error?.message ?? "?"}`);
  }
  return formatInvoiceNumber(prefix, year, data);
}

/** Názvy dopravy / platby podle kódu (cs), pro doklad. */
async function methodLabels(order: Tables<"order">, locale: Locale) {
  const svc = createServiceClient();
  const [{ data: sm }, { data: pm }] = await Promise.all([
    order.shipping_method
      ? svc.from("shipping_method").select("name_i18n").eq("code", order.shipping_method).maybeSingle()
      : Promise.resolve({ data: null }),
    order.payment_method
      ? svc.from("payment_method").select("name_i18n").eq("code", order.payment_method).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const shipping = sm ? pickI18n(sm.name_i18n as Record<string, string>, locale, order.shipping_method) : order.shipping_method ?? "";
  const payment = pm ? pickI18n(pm.name_i18n as Record<string, string>, locale, order.payment_method) : order.payment_method ?? "";
  return { shipping, payment };
}

export async function getInvoicesForOrder(orderId: string): Promise<InvoiceRow[]> {
  const { data } = await createServiceClient()
    .from("invoice")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getInvoiceById(id: string): Promise<InvoiceRow | null> {
  const { data } = await createServiceClient().from("invoice").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

async function logInvoiceEvent(orderId: string, inv: InvoiceRow, author: string | null) {
  await createServiceClient().from("order_event").insert({
    order_id: orderId,
    type: "invoice",
    body: null,
    meta: { invoice_id: inv.id, number: inv.number, kind: inv.type, total: inv.total, currency: inv.currency },
    author_email: author,
  });
}

/**
 * Vystaví fakturu k objednávce. Idempotentní — pokud už faktura existuje,
 * vrátí ji (nikdy nevzniknou dvě). Vrací { invoice, created }.
 */
export async function issueInvoiceForOrder(
  orderId: string,
  opts: { author?: string | null; paidAt?: string | null } = {},
): Promise<{ invoice: InvoiceRow; created: boolean }> {
  const svc = createServiceClient();
  const existing = (await getInvoicesForOrder(orderId)).find((i) => i.type === "invoice");
  if (existing) return { invoice: existing, created: false };

  const { data: order } = await svc.from("order").select("*, order_item(*)").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Objednávka nenalezena");

  const locale = safeLocale(order.locale);
  const labels = LABELS[locale];
  const [settings, shop, methods] = await Promise.all([
    getInvoiceSettings(),
    getShopContact(),
    methodLabels(order, locale),
  ]);

  const items = (order.order_item ?? []) as Tables<"order_item">[];
  const totals = calcInvoice({
    items: items.map((it) => ({
      name: it.name,
      sku: it.sku,
      qty: it.qty,
      unit_price: it.unit_price,
      line_total: it.line_total,
      vat_rate: it.vat_rate,
    })),
    shipping: order.shipping ?? 0,
    paymentFee: order.payment_fee ?? 0,
    discount: order.discount ?? 0,
    labels: {
      shipping: methods.shipping ? `${labels.shipping} — ${methods.shipping}` : labels.shipping,
      paymentFee: methods.payment ? `${labels.paymentFee} — ${methods.payment}` : labels.paymentFee,
      discount: labels.discount,
    },
  });

  // Kontrola: doklad musí sedět na celkovou částku objednávky.
  if (totals.total !== (order.total ?? 0)) {
    console.warn(`[invoice] součet dokladu ${totals.total} ≠ objednávka ${order.total} (${order.number})`);
  }

  const vatPayer = Boolean(shop.dic);
  const today = new Date();
  const paidAt = opts.paidAt ?? (order.payment_status === "paid" ? today.toISOString().slice(0, 10) : null);

  // EUR doklad plátce DPH: přepočet DPH do CZK kurzem ČNB k datu vystavení.
  let exchangeRate: number | null = null;
  let vatTotalCzk: number | null = null;
  if (order.currency === "EUR" && vatPayer) {
    const cnb = await getCnbEurRate();
    if (cnb) {
      exchangeRate = cnb.rate;
      vatTotalCzk = Math.round(totals.vat_total * cnb.rate);
    }
  }

  const number = await nextNumber("invoice", settings.prefix);
  const row = {
    number,
    type: "invoice",
    order_id: orderId,
    issued_at: today.toISOString().slice(0, 10),
    taxable_date: today.toISOString().slice(0, 10),
    due_date: paidAt ?? addDays(today, settings.dueDays),
    paid_at: paidAt,
    currency: order.currency,
    subtotal: vatPayer ? totals.subtotal : totals.total,
    vat_total: vatPayer ? totals.vat_total : 0,
    total: totals.total,
    vat_breakdown: (vatPayer ? totals.breakdown : []) as unknown as Json,
    exchange_rate: exchangeRate,
    vat_total_czk: vatTotalCzk,
    seller: sellerParty(shop) as unknown as Json,
    buyer: buyerParty(order) as unknown as Json,
    items: totals.lines as unknown as Json,
    payment_method: methods.payment || order.payment_method,
    variable_symbol: variableSymbolFrom(number),
    note: [
      settings.note,
      `${locale === "cs" ? "Objednávka" : locale === "de" ? "Bestellung" : "Order"} ${order.number}`,
      (order.voucher_amount ?? 0) > 0
        ? `${locale === "cs" ? "Uhrazeno dárkovým poukazem" : locale === "de" ? "Bezahlt mit Geschenkgutschein" : "Paid by gift voucher"}: ${formatPrice(order.voucher_amount, locale)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    created_by: opts.author ?? null,
  };
  const { data: inv, error } = await svc.from("invoice").insert(row).select("*").single();
  if (error) throw new Error(`Fakturu se nepodařilo uložit: ${error.message}`);

  await logInvoiceEvent(orderId, inv, opts.author ?? null);
  return { invoice: inv, created: true };
}

/**
 * Vystaví dobropis (opravný daňový doklad) k faktuře objednávky na vrácenou
 * částku. Bez faktury dobropis nevzniká (není co opravovat) → vrací null.
 */
export async function issueCreditNoteForRefund(
  orderId: string,
  amount: number,
  opts: { author?: string | null; reason?: string | null } = {},
): Promise<InvoiceRow | null> {
  if (amount <= 0) return null;
  const svc = createServiceClient();
  const invoices = await getInvoicesForOrder(orderId);
  const original = invoices.find((i) => i.type === "invoice");
  if (!original) return null;

  const { data: order } = await svc.from("order").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Objednávka nenalezena");
  const locale = safeLocale(order.locale);
  const [settings, shop] = await Promise.all([getInvoiceSettings(), getShopContact()]);
  const vatPayer = Boolean(shop.dic);

  const breakdown = (original.vat_breakdown as unknown as VatBreakdownRow[]) ?? [];
  const totals = vatPayer && breakdown.length > 0
    ? calcCreditNote(amount, breakdown, LABELS[locale].refund(original.number))
    : {
        lines: [
          {
            kind: "item",
            name: LABELS[locale].refund(original.number),
            sku: null,
            qty: 1,
            unit_price: amount,
            line_total: amount,
            vat_rate: 0,
            base: amount,
            vat: 0,
          } satisfies InvoiceLine,
        ],
        breakdown: [] as VatBreakdownRow[],
        subtotal: amount,
        vat_total: 0,
        total: amount,
      };

  const today = new Date();
  let exchangeRate: number | null = null;
  let vatTotalCzk: number | null = null;
  if (order.currency === "EUR" && vatPayer) {
    const cnb = await getCnbEurRate();
    if (cnb) {
      exchangeRate = cnb.rate;
      vatTotalCzk = Math.round(totals.vat_total * cnb.rate);
    }
  }

  const number = await nextNumber("credit_note", settings.creditPrefix);
  const { data: inv, error } = await svc
    .from("invoice")
    .insert({
      number,
      type: "credit_note",
      order_id: orderId,
      related_invoice_id: original.id,
      issued_at: today.toISOString().slice(0, 10),
      taxable_date: today.toISOString().slice(0, 10),
      due_date: null,
      paid_at: today.toISOString().slice(0, 10),
      currency: order.currency,
      subtotal: totals.subtotal,
      vat_total: totals.vat_total,
      total: totals.total,
      vat_breakdown: totals.breakdown as unknown as Json,
      exchange_rate: exchangeRate,
      vat_total_czk: vatTotalCzk,
      seller: original.seller,
      buyer: original.buyer,
      items: totals.lines as unknown as Json,
      payment_method: original.payment_method,
      variable_symbol: original.variable_symbol,
      note: [opts.reason, `${locale === "cs" ? "Objednávka" : locale === "de" ? "Bestellung" : "Order"} ${order.number}`]
        .filter(Boolean)
        .join("\n"),
      created_by: opts.author ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Dobropis se nepodařilo uložit: ${error.message}`);

  await logInvoiceEvent(orderId, inv, opts.author ?? null);
  return inv;
}

/** Označí fakturu jako uhrazenou (např. po připsání platby převodem). */
export async function markInvoicePaid(invoiceId: string, paidAt = new Date()): Promise<void> {
  await createServiceClient()
    .from("invoice")
    .update({ paid_at: paidAt.toISOString().slice(0, 10) })
    .eq("id", invoiceId)
    .is("paid_at", null);
}
