import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Locale } from "@/i18n/routing";
import { formatMoney, type InvoiceLine, type VatBreakdownRow } from "@/lib/invoices/calc";
import type { InvoiceParty, InvoiceRow } from "@/lib/invoices/issue";

/* ── Fonty (Liberation Sans — plná diakritika; standardní PDF fonty ji nemají) ─ */

const FONT_FILES = {
  regular: "LiberationSans-Regular.ttf",
  bold: "LiberationSans-Bold.ttf",
} as const;

const assetCache = new Map<string, Uint8Array>();

/** Načte soubor z public/ — ze souborového systému, s fallbackem na vlastní URL (serverless). */
async function loadPublicAsset(rel: string): Promise<Uint8Array> {
  const hit = assetCache.get(rel);
  if (hit) return hit;
  let bytes: Uint8Array | null = null;
  try {
    bytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", rel)));
  } catch {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://reptiplus.cz").replace(/\/+$/, "");
    const res = await fetch(`${base}/${rel}`);
    if (!res.ok) throw new Error(`Nelze načíst ${rel} (${res.status})`);
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  assetCache.set(rel, bytes);
  return bytes;
}

/* ── Texty ─────────────────────────────────────────────────────────────── */

const T = {
  cs: {
    invoice: "Faktura – daňový doklad",
    receipt: "Doklad o prodeji",
    creditNote: "Dobropis – opravný daňový doklad",
    number: "Číslo dokladu",
    issued: "Datum vystavení",
    taxable: "Datum zdanit. plnění",
    due: "Datum splatnosti",
    paid: "Uhrazeno",
    seller: "Dodavatel",
    buyer: "Odběratel",
    ico: "IČO",
    dic: "DIČ",
    nonPayer: "Dodavatel není plátcem DPH.",
    payment: "Platba",
    method: "Způsob platby",
    account: "Číslo účtu",
    iban: "IBAN",
    bic: "BIC / SWIFT",
    vs: "Variabilní symbol",
    toPay: "K úhradě",
    paidStamp: "UHRAZENO",
    refunded: "Vráceno",
    relatedInvoice: "K faktuře",
    item: "Položka",
    qty: "Množství",
    unit: "Cena/ks",
    vat: "DPH",
    lineTotal: "Celkem",
    rate: "Sazba",
    base: "Základ",
    vatAmount: "DPH",
    total: "Celkem s DPH",
    grandTotal: "Celkem k úhradě",
    grandTotalCredit: "Celkem k vrácení",
    vatCzk: (rate: string) => `DPH přepočtena kurzem ČNB ${rate} CZK/EUR`,
    page: (a: number, b: number) => `Strana ${a}/${b}`,
    note: "Poznámka",
  },
  en: {
    invoice: "Invoice – tax document",
    receipt: "Sales receipt",
    creditNote: "Credit note – corrective tax document",
    number: "Document number",
    issued: "Issue date",
    taxable: "Date of taxable supply",
    due: "Due date",
    paid: "Paid on",
    seller: "Supplier",
    buyer: "Customer",
    ico: "Company ID",
    dic: "VAT ID",
    nonPayer: "The supplier is not registered for VAT.",
    payment: "Payment",
    method: "Payment method",
    account: "Account number",
    iban: "IBAN",
    bic: "BIC / SWIFT",
    vs: "Payment reference",
    toPay: "Amount due",
    paidStamp: "PAID",
    refunded: "Refunded",
    relatedInvoice: "Relates to invoice",
    item: "Item",
    qty: "Qty",
    unit: "Unit price",
    vat: "VAT",
    lineTotal: "Total",
    rate: "Rate",
    base: "Net",
    vatAmount: "VAT",
    total: "Gross",
    grandTotal: "Total due",
    grandTotalCredit: "Total refunded",
    vatCzk: (rate: string) => `VAT converted at CNB rate ${rate} CZK/EUR`,
    page: (a: number, b: number) => `Page ${a}/${b}`,
    note: "Note",
  },
  de: {
    invoice: "Rechnung – Steuerbeleg",
    receipt: "Verkaufsbeleg",
    creditNote: "Gutschrift – Korrekturbeleg",
    number: "Belegnummer",
    issued: "Ausstellungsdatum",
    taxable: "Leistungsdatum",
    due: "Fälligkeitsdatum",
    paid: "Bezahlt am",
    seller: "Lieferant",
    buyer: "Kunde",
    ico: "Firmen-ID",
    dic: "USt-IdNr.",
    nonPayer: "Der Lieferant ist nicht umsatzsteuerpflichtig.",
    payment: "Zahlung",
    method: "Zahlungsart",
    account: "Kontonummer",
    iban: "IBAN",
    bic: "BIC / SWIFT",
    vs: "Verwendungszweck",
    toPay: "Zu zahlen",
    paidStamp: "BEZAHLT",
    refunded: "Erstattet",
    relatedInvoice: "Zur Rechnung",
    item: "Position",
    qty: "Menge",
    unit: "Einzelpreis",
    vat: "MwSt.",
    lineTotal: "Gesamt",
    rate: "Satz",
    base: "Netto",
    vatAmount: "MwSt.",
    total: "Brutto",
    grandTotal: "Gesamtbetrag",
    grandTotalCredit: "Erstattungsbetrag",
    vatCzk: (rate: string) => `MwSt. umgerechnet zum ČNB-Kurs ${rate} CZK/EUR`,
    page: (a: number, b: number) => `Seite ${a}/${b}`,
    note: "Hinweis",
  },
} as const;

type Copy = (typeof T)[keyof typeof T];

const INK = rgb(0.15, 0.14, 0.11);
const MUTED = rgb(0.45, 0.45, 0.42);
const LINE = rgb(0.85, 0.83, 0.78);
const BRAND = rgb(0.25, 0.42, 0.18);
const FILL = rgb(0.97, 0.96, 0.94);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 42;

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  pages: PDFPage[];
};

function fmtDate(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "cs-CZ", {
    dateStyle: "medium",
  }).format(d);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function draw(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; align?: "left" | "right" } = {},
) {
  const font = o.bold ? ctx.bold : ctx.font;
  const size = o.size ?? 9.5;
  const w = font.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, {
    x: o.align === "right" ? x - w : x,
    y,
    size,
    font,
    color: o.color ?? INK,
  });
}

function hr(ctx: Ctx, y: number, color = LINE, thickness = 0.6) {
  ctx.page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness, color });
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(ctx.page);
  ctx.y = PAGE_H - M;
}

function partyBlock(ctx: Ctx, title: string, p: InvoiceParty, x: number, y: number, t: Copy, width: number): number {
  draw(ctx, title.toUpperCase(), x, y, { size: 7.5, color: MUTED, bold: true });
  let yy = y - 14;
  const lines: { text: string; bold?: boolean; muted?: boolean }[] = [];
  lines.push({ text: p.name, bold: true });
  if (p.company) lines.push({ text: p.company });
  if (p.street) lines.push({ text: p.street });
  const cityLine = [p.postal_code, p.city].filter(Boolean).join(" ");
  if (cityLine || p.country) lines.push({ text: [cityLine, p.country].filter(Boolean).join(", ") });
  if (p.ico) lines.push({ text: `${t.ico}: ${p.ico}` });
  if (p.dic) lines.push({ text: `${t.dic}: ${p.dic}` });
  if (p.email) lines.push({ text: p.email, muted: true });
  if (p.phone) lines.push({ text: p.phone, muted: true });
  if (p.registration) lines.push({ text: p.registration, muted: true });
  for (const l of lines) {
    for (const seg of wrap(l.text, l.bold ? ctx.bold : ctx.font, 9.5, width)) {
      draw(ctx, seg, x, yy, { bold: l.bold, color: l.muted ? MUTED : INK });
      yy -= 12.5;
    }
  }
  return yy;
}

/** Vykreslí doklad (faktura / dobropis) do PDF. Vrací bajty PDF. */
export async function renderInvoicePdf(inv: InvoiceRow): Promise<Uint8Array> {
  const seller = inv.seller as unknown as InvoiceParty;
  const buyer = inv.buyer as unknown as InvoiceParty;
  const locale: Locale = buyer.locale === "en" || buyer.locale === "de" ? buyer.locale : "cs";
  const t: Copy = T[locale];
  const lines = inv.items as unknown as InvoiceLine[];
  const breakdown = (inv.vat_breakdown as unknown as VatBreakdownRow[]) ?? [];
  const vatPayer = breakdown.length > 0;
  const isCredit = inv.type === "credit_note";
  const money = (m: number) => formatMoney(m, inv.currency, locale);

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regBytes, boldBytes] = await Promise.all([
    loadPublicAsset(`fonts/${FONT_FILES.regular}`),
    loadPublicAsset(`fonts/${FONT_FILES.bold}`),
  ]);
  const font = await doc.embedFont(regBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  doc.setTitle(`${isCredit ? t.creditNote : t.invoice} ${inv.number}`);
  doc.setAuthor(seller.name);

  const ctx: Ctx = { doc, page: null as unknown as PDFPage, font, bold, y: 0, pages: [] };
  newPage(ctx);

  /* Hlavička */
  try {
    const logo = await doc.embedPng(await loadPublicAsset("logo-mark.png"));
    ctx.page.drawImage(logo, { x: M, y: ctx.y - 34, width: 34, height: 34 });
    draw(ctx, seller.name, M + 42, ctx.y - 22, { size: 15, bold: true });
  } catch {
    draw(ctx, seller.name, M, ctx.y - 22, { size: 15, bold: true });
  }
  const title = isCredit ? t.creditNote : vatPayer ? t.invoice : t.receipt;
  draw(ctx, title, PAGE_W - M, ctx.y - 12, { size: 13, bold: true, align: "right" });
  draw(ctx, inv.number, PAGE_W - M, ctx.y - 30, { size: 12, bold: true, align: "right", color: BRAND });
  ctx.y -= 52;
  hr(ctx, ctx.y, BRAND, 1.2);
  ctx.y -= 18;

  /* Data dokladu (vpravo) + strany (vlevo) */
  const metaRows: [string, string][] = [
    [t.issued, fmtDate(inv.issued_at, locale)],
    [t.taxable, fmtDate(inv.taxable_date, locale)],
  ];
  if (!isCredit) metaRows.push([t.due, fmtDate(inv.due_date, locale)]);
  if (inv.paid_at) metaRows.push([isCredit ? t.refunded : t.paid, fmtDate(inv.paid_at, locale)]);
  if (isCredit && inv.related_invoice_id) {
    const rel = (inv.note ?? "").match(/[A-Z]*\d{4}-\d{4}/)?.[0];
    if (rel) metaRows.push([t.relatedInvoice, rel]);
  }
  let my = ctx.y;
  for (const [k, v] of metaRows) {
    draw(ctx, k, PAGE_W - M - 150, my, { color: MUTED, size: 9 });
    draw(ctx, v, PAGE_W - M, my, { align: "right", bold: true, size: 9.5 });
    my -= 13;
  }

  const colW = 230;
  const ySeller = partyBlock(ctx, t.seller, seller, M, ctx.y, t, colW);
  const yBuyer = partyBlock(ctx, t.buyer, buyer, M + colW + 20, ctx.y - 0, t, 150);
  ctx.y = Math.min(ySeller, yBuyer, my) - 10;

  /* Platba */
  const payRows: [string, string][] = [];
  if (inv.payment_method) payRows.push([t.method, inv.payment_method]);
  if (!isCredit) {
    if (seller.bankAccount) payRows.push([t.account, seller.bankAccount]);
    if (seller.iban) payRows.push([t.iban, seller.iban]);
    if (seller.bic) payRows.push([t.bic, seller.bic]);
    if (inv.variable_symbol) payRows.push([t.vs, inv.variable_symbol]);
  }
  if (payRows.length) {
    const boxH = payRows.length * 13 + 22;
    ctx.page.drawRectangle({ x: M, y: ctx.y - boxH, width: PAGE_W - 2 * M, height: boxH, color: FILL, borderColor: LINE, borderWidth: 0.6 });
    draw(ctx, t.payment.toUpperCase(), M + 12, ctx.y - 14, { size: 7.5, color: MUTED, bold: true });
    let py = ctx.y - 28;
    for (const [k, v] of payRows) {
      draw(ctx, k, M + 12, py, { color: MUTED, size: 9 });
      draw(ctx, v, M + 130, py, { bold: true, size: 9.5 });
      py -= 13;
    }
    if (!isCredit && !inv.paid_at) {
      draw(ctx, t.toPay, PAGE_W - M - 12 - ctx.bold.widthOfTextAtSize(money(inv.total), 13) - 10, ctx.y - 30, { color: MUTED, size: 9, align: "right" });
      draw(ctx, money(inv.total), PAGE_W - M - 12, ctx.y - 30, { bold: true, size: 13, align: "right", color: BRAND });
    } else if (!isCredit) {
      draw(ctx, t.paidStamp, PAGE_W - M - 12, ctx.y - 30, { bold: true, size: 12, align: "right", color: BRAND });
    }
    ctx.y -= boxH + 18;
  }

  /* Tabulka položek */
  const cols = { name: M, qty: 350, unit: 425, vat: 462, total: PAGE_W - M };
  const nameW = cols.qty - M - 30;
  const header = () => {
    ctx.page.drawRectangle({ x: M, y: ctx.y - 16, width: PAGE_W - 2 * M, height: 18, color: FILL });
    draw(ctx, t.item.toUpperCase(), cols.name + 6, ctx.y - 11, { size: 7.5, color: MUTED, bold: true });
    draw(ctx, t.qty.toUpperCase(), cols.qty, ctx.y - 11, { size: 7.5, color: MUTED, bold: true, align: "right" });
    draw(ctx, t.unit.toUpperCase(), cols.unit, ctx.y - 11, { size: 7.5, color: MUTED, bold: true, align: "right" });
    if (vatPayer) draw(ctx, t.vat.toUpperCase(), cols.vat, ctx.y - 11, { size: 7.5, color: MUTED, bold: true, align: "right" });
    draw(ctx, t.lineTotal.toUpperCase(), cols.total - 6, ctx.y - 11, { size: 7.5, color: MUTED, bold: true, align: "right" });
    ctx.y -= 24;
  };
  header();
  for (const l of lines) {
    const nameLines = wrap(l.name, ctx.font, 9.5, nameW);
    const rowH = Math.max(1, nameLines.length) * 12 + (l.sku ? 11 : 0) + 6;
    if (ctx.y - rowH < M + 60) {
      newPage(ctx);
      header();
    }
    let ny = ctx.y - 8;
    for (const seg of nameLines) {
      draw(ctx, seg, cols.name + 6, ny, { color: l.kind === "discount" ? BRAND : INK });
      ny -= 12;
    }
    if (l.sku) draw(ctx, l.sku, cols.name + 6, ny, { size: 8, color: MUTED });
    draw(ctx, `${l.qty} ${locale === "cs" ? "ks" : locale === "de" ? "Stk" : "pcs"}`, cols.qty, ctx.y - 8, { align: "right" });
    draw(ctx, money(l.unit_price), cols.unit, ctx.y - 8, { align: "right" });
    if (vatPayer) draw(ctx, `${l.vat_rate} %`, cols.vat, ctx.y - 8, { align: "right", color: MUTED });
    draw(ctx, money(l.line_total), cols.total - 6, ctx.y - 8, { align: "right", bold: true });
    ctx.y -= rowH;
    hr(ctx, ctx.y + 2);
  }

  /* Rozpis DPH + součty */
  const sumBlockH = (vatPayer ? (breakdown.length + 1) * 13 + 12 : 0) + 40 + (inv.exchange_rate ? 14 : 0);
  if (ctx.y - sumBlockH < M + 50) newPage(ctx);
  ctx.y -= 10;
  const sx = { rate: 300, base: 385, vat: 465, total: PAGE_W - M - 6 };
  if (vatPayer) {
    draw(ctx, t.rate.toUpperCase(), sx.rate, ctx.y, { size: 7.5, color: MUTED, bold: true });
    draw(ctx, t.base.toUpperCase(), sx.base, ctx.y, { size: 7.5, color: MUTED, bold: true, align: "right" });
    draw(ctx, t.vatAmount.toUpperCase(), sx.vat, ctx.y, { size: 7.5, color: MUTED, bold: true, align: "right" });
    draw(ctx, t.total.toUpperCase(), sx.total, ctx.y, { size: 7.5, color: MUTED, bold: true, align: "right" });
    ctx.y -= 13;
    for (const r of breakdown) {
      draw(ctx, `${r.rate} %`, sx.rate, ctx.y, { size: 9 });
      draw(ctx, money(r.base), sx.base, ctx.y, { size: 9, align: "right" });
      draw(ctx, money(r.vat), sx.vat, ctx.y, { size: 9, align: "right" });
      draw(ctx, money(r.total), sx.total, ctx.y, { size: 9, align: "right" });
      ctx.y -= 13;
    }
    ctx.page.drawLine({ start: { x: sx.rate, y: ctx.y + 6 }, end: { x: PAGE_W - M, y: ctx.y + 6 }, thickness: 0.6, color: LINE });
    draw(ctx, "", sx.rate, ctx.y);
    draw(ctx, money(inv.subtotal), sx.base, ctx.y - 2, { size: 9, align: "right", bold: true });
    draw(ctx, money(inv.vat_total), sx.vat, ctx.y - 2, { size: 9, align: "right", bold: true });
    ctx.y -= 16;
  }
  ctx.page.drawRectangle({ x: sx.rate - 10, y: ctx.y - 14, width: PAGE_W - M - sx.rate + 10, height: 26, color: FILL });
  draw(ctx, isCredit ? t.grandTotalCredit : t.grandTotal, sx.rate, ctx.y - 5, { bold: true, size: 10.5 });
  draw(ctx, money(inv.total), sx.total, ctx.y - 5, { bold: true, size: 13, align: "right", color: BRAND });
  ctx.y -= 30;
  if (inv.exchange_rate && inv.vat_total_czk !== null) {
    draw(
      ctx,
      `${t.vatCzk(String(inv.exchange_rate).replace(".", ","))}: ${formatMoney(inv.vat_total_czk, "CZK", locale)}`,
      sx.total,
      ctx.y,
      { size: 8, color: MUTED, align: "right" },
    );
    ctx.y -= 14;
  }

  /* Poznámky */
  const notes: string[] = [];
  if (!vatPayer) notes.push(t.nonPayer);
  if (inv.note) notes.push(...inv.note.split("\n").filter(Boolean));
  if (notes.length) {
    ctx.y -= 10;
    if (ctx.y - notes.length * 12 < M + 30) newPage(ctx);
    draw(ctx, t.note.toUpperCase(), M, ctx.y, { size: 7.5, color: MUTED, bold: true });
    ctx.y -= 13;
    for (const n of notes) {
      for (const seg of wrap(n, ctx.font, 8.5, PAGE_W - 2 * M)) {
        draw(ctx, seg, M, ctx.y, { size: 8.5, color: MUTED });
        ctx.y -= 11.5;
      }
    }
  }

  /* Patička na každé straně */
  ctx.pages.forEach((p, i) => {
    ctx.page = p;
    ctx.page.drawLine({ start: { x: M, y: M - 6 }, end: { x: PAGE_W - M, y: M - 6 }, thickness: 0.6, color: LINE });
    const footer = [seller.name, seller.street, seller.ico ? `${t.ico} ${seller.ico}` : null, seller.dic ? `${t.dic} ${seller.dic}` : null, seller.email]
      .filter(Boolean)
      .join(" · ");
    draw(ctx, footer, M, M - 18, { size: 7.5, color: MUTED });
    draw(ctx, t.page(i + 1, ctx.pages.length), PAGE_W - M, M - 18, { size: 7.5, color: MUTED, align: "right" });
  });

  return doc.save();
}

/** Název souboru PDF pro přílohu / download. */
export function invoiceFileName(inv: InvoiceRow): string {
  const kind = inv.type === "credit_note" ? "dobropis" : "faktura";
  return `${kind}-${inv.number}.pdf`;
}
