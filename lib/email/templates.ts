import "server-only";
import { formatPrice } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";

/* ── Sdílené ───────────────────────────────────────────────────────────── */

const BRAND = "#3f6a2e";
const INK = "#26231d";
const MUTED = "#8a897f";
const BORDER = "#e7e3d8";
const CREAM = "#f7f5ef";
// Bílá varianta loga (PNG kvůli kompatibilitě e-mailových klientů) na canonical doméně.
const LOGO_URL = "https://reptiplus.cz/logo-email.png";

const FOOTER: Record<Locale, string> = {
  cs: "Reptiplus — specializovaná teraristika",
  en: "Reptiplus — specialist terrarium shop",
  de: "Reptiplus — Fachgeschäft für Terraristik",
};

function layout(inner: string, preheader: string): string {
  return `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:${INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
<tr><td style="background:#ffffff;padding:18px 28px;border-bottom:1px solid ${BORDER};">
<img src="${LOGO_URL}" alt="Reptiplus" width="180" height="59" style="display:block;width:180px;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;" />
</td></tr>
${inner}
</table>
</td></tr>
</table>
</body></html>`;
}

function footerRow(locale: Locale): string {
  return `<tr><td style="padding:18px 28px;background:${CREAM};border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;">${FOOTER[locale] ?? FOOTER.cs} · reptiplus.cz</td></tr>`;
}

function button(href: string, label: string, secondary = false): string {
  return secondary
    ? `<a href="${href}" style="display:inline-block;color:${BRAND};text-decoration:none;font-weight:bold;font-size:14px;padding:12px 6px;">${escapeHtml(label)}</a>`
    : `<a href="${href}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:8px;">${escapeHtml(label)}</a>`;
}

function infoBox(html: string): string {
  return `<div style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;padding:12px 16px;font-size:14px;line-height:1.55;">${html}</div>`;
}

function kvRows(rows: [string, string][]): string {
  return rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 14px 3px 0;color:${MUTED};font-size:14px;white-space:nowrap;">${escapeHtml(k)}</td><td style="padding:3px 0;font-size:14px;"><strong>${escapeHtml(v)}</strong></td></tr>`,
    )
    .join("");
}

function money(m: number, locale: Locale) {
  return formatPrice(m, locale);
}

/**
 * Prostý text → HTML: odstavce oddělené prázdným řádkem, řádky začínající
 * „– " / „- " / „• " jako odrážky. Používají zprávy psané v adminu.
 */
export function plainTextToHtml(body: string): { html: string; paragraphs: string[] } {
  const paragraphs = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const html = paragraphs
    .map((p) => {
      const lines = p.split("\n");
      const isList = lines.every((l) => /^[–\-•]\s/.test(l));
      if (isList) {
        const lis = lines
          .map((l) => `<li style="margin:0 0 4px;">${escapeHtml(l.replace(/^[–\-•]\s/, ""))}</li>`)
          .join("");
        return `<ul style="margin:0 0 14px;padding-left:20px;font-size:14px;line-height:1.55;">${lis}</ul>`;
      }
      return `<p style="margin:0 0 14px;font-size:14px;line-height:1.55;">${lines.map(escapeHtml).join("<br />")}</p>`;
    })
    .join("");
  return { html, paragraphs };
}

/* ── Objednávka — potvrzení ────────────────────────────────────────────── */

export type OrderAddress = {
  full_name?: string;
  company?: string;
  ico?: string;
  dic?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
} | null;

export type OrderEmailData = {
  number: string;
  email: string;
  items: { name: string; qty: number; lineTotal: number }[];
  subtotal: number;
  shipping: number;
  paymentFee: number;
  discount: number;
  total: number;
  currency: "CZK" | "EUR";
  paymentMethod: string; // kód: cod | bank | card …
  paymentMethodLabel?: string | null;
  shippingMethodLabel?: string | null;
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress;
  note?: string | null;
  /** Bankovní spojení obchodu (pro platbu převodem). */
  bank?: { account?: string; iban?: string; bic?: string; variableSymbol: string } | null;
  orderUrl: string;
  adminUrl?: string;
  locale: Locale;
};

const COPY = {
  cs: {
    subject: (n: string) => `Potvrzení objednávky ${n} — Reptiplus`,
    preheader: "Děkujeme za vaši objednávku.",
    thanks: "Děkujeme za objednávku!",
    intro: "Vaši objednávku jsme přijali. Níže najdete její shrnutí.",
    orderNo: "Číslo objednávky",
    qty: "ks",
    subtotal: "Mezisoučet",
    shipping: "Doprava",
    paymentFee: "Poplatek za platbu",
    discount: "Sleva",
    total: "Celkem",
    delivery: "Doručovací adresa",
    billing: "Fakturační adresa",
    shippingMethod: "Doprava",
    paymentMethod: "Platba",
    note: "Vaše poznámka",
    payTitle: "Platba",
    payCod: "Dobírka — částku uhradíte při převzetí zásilky.",
    payBank: "Prosíme o úhradu převodem na náš účet. Objednávku expedujeme po připsání platby.",
    payBankNoDetails: "Bankovní převod — platební údaje vám zašleme samostatně.",
    payCard: "Platba kartou proběhla online. Jakmile bránu potvrdíme, začneme objednávku připravovat.",
    payOther: "Pokyny k platbě vám zašleme e-mailem.",
    account: "Číslo účtu",
    iban: "IBAN",
    bic: "BIC / SWIFT",
    vs: "Variabilní symbol",
    amount: "Částka",
    message: "Zpráva pro příjemce",
    viewOrder: "Zobrazit objednávku",
    reply: "Máte dotaz? Stačí odpovědět na tento e-mail.",
  },
  en: {
    subject: (n: string) => `Order confirmation ${n} — Reptiplus`,
    preheader: "Thank you for your order.",
    thanks: "Thank you for your order!",
    intro: "We've received your order. Here's a summary below.",
    orderNo: "Order number",
    qty: "pcs",
    subtotal: "Subtotal",
    shipping: "Shipping",
    paymentFee: "Payment fee",
    discount: "Discount",
    total: "Total",
    delivery: "Delivery address",
    billing: "Billing address",
    shippingMethod: "Shipping",
    paymentMethod: "Payment",
    note: "Your note",
    payTitle: "Payment",
    payCod: "Cash on delivery — you'll pay when the parcel is delivered.",
    payBank: "Please pay by bank transfer to our account. We ship once the payment arrives.",
    payBankNoDetails: "Bank transfer — we'll send you the payment details separately.",
    payCard: "Your card payment was made online. We'll start preparing the order as soon as the gateway confirms it.",
    payOther: "We'll email you the payment instructions.",
    account: "Account number",
    iban: "IBAN",
    bic: "BIC / SWIFT",
    vs: "Payment reference",
    amount: "Amount",
    message: "Message for recipient",
    viewOrder: "View order",
    reply: "Any questions? Just reply to this e-mail.",
  },
  de: {
    subject: (n: string) => `Bestellbestätigung ${n} — Reptiplus`,
    preheader: "Vielen Dank für Ihre Bestellung.",
    thanks: "Vielen Dank für Ihre Bestellung!",
    intro: "Wir haben Ihre Bestellung erhalten. Nachfolgend die Zusammenfassung.",
    orderNo: "Bestellnummer",
    qty: "Stk",
    subtotal: "Zwischensumme",
    shipping: "Versand",
    paymentFee: "Zahlungsgebühr",
    discount: "Rabatt",
    total: "Gesamt",
    delivery: "Lieferadresse",
    billing: "Rechnungsadresse",
    shippingMethod: "Versand",
    paymentMethod: "Zahlung",
    note: "Ihre Anmerkung",
    payTitle: "Zahlung",
    payCod: "Nachnahme — Sie zahlen bei der Zustellung.",
    payBank: "Bitte überweisen Sie den Betrag auf unser Konto. Wir versenden nach Zahlungseingang.",
    payBankNoDetails: "Banküberweisung — die Zahlungsdaten senden wir separat.",
    payCard: "Ihre Kartenzahlung erfolgte online. Sobald das Zahlungsportal sie bestätigt, bereiten wir die Bestellung vor.",
    payOther: "Die Zahlungsanweisungen senden wir per E-Mail.",
    account: "Kontonummer",
    iban: "IBAN",
    bic: "BIC / SWIFT",
    vs: "Verwendungszweck",
    amount: "Betrag",
    message: "Nachricht an den Empfänger",
    viewOrder: "Bestellung ansehen",
    reply: "Haben Sie Fragen? Antworten Sie einfach auf diese E-Mail.",
  },
} as const;

type OrderCopy = (typeof COPY)[keyof typeof COPY];

const isBank = (code: string) => code === "bank" || code === "bank_transfer";

function addressHtml(a: OrderAddress): string {
  if (!a) return "";
  const lines = [
    a.full_name,
    a.company,
    [a.ico ? `IČO ${a.ico}` : null, a.dic ? `DIČ ${a.dic}` : null].filter(Boolean).join(" · ") || null,
    a.street,
    [a.postal_code, a.city].filter(Boolean).join(" ") + (a.country ? `, ${a.country}` : ""),
    a.phone,
  ].filter((x) => x && x.trim());
  return `<p style="margin:6px 0 0;font-size:14px;line-height:1.5;">${lines.map((l) => escapeHtml(String(l))).join("<br>")}</p>`;
}

function addressText(a: OrderAddress): string {
  if (!a) return "";
  return [a.full_name, a.company, a.ico ? `IČO ${a.ico}` : null, a.dic ? `DIČ ${a.dic}` : null, a.street, [a.postal_code, a.city].filter(Boolean).join(" "), a.country, a.phone]
    .filter((x) => x && String(x).trim())
    .join(", ");
}

function sectionLabel(text: string): string {
  return `<p style="margin:22px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};">${escapeHtml(text)}</p>`;
}

/** Blok s platebními instrukcemi (převod = tabulka s údaji). */
function paymentBlock(d: OrderEmailData, c: OrderCopy): { html: string; text: string[] } {
  if (d.paymentMethod === "cod") return { html: infoBox(escapeHtml(c.payCod)), text: [c.payCod] };
  if (isBank(d.paymentMethod)) {
    if (!d.bank || (!d.bank.account && !d.bank.iban)) {
      return { html: infoBox(escapeHtml(c.payBankNoDetails)), text: [c.payBankNoDetails] };
    }
    const rows: [string, string][] = [];
    if (d.bank.account) rows.push([c.account, d.bank.account]);
    if (d.bank.iban) rows.push([c.iban, d.bank.iban]);
    if (d.bank.bic) rows.push([c.bic, d.bank.bic]);
    rows.push([c.vs, d.bank.variableSymbol]);
    rows.push([c.amount, money(d.total, d.locale)]);
    rows.push([c.message, d.number]);
    return {
      html: infoBox(
        `<p style="margin:0 0 8px;">${escapeHtml(c.payBank)}</p><table role="presentation" cellpadding="0" cellspacing="0">${kvRows(rows)}</table>`,
      ),
      text: [c.payBank, ...rows.map(([k, v]) => `${k}: ${v}`)],
    };
  }
  if (d.paymentMethod === "card" || d.paymentMethod === "comgate") {
    return { html: infoBox(escapeHtml(c.payCard)), text: [c.payCard] };
  }
  return { html: infoBox(escapeHtml(c.payOther)), text: [c.payOther] };
}

function itemsTable(d: OrderEmailData, c: OrderCopy): string {
  const rows = d.items
    .map(
      (it) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;">${escapeHtml(it.name)} <span style="color:${MUTED};white-space:nowrap;">× ${it.qty} ${c.qty}</span></td>
<td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;text-align:right;white-space:nowrap;">${money(it.lineTotal, d.locale)}</td>
</tr>`,
    )
    .join("");
  const sum = (label: string, value: string, opts: { strong?: boolean; color?: string } = {}) =>
    `<tr><td style="padding:${opts.strong ? "10px 0 0" : "2px 0"};${opts.strong ? `border-top:2px solid ${BORDER};` : ""}font-size:${opts.strong ? 16 : 14}px;${opts.strong ? "font-weight:bold;" : `color:${opts.color ?? MUTED};`}">${escapeHtml(label)}</td><td style="padding:${opts.strong ? "10px 0 0" : "2px 0"};${opts.strong ? `border-top:2px solid ${BORDER};` : ""}text-align:right;font-size:${opts.strong ? 16 : 14}px;${opts.strong ? "font-weight:bold;" : opts.color ? `color:${opts.color};` : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
${rows}
${sum(c.subtotal, money(d.subtotal, d.locale))}
${sum(d.shippingMethodLabel ? `${c.shipping} — ${d.shippingMethodLabel}` : c.shipping, money(d.shipping, d.locale))}
${d.paymentFee > 0 ? sum(d.paymentMethodLabel ? `${c.paymentFee} — ${d.paymentMethodLabel}` : c.paymentFee, money(d.paymentFee, d.locale)) : ""}
${d.discount > 0 ? sum(c.discount, `− ${money(d.discount, d.locale)}`, { color: BRAND }) : ""}
${sum(c.total, money(d.total, d.locale), { strong: true })}
</table>`;
}

/** Potvrzení objednávky pro zákazníka. */
export function orderConfirmationEmail(d: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const c: OrderCopy = COPY[d.locale] ?? COPY.cs;
  const pay = paymentBlock(d, c);
  const meta: [string, string][] = [];
  if (d.shippingMethodLabel) meta.push([c.shippingMethod, d.shippingMethodLabel]);
  if (d.paymentMethodLabel) meta.push([c.paymentMethod, d.paymentMethodLabel]);

  const sameAddress = !d.billingAddress || addressText(d.billingAddress) === addressText(d.shippingAddress);

  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 6px;font-size:22px;color:${INK};">${c.thanks}</h1>
<p style="margin:0 0 4px;font-size:14px;color:${MUTED};">${c.intro}</p>
<p style="margin:14px 0 20px;font-size:14px;">${c.orderNo}: <strong style="font-family:monospace;">${escapeHtml(d.number)}</strong></p>
${pay.html}
${itemsTable(d, c)}
${meta.length ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;">${kvRows(meta)}</table>` : ""}
${sectionLabel(c.delivery)}
${addressHtml(d.shippingAddress)}
${!sameAddress ? `${sectionLabel(c.billing)}${addressHtml(d.billingAddress ?? null)}` : ""}
${d.note ? `${sectionLabel(c.note)}<p style="margin:0;font-size:14px;line-height:1.5;white-space:pre-line;">${escapeHtml(d.note)}</p>` : ""}
<div style="margin-top:26px;">${button(d.orderUrl, c.viewOrder)}</div>
<p style="margin:22px 0 0;font-size:13px;color:${MUTED};">${c.reply}</p>
</td></tr>
${footerRow(d.locale)}`;

  const text = [
    c.thanks,
    `${c.orderNo}: ${d.number}`,
    "",
    ...pay.text,
    "",
    ...d.items.map((it) => `${it.name} × ${it.qty} ${c.qty} — ${money(it.lineTotal, d.locale)}`),
    `${c.subtotal}: ${money(d.subtotal, d.locale)}`,
    `${c.shipping}${d.shippingMethodLabel ? ` (${d.shippingMethodLabel})` : ""}: ${money(d.shipping, d.locale)}`,
    ...(d.paymentFee > 0 ? [`${c.paymentFee}: ${money(d.paymentFee, d.locale)}`] : []),
    ...(d.discount > 0 ? [`${c.discount}: −${money(d.discount, d.locale)}`] : []),
    `${c.total}: ${money(d.total, d.locale)}`,
    "",
    `${c.delivery}: ${addressText(d.shippingAddress)}`,
    ...(!sameAddress ? [`${c.billing}: ${addressText(d.billingAddress ?? null)}`] : []),
    ...(d.note ? ["", `${c.note}: ${d.note}`] : []),
    "",
    `${c.viewOrder}: ${d.orderUrl}`,
    c.reply,
  ].join("\n");

  return { subject: c.subject(d.number), html: layout(inner, c.preheader), text };
}

/** Notifikace do obchodu o nové objednávce (česky, se vším podstatným pro vyřízení). */
export function newOrderNotificationEmail(d: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const rows = d.items
    .map((it) => `<li>${escapeHtml(it.name)} × ${it.qty} — ${money(it.lineTotal, d.locale)}</li>`)
    .join("");
  const meta: [string, string][] = [
    ["Zákazník", d.email],
    ["Platba", `${d.paymentMethodLabel ?? d.paymentMethod}${d.paymentFee > 0 ? ` (+${money(d.paymentFee, d.locale)})` : ""}`],
    ["Doprava", `${d.shippingMethodLabel ?? "—"} (${money(d.shipping, d.locale)})`],
    ["Jazyk", d.locale.toUpperCase()],
  ];
  if (d.shippingAddress?.phone) meta.push(["Telefon", d.shippingAddress.phone]);
  if (d.discount > 0) meta.push(["Sleva", `−${money(d.discount, d.locale)}`]);

  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 10px;font-size:20px;">Nová objednávka ${escapeHtml(d.number)}</h1>
<p style="margin:0 0 14px;font-size:18px;"><strong>${money(d.total, d.locale)}</strong></p>
<table role="presentation" cellpadding="0" cellspacing="0">${kvRows(meta)}</table>
<ul style="font-size:14px;padding-left:18px;margin:16px 0;">${rows}</ul>
${sectionLabel("Doručení")}${addressHtml(d.shippingAddress)}
${d.billingAddress && addressText(d.billingAddress) !== addressText(d.shippingAddress) ? `${sectionLabel("Fakturace")}${addressHtml(d.billingAddress)}` : ""}
${d.note ? `${sectionLabel("Poznámka zákazníka")}<p style="margin:0;font-size:14px;white-space:pre-line;">${escapeHtml(d.note)}</p>` : ""}
<div style="margin-top:22px;">${d.adminUrl ? button(d.adminUrl, "Otevřít v adminu") : ""} ${button(d.orderUrl, "Stránka objednávky", true)}</div>
</td></tr>`;
  const text = [
    `Nová objednávka ${d.number} — ${money(d.total, d.locale)}`,
    ...meta.map(([k, v]) => `${k}: ${v}`),
    "",
    ...d.items.map((it) => `${it.name} × ${it.qty} — ${money(it.lineTotal, d.locale)}`),
    "",
    `Doručení: ${addressText(d.shippingAddress)}`,
    ...(d.note ? [`Poznámka: ${d.note}`] : []),
    ...(d.adminUrl ? [`Admin: ${d.adminUrl}`] : []),
  ].join("\n");
  return {
    subject: `Nová objednávka ${d.number} — ${money(d.total, d.locale)}`,
    html: layout(inner, `Nová objednávka ${d.number}`),
    text,
  };
}

/* ── E-mail o změně stavu objednávky ───────────────────────────────────── */

export type NotifiableStatus = "paid" | "processing" | "shipped" | "delivered" | "cancelled";
export const NOTIFIABLE_STATUSES: NotifiableStatus[] = ["paid", "processing", "shipped", "delivered", "cancelled"];

const STATUS_COPY = {
  cs: {
    orderNo: "Číslo objednávky",
    trackingLabel: "Sledovací číslo",
    carrierLabel: "Dopravce",
    track: "Sledovat zásilku",
    viewOrder: "Zobrazit objednávku",
    invoiceAttached: "Fakturu (daňový doklad) najdete v příloze tohoto e-mailu.",
    reply: "Máte dotaz? Stačí odpovědět na tento e-mail.",
    s: {
      paid: {
        subject: (n: string) => `Platba za objednávku ${n} přijata — Reptiplus`,
        title: "Platbu jsme přijali",
        body: "Děkujeme, vaše platba dorazila. Objednávku teď připravíme k expedici a dáme vám vědět, jakmile ji předáme dopravci.",
      },
      processing: {
        subject: (n: string) => `Objednávka ${n} se zpracovává — Reptiplus`,
        title: "Vaše objednávka se zpracovává",
        body: "Pustili jsme se do přípravy vaší objednávky. Jakmile ji předáme dopravci, dáme vám vědět.",
      },
      shipped: {
        subject: (n: string) => `Objednávka ${n} byla odeslána — Reptiplus`,
        title: "Zásilka je na cestě",
        body: "Vaši objednávku jsme právě předali dopravci. Stav zásilky můžete sledovat přes odkaz níže.",
      },
      delivered: {
        subject: (n: string) => `Objednávka ${n} byla doručena — Reptiplus`,
        title: "Objednávka doručena",
        body: "Vaše zásilka byla doručena. Doufáme, že je vše v pořádku a vaši svěřenci budou spokojení!",
      },
      cancelled: {
        subject: (n: string) => `Objednávka ${n} byla stornována — Reptiplus`,
        title: "Objednávka stornována",
        body: "Vaši objednávku jsme stornovali. Pokud jste již platili, peníze vám vrátíme stejnou cestou a pošleme dobropis.",
      },
    },
  },
  en: {
    orderNo: "Order number",
    trackingLabel: "Tracking number",
    carrierLabel: "Carrier",
    track: "Track parcel",
    viewOrder: "View order",
    invoiceAttached: "Your invoice is attached to this e-mail.",
    reply: "Any questions? Just reply to this e-mail.",
    s: {
      paid: {
        subject: (n: string) => `Payment for order ${n} received — Reptiplus`,
        title: "Payment received",
        body: "Thank you, your payment has arrived. We'll now prepare your order for dispatch and let you know once it's handed to the carrier.",
      },
      processing: {
        subject: (n: string) => `Order ${n} is being processed — Reptiplus`,
        title: "Your order is being processed",
        body: "We've started preparing your order. We'll let you know as soon as it's handed to the carrier.",
      },
      shipped: {
        subject: (n: string) => `Order ${n} has shipped — Reptiplus`,
        title: "Your parcel is on its way",
        body: "We've just handed your order to the carrier. You can follow the parcel using the link below.",
      },
      delivered: {
        subject: (n: string) => `Order ${n} has been delivered — Reptiplus`,
        title: "Order delivered",
        body: "Your parcel has been delivered. We hope everything arrived in perfect condition!",
      },
      cancelled: {
        subject: (n: string) => `Order ${n} has been cancelled — Reptiplus`,
        title: "Order cancelled",
        body: "Your order has been cancelled. If you already paid, we'll refund you the same way and send a credit note.",
      },
    },
  },
  de: {
    orderNo: "Bestellnummer",
    trackingLabel: "Sendungsnummer",
    carrierLabel: "Versanddienstleister",
    track: "Sendung verfolgen",
    viewOrder: "Bestellung ansehen",
    invoiceAttached: "Ihre Rechnung finden Sie im Anhang dieser E-Mail.",
    reply: "Haben Sie Fragen? Antworten Sie einfach auf diese E-Mail.",
    s: {
      paid: {
        subject: (n: string) => `Zahlung für Bestellung ${n} eingegangen — Reptiplus`,
        title: "Zahlung eingegangen",
        body: "Vielen Dank, Ihre Zahlung ist eingegangen. Wir bereiten Ihre Bestellung nun für den Versand vor und melden uns, sobald sie an den Versanddienstleister übergeben wird.",
      },
      processing: {
        subject: (n: string) => `Bestellung ${n} wird bearbeitet — Reptiplus`,
        title: "Ihre Bestellung wird bearbeitet",
        body: "Wir haben mit der Vorbereitung Ihrer Bestellung begonnen. Sobald sie an den Versanddienstleister übergeben wird, informieren wir Sie.",
      },
      shipped: {
        subject: (n: string) => `Bestellung ${n} wurde versandt — Reptiplus`,
        title: "Ihr Paket ist unterwegs",
        body: "Wir haben Ihre Bestellung soeben an den Versanddienstleister übergeben. Über den Link unten können Sie die Sendung verfolgen.",
      },
      delivered: {
        subject: (n: string) => `Bestellung ${n} wurde zugestellt — Reptiplus`,
        title: "Bestellung zugestellt",
        body: "Ihr Paket wurde zugestellt. Wir hoffen, alles ist einwandfrei angekommen!",
      },
      cancelled: {
        subject: (n: string) => `Bestellung ${n} wurde storniert — Reptiplus`,
        title: "Bestellung storniert",
        body: "Ihre Bestellung wurde storniert. Falls Sie bereits bezahlt haben, erstatten wir den Betrag auf demselben Weg und senden eine Gutschrift.",
      },
    },
  },
} as const;

/** E-mail zákazníkovi o změně stavu. Vrací null, pokud stav není notifikovatelný. */
export function orderStatusEmail(d: {
  number: string;
  status: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrierLabel?: string | null;
  invoiceAttached?: boolean;
  orderUrl: string;
  locale: Locale;
}): { subject: string; html: string; text: string } | null {
  if (!NOTIFIABLE_STATUSES.includes(d.status as NotifiableStatus)) return null;
  const t = STATUS_COPY[d.locale] ?? STATUS_COPY.cs;
  const c = t.s[d.status as NotifiableStatus];

  const trackRows: [string, string][] = [];
  if (d.status === "shipped") {
    if (d.carrierLabel) trackRows.push([t.carrierLabel, d.carrierLabel]);
    if (d.trackingNumber) trackRows.push([t.trackingLabel, d.trackingNumber]);
  }
  const trackBox = trackRows.length
    ? `<div style="margin-top:18px;">${infoBox(`<table role="presentation" cellpadding="0" cellspacing="0">${kvRows(trackRows)}</table>`)}</div>`
    : "";

  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 8px;font-size:22px;color:${INK};">${c.title}</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${INK};">${c.body}</p>
<p style="margin:0;font-size:14px;">${t.orderNo}: <strong style="font-family:monospace;">${escapeHtml(d.number)}</strong></p>
${trackBox}
${d.invoiceAttached ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;">${t.invoiceAttached}</p>` : ""}
<div style="margin-top:26px;">
${d.status === "shipped" && d.trackingUrl ? `${button(d.trackingUrl, t.track)}&nbsp;&nbsp;${button(d.orderUrl, t.viewOrder, true)}` : button(d.orderUrl, t.viewOrder)}
</div>
<p style="margin:22px 0 0;font-size:13px;color:${MUTED};">${t.reply}</p>
</td></tr>
${footerRow(d.locale)}`;

  const text = [
    c.title,
    c.body,
    `${t.orderNo}: ${d.number}`,
    ...trackRows.map(([k, v]) => `${k}: ${v}`),
    ...(d.status === "shipped" && d.trackingUrl ? [`${t.track}: ${d.trackingUrl}`] : []),
    ...(d.invoiceAttached ? [t.invoiceAttached] : []),
    `${t.viewOrder}: ${d.orderUrl}`,
  ].join("\n");

  return { subject: c.subject(d.number), html: layout(inner, c.title), text };
}

/* ── Vrácení peněz ─────────────────────────────────────────────────────── */

const REFUND_COPY = {
  cs: {
    subject: (n: string) => `Vrácení platby k objednávce ${n} — Reptiplus`,
    title: "Vracíme vám peníze",
    body: (partial: boolean) =>
      partial
        ? "K vaší objednávce jsme vrátili část platby. Peníze odešly stejnou cestou, jakou jste platili; podle banky se připíší do 3–10 pracovních dnů."
        : "Vrátili jsme vám celou platbu za objednávku. Peníze odešly stejnou cestou, jakou jste platili; podle banky se připíší do 3–10 pracovních dnů.",
    amount: "Vrácená částka",
    orderNo: "Číslo objednávky",
    creditNote: "Dobropis",
    attached: "Dobropis (opravný daňový doklad) najdete v příloze.",
    viewOrder: "Zobrazit objednávku",
    reply: "Máte dotaz? Stačí odpovědět na tento e-mail.",
  },
  en: {
    subject: (n: string) => `Refund for order ${n} — Reptiplus`,
    title: "We've refunded you",
    body: (partial: boolean) =>
      partial
        ? "We've refunded part of your payment for this order. The money goes back the same way you paid; depending on your bank it arrives within 3–10 business days."
        : "We've refunded the full payment for your order. The money goes back the same way you paid; depending on your bank it arrives within 3–10 business days.",
    amount: "Refunded amount",
    orderNo: "Order number",
    creditNote: "Credit note",
    attached: "The credit note is attached to this e-mail.",
    viewOrder: "View order",
    reply: "Any questions? Just reply to this e-mail.",
  },
  de: {
    subject: (n: string) => `Erstattung zur Bestellung ${n} — Reptiplus`,
    title: "Wir haben Ihnen den Betrag erstattet",
    body: (partial: boolean) =>
      partial
        ? "Wir haben einen Teil Ihrer Zahlung zu dieser Bestellung erstattet. Das Geld geht auf demselben Weg zurück; je nach Bank dauert es 3–10 Werktage."
        : "Wir haben Ihnen die gesamte Zahlung zur Bestellung erstattet. Das Geld geht auf demselben Weg zurück; je nach Bank dauert es 3–10 Werktage.",
    amount: "Erstatteter Betrag",
    orderNo: "Bestellnummer",
    creditNote: "Gutschrift",
    attached: "Die Gutschrift finden Sie im Anhang dieser E-Mail.",
    viewOrder: "Bestellung ansehen",
    reply: "Haben Sie Fragen? Antworten Sie einfach auf diese E-Mail.",
  },
} as const;

export function orderRefundEmail(d: {
  number: string;
  amount: number;
  partial: boolean;
  creditNoteNumber?: string | null;
  orderUrl: string;
  locale: Locale;
}): { subject: string; html: string; text: string } {
  const c = REFUND_COPY[d.locale] ?? REFUND_COPY.cs;
  const rows: [string, string][] = [
    [c.orderNo, d.number],
    [c.amount, money(d.amount, d.locale)],
  ];
  if (d.creditNoteNumber) rows.push([c.creditNote, d.creditNoteNumber]);
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 8px;font-size:22px;color:${INK};">${c.title}</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${c.body(d.partial)}</p>
${infoBox(`<table role="presentation" cellpadding="0" cellspacing="0">${kvRows(rows)}</table>`)}
${d.creditNoteNumber ? `<p style="margin:16px 0 0;font-size:14px;">${c.attached}</p>` : ""}
<div style="margin-top:26px;">${button(d.orderUrl, c.viewOrder)}</div>
<p style="margin:22px 0 0;font-size:13px;color:${MUTED};">${c.reply}</p>
</td></tr>
${footerRow(d.locale)}`;
  const text = [c.title, c.body(d.partial), ...rows.map(([k, v]) => `${k}: ${v}`), ...(d.creditNoteNumber ? [c.attached] : []), `${c.viewOrder}: ${d.orderUrl}`].join("\n");
  return { subject: c.subject(d.number), html: layout(inner, c.title), text };
}

/* ── Vlastní zpráva z adminu (objednávka) ──────────────────────────────── */

/** Obecná zpráva k objednávce psaná v adminu (prostý text → HTML). */
export function orderMessageEmail(d: {
  locale: Locale;
  subject: string;
  body: string;
  orderNumber: string;
  orderUrl: string;
}): { subject: string; html: string; text: string } {
  const { html, paragraphs } = plainTextToHtml(d.body);
  const t = STATUS_COPY[d.locale] ?? STATUS_COPY.cs;
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 18px;font-size:20px;color:${INK};">${escapeHtml(d.subject)}</h1>
${html}
<p style="margin:6px 0 0;font-size:13px;color:${MUTED};">${t.orderNo}: <strong style="font-family:monospace;color:${INK};">${escapeHtml(d.orderNumber)}</strong></p>
<div style="margin-top:22px;">${button(d.orderUrl, t.viewOrder, true)}</div>
</td></tr>
${footerRow(d.locale)}`;
  return {
    subject: d.subject,
    html: layout(inner, (paragraphs[1] ?? paragraphs[0] ?? d.subject).slice(0, 140)),
    text: [...paragraphs, "", `${t.orderNo}: ${d.orderNumber}`, `${t.viewOrder}: ${d.orderUrl}`].join("\n\n"),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── LEDX poptávka — zpráva z adminu (nabídka, dotaz, zrušení, potvrzení) ─ */

const LEDX_MESSAGE_FOOTER: Record<Locale, string> = {
  cs: "Reptiplus — výhradní dodavatel LEDX pro ČR",
  en: "Reptiplus — exclusive LEDX distributor for the Czech Republic",
  de: "Reptiplus — exklusiver LEDX-Vertriebspartner für Tschechien",
};

/**
 * Obecný e-mail zákazníkovi k poptávce LEDX. Tělo je prostý text z adminu
 * (admin ho může před odesláním upravit) — odstavce oddělené prázdným
 * řádkem, řádky začínající „– " / „- " se vykreslí jako odrážky.
 */
export function ledxInquiryMessageEmail(d: {
  locale: Locale;
  subject: string;
  body: string;
}): { subject: string; html: string; text: string } {
  const footer = LEDX_MESSAGE_FOOTER[d.locale] ?? LEDX_MESSAGE_FOOTER.cs;
  const { html, paragraphs } = plainTextToHtml(d.body);
  const preheader = paragraphs[1] ?? paragraphs[0] ?? d.subject;
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 18px;font-size:20px;color:${INK};">${escapeHtml(d.subject)}</h1>
${html}
</td></tr>
<tr><td style="padding:18px 28px;background:${CREAM};border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;">${footer} · reptiplus.cz</td></tr>`;

  return {
    subject: d.subject,
    html: layout(inner, preheader.slice(0, 140)),
    text: paragraphs.join("\n\n"),
  };
}

/* ── LEDX poptávka — potvrzení pro zákazníka ──────────────────────────── */

const LEDX_COPY = {
  cs: {
    subject: (rada: string) => `Vaše poptávka LEDX${rada ? ` ${rada}` : ""} — Reptiplus`,
    preheader: "Poptávku jsme přijali, ozveme se do dvou pracovních dnů.",
    title: "Děkujeme za poptávku!",
    hello: (name: string) => `Dobrý den ${name},`,
    intro: "vaši poptávku profesionálního osvětlení LEDX jsme přijali. Ozveme se vám obvykle do dvou pracovních dnů s návrhem řešení a cenovou nabídkou.",
    summary: "Shrnutí poptávky",
    labels: { rada: "Řada", model: "Model / výkon", cct: "Barva světla", uhel: "Úhel vyzařování", pocet: "Počet kusů", stmivani: "Stmívání", phone: "Telefon", poznamka: "Poznámka" },
    dimNone: "Bez",
    reply: "Chcete něco doplnit? Stačí odpovědět na tento e-mail.",
    footer: "Reptiplus — výhradní dodavatel LEDX pro ČR",
  },
  en: {
    subject: (rada: string) => `Your LEDX inquiry${rada ? ` ${rada}` : ""} — Reptiplus`,
    preheader: "We've received your inquiry and will reply within two business days.",
    title: "Thank you for your inquiry!",
    hello: (name: string) => `Hello ${name},`,
    intro: "we've received your inquiry for LEDX professional lighting. We'll usually get back to you within two business days with a proposed solution and a quote.",
    summary: "Inquiry summary",
    labels: { rada: "Range", model: "Model / power", cct: "Colour temperature", uhel: "Beam angle", pocet: "Quantity", stmivani: "Dimming", phone: "Phone", poznamka: "Notes" },
    dimNone: "None",
    reply: "Want to add something? Just reply to this e-mail.",
    footer: "Reptiplus — exclusive LEDX distributor for the Czech Republic",
  },
  de: {
    subject: (rada: string) => `Ihre LEDX-Anfrage${rada ? ` ${rada}` : ""} — Reptiplus`,
    preheader: "Wir haben Ihre Anfrage erhalten und melden uns innerhalb von zwei Werktagen.",
    title: "Vielen Dank für Ihre Anfrage!",
    hello: (name: string) => `Guten Tag ${name},`,
    intro: "wir haben Ihre Anfrage zur LEDX Profi-Beleuchtung erhalten. Wir melden uns in der Regel innerhalb von zwei Werktagen mit einem Lösungsvorschlag und einem Angebot.",
    summary: "Zusammenfassung der Anfrage",
    labels: { rada: "Serie", model: "Modell / Leistung", cct: "Lichtfarbe", uhel: "Abstrahlwinkel", pocet: "Stückzahl", stmivani: "Dimmung", phone: "Telefon", poznamka: "Anmerkung" },
    dimNone: "Ohne",
    reply: "Möchten Sie etwas ergänzen? Antworten Sie einfach auf diese E-Mail.",
    footer: "Reptiplus — exklusiver LEDX-Vertriebspartner für Tschechien",
  },
} as const;

export type LedxInquiryEmailData = {
  locale: Locale;
  name: string;
  rada: string | null;
  model: string | null;
  cct: string | null;
  uhel: string | null;
  pocet: number | null;
  stmivani: string | null;
  phone: string | null;
  poznamka: string | null;
};

/** Potvrzení přijaté poptávky LEDX pro zákazníka (v jazyce webu). */
export function ledxInquiryConfirmationEmail(d: LedxInquiryEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const c = LEDX_COPY[d.locale] ?? LEDX_COPY.cs;
  const stmivani = d.stmivani === "Bez" ? c.dimNone : d.stmivani;
  const rows: [string, string | number | null][] = [
    [c.labels.rada, d.rada],
    [c.labels.model, d.model],
    [c.labels.cct, d.cct],
    [c.labels.uhel, d.uhel],
    [c.labels.pocet, d.pocet],
    [c.labels.stmivani, stmivani],
    [c.labels.phone, d.phone],
  ];
  const filled = rows.filter(([, v]) => v !== null && v !== "");
  const trs = filled
    .map(
      ([k, v]) => `<tr>
<td style="padding:7px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED};">${escapeHtml(k)}</td>
<td style="padding:7px 0;border-bottom:1px solid ${BORDER};font-size:14px;text-align:right;"><strong>${escapeHtml(String(v))}</strong></td>
</tr>`,
    )
    .join("");
  const note = d.poznamka
    ? `<p style="margin:18px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};">${c.labels.poznamka}</p>
<div style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;padding:12px 16px;font-size:14px;line-height:1.5;white-space:pre-line;">${escapeHtml(d.poznamka)}</div>`
    : "";

  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 14px;font-size:22px;color:${INK};">${c.title}</h1>
<p style="margin:0 0 6px;font-size:14px;line-height:1.55;">${escapeHtml(c.hello(d.name))}</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.55;">${c.intro}</p>
<p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};">${c.summary}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs}</table>
${note}
<p style="margin:22px 0 0;font-size:14px;color:${MUTED};">${c.reply}</p>
</td></tr>
<tr><td style="padding:18px 28px;background:${CREAM};border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;">${c.footer} · reptiplus.cz</td></tr>`;

  const text = [
    c.title,
    "",
    c.hello(d.name),
    c.intro,
    "",
    `${c.summary}:`,
    ...filled.map(([k, v]) => `${k}: ${v}`),
    ...(d.poznamka ? [`${c.labels.poznamka}: ${d.poznamka}`] : []),
    "",
    c.reply,
  ].join("\n");

  return { subject: c.subject(d.rada ?? ""), html: layout(inner, c.preheader), text };
}

/* ── Doklad (faktura / dobropis) e-mailem ──────────────────────────────── */

const INVOICE_COPY = {
  cs: {
    subject: (n: string, credit: boolean, order: string) =>
      credit ? `Dobropis ${n} k objednávce ${order} — Reptiplus` : `Faktura ${n} k objednávce ${order} — Reptiplus`,
    title: (credit: boolean) => (credit ? "Dobropis k vaší objednávce" : "Faktura k vaší objednávce"),
    intro: (credit: boolean, order: string) =>
      credit
        ? `v příloze posíláme dobropis k objednávce ${order}. Částka vám bude vrácena stejnou cestou, jakou jste platili.`
        : `v příloze posíláme fakturu k objednávce ${order}. Doklad si můžete kdykoli stáhnout i z odkazu níže.`,
    number: "Číslo dokladu",
    amount: "Částka",
    download: "Stáhnout PDF",
    viewOrder: "Zobrazit objednávku",
    footer: "Reptiplus — specializovaná teraristika",
  },
  en: {
    subject: (n: string, credit: boolean, order: string) =>
      credit ? `Credit note ${n} for order ${order} — Reptiplus` : `Invoice ${n} for order ${order} — Reptiplus`,
    title: (credit: boolean) => (credit ? "Credit note for your order" : "Invoice for your order"),
    intro: (credit: boolean, order: string) =>
      credit
        ? `please find attached the credit note for order ${order}. The amount will be refunded the same way you paid.`
        : `please find attached the invoice for order ${order}. You can download it any time using the link below.`,
    number: "Document number",
    amount: "Amount",
    download: "Download PDF",
    viewOrder: "View order",
    footer: "Reptiplus — specialist terrarium shop",
  },
  de: {
    subject: (n: string, credit: boolean, order: string) =>
      credit ? `Gutschrift ${n} zur Bestellung ${order} — Reptiplus` : `Rechnung ${n} zur Bestellung ${order} — Reptiplus`,
    title: (credit: boolean) => (credit ? "Gutschrift zu Ihrer Bestellung" : "Rechnung zu Ihrer Bestellung"),
    intro: (credit: boolean, order: string) =>
      credit
        ? `anbei senden wir Ihnen die Gutschrift zur Bestellung ${order}. Der Betrag wird auf demselben Weg erstattet, wie Sie bezahlt haben.`
        : `anbei senden wir Ihnen die Rechnung zur Bestellung ${order}. Sie können den Beleg jederzeit über den Link unten herunterladen.`,
    number: "Belegnummer",
    amount: "Betrag",
    download: "PDF herunterladen",
    viewOrder: "Bestellung ansehen",
    footer: "Reptiplus — Fachgeschäft für Terraristik",
  },
} as const;

export function invoiceEmail(d: {
  locale: Locale;
  number: string;
  isCreditNote: boolean;
  orderNumber: string;
  total: number;
  currency: "CZK" | "EUR";
  downloadUrl: string;
  orderUrl: string;
  greetingName?: string | null;
}): { subject: string; html: string; text: string } {
  const c = INVOICE_COPY[d.locale] ?? INVOICE_COPY.cs;
  const hello = d.greetingName
    ? d.locale === "de" ? `Guten Tag ${d.greetingName},` : d.locale === "en" ? `Hello ${d.greetingName},` : `Dobrý den ${d.greetingName},`
    : d.locale === "de" ? "Guten Tag," : d.locale === "en" ? "Hello," : "Dobrý den,";
  const amount = new Intl.NumberFormat(d.currency === "CZK" ? "cs-CZ" : "de-DE", {
    style: "currency",
    currency: d.currency,
    minimumFractionDigits: 2,
  }).format(d.total / 100);
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 14px;font-size:22px;color:${INK};">${c.title(d.isCreditNote)}</h1>
<p style="margin:0 0 6px;font-size:14px;line-height:1.55;">${escapeHtml(hello)}</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.55;">${escapeHtml(c.intro(d.isCreditNote, d.orderNumber))}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;">
<tr><td style="padding:4px 18px 4px 0;color:${MUTED};">${c.number}</td><td style="padding:4px 0;"><strong style="font-family:monospace;">${escapeHtml(d.number)}</strong></td></tr>
<tr><td style="padding:4px 18px 4px 0;color:${MUTED};">${c.amount}</td><td style="padding:4px 0;"><strong>${amount}</strong></td></tr>
</table>
<div style="margin-top:24px;">
<a href="${d.downloadUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:8px;">${c.download}</a>
&nbsp;&nbsp;<a href="${d.orderUrl}" style="display:inline-block;color:${BRAND};text-decoration:none;font-weight:bold;font-size:14px;padding:12px 6px;">${c.viewOrder}</a>
</div>
</td></tr>
<tr><td style="padding:18px 28px;background:${CREAM};border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;">${c.footer} · reptiplus.cz</td></tr>`;
  const text = [c.title(d.isCreditNote), "", hello, c.intro(d.isCreditNote, d.orderNumber), "", `${c.number}: ${d.number}`, `${c.amount}: ${amount}`, "", `${c.download}: ${d.downloadUrl}`, `${c.viewOrder}: ${d.orderUrl}`].join("\n");
  return { subject: c.subject(d.number, d.isCreditNote, d.orderNumber), html: layout(inner, c.title(d.isCreditNote)), text };
}

/* ── Hlídání skladu ────────────────────────────────────────────────────── */

const STOCK_COPY = {
  cs: {
    subject: (n: string) => `${n} je opět skladem — Reptiplus`,
    title: "Je to zpátky skladem!",
    body: (n: string) => `Produkt ${n}, který jste chtěli hlídat, máme znovu na skladě. Zásoby bývají omezené, tak neváhejte.`,
    cta: "Zobrazit produkt",
    note: "Toto upozornění jsme poslali jednorázově na vaši žádost z webu reptiplus.cz.",
  },
  en: {
    subject: (n: string) => `${n} is back in stock — Reptiplus`,
    title: "It's back in stock!",
    body: (n: string) => `${n}, the product you asked us to watch, is available again. Stock is often limited, so don't wait too long.`,
    cta: "View product",
    note: "This is a one-time notification you requested on reptiplus.cz.",
  },
  de: {
    subject: (n: string) => `${n} ist wieder auf Lager — Reptiplus`,
    title: "Wieder auf Lager!",
    body: (n: string) => `${n}, das Produkt, das Sie beobachten wollten, ist wieder verfügbar. Der Vorrat ist oft begrenzt, also zögern Sie nicht.`,
    cta: "Produkt ansehen",
    note: "Diese einmalige Benachrichtigung haben Sie auf reptiplus.cz angefordert.",
  },
} as const;

export function stockAlertEmail(d: { locale: Locale; productName: string; productUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const c = STOCK_COPY[d.locale] ?? STOCK_COPY.cs;
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:22px;color:${INK};">${c.title}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.55;">${escapeHtml(c.body(d.productName))}</p>
${button(d.productUrl, c.cta)}
<p style="margin:22px 0 0;font-size:12px;color:${MUTED};">${c.note}</p>
</td></tr>
${footerRow(d.locale)}`;
  return {
    subject: c.subject(d.productName),
    html: layout(inner, c.body(d.productName).slice(0, 140)),
    text: [c.title, "", c.body(d.productName), "", `${c.cta}: ${d.productUrl}`, "", c.note].join("\n"),
  };
}

/* ── Newsletter ─────────────────────────────────────────────────────────── */

const NL_COPY = {
  cs: {
    confirmSubject: "Potvrďte odběr novinek — Reptiplus",
    confirmTitle: "Ještě jeden krok",
    confirmBody: "Děkujeme za zájem o novinky z Reptiplus. Odběr potvrďte kliknutím na tlačítko níže — bez potvrzení vám nic posílat nebudeme.",
    confirmCta: "Potvrdit odběr",
    confirmNote: "Pokud jste se k odběru nepřihlásili, tento e-mail ignorujte.",
    welcomeSubject: (code: string | null) => (code ? `Vítejte! Vaše sleva ${code} — Reptiplus` : "Vítejte v odběru novinek — Reptiplus"),
    welcomeTitle: "Odběr potvrzen, vítejte!",
    welcomeBody: "Od teď vám budeme posílat tipy pro chov, novinky v sortimentu a akce. Ne častěji, než je zdravé.",
    codeIntro: (amount: string, minOrder: string, until: string) => `Jako poděkování máte slevu ${amount} na první nákup nad ${minOrder}. Kód uplatníte v pokladně, platí do ${until}.`,
    codeLabel: "Váš slevový kód",
    shopCta: "Jít nakupovat",
    unsubscribe: "Odhlásit odběr",
  },
  en: {
    confirmSubject: "Confirm your newsletter subscription — Reptiplus",
    confirmTitle: "One more step",
    confirmBody: "Thanks for your interest in Reptiplus news. Please confirm your subscription by clicking the button below — we won't send anything without it.",
    confirmCta: "Confirm subscription",
    confirmNote: "If you didn't sign up, just ignore this e-mail.",
    welcomeSubject: (code: string | null) => (code ? `Welcome! Your discount ${code} — Reptiplus` : "Welcome to the newsletter — Reptiplus"),
    welcomeTitle: "Subscription confirmed, welcome!",
    welcomeBody: "From now on we'll send you keeper tips, new products and deals. Not more often than is healthy.",
    codeIntro: (amount: string, minOrder: string, until: string) => `As a thank-you, here's ${amount} off your first order over ${minOrder}. Use the code at checkout; valid until ${until}.`,
    codeLabel: "Your discount code",
    shopCta: "Start shopping",
    unsubscribe: "Unsubscribe",
  },
  de: {
    confirmSubject: "Bestätigen Sie Ihr Newsletter-Abonnement — Reptiplus",
    confirmTitle: "Noch ein Schritt",
    confirmBody: "Danke für Ihr Interesse an Neuigkeiten von Reptiplus. Bitte bestätigen Sie das Abonnement über die Schaltfläche unten — ohne Bestätigung senden wir nichts.",
    confirmCta: "Abonnement bestätigen",
    confirmNote: "Falls Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail einfach.",
    welcomeSubject: (code: string | null) => (code ? `Willkommen! Ihr Rabatt ${code} — Reptiplus` : "Willkommen beim Newsletter — Reptiplus"),
    welcomeTitle: "Abonnement bestätigt, willkommen!",
    welcomeBody: "Ab jetzt senden wir Ihnen Tipps für Halter, neue Produkte und Aktionen. Nicht öfter, als gesund ist.",
    codeIntro: (amount: string, minOrder: string, until: string) => `Als Dankeschön erhalten Sie ${amount} Rabatt auf Ihre erste Bestellung über ${minOrder}. Code an der Kasse eingeben; gültig bis ${until}.`,
    codeLabel: "Ihr Rabattcode",
    shopCta: "Jetzt einkaufen",
    unsubscribe: "Abbestellen",
  },
} as const;

export function newsletterConfirmEmail(d: { locale: Locale; confirmUrl: string }): { subject: string; html: string; text: string } {
  const c = NL_COPY[d.locale] ?? NL_COPY.cs;
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:22px;color:${INK};">${c.confirmTitle}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.55;">${c.confirmBody}</p>
${button(d.confirmUrl, c.confirmCta)}
<p style="margin:22px 0 0;font-size:12px;color:${MUTED};">${c.confirmNote}</p>
</td></tr>
${footerRow(d.locale)}`;
  return {
    subject: c.confirmSubject,
    html: layout(inner, c.confirmBody.slice(0, 140)),
    text: [c.confirmTitle, "", c.confirmBody, "", `${c.confirmCta}: ${d.confirmUrl}`, "", c.confirmNote].join("\n"),
  };
}

export function newsletterWelcomeEmail(d: {
  locale: Locale;
  code: string | null;
  amountLabel?: string;
  minOrderLabel?: string;
  validUntil?: string;
  shopUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const c = NL_COPY[d.locale] ?? NL_COPY.cs;
  const codeBlock = d.code
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;">${escapeHtml(c.codeIntro(d.amountLabel ?? "", d.minOrderLabel ?? "", d.validUntil ?? ""))}</p>
${infoBox(`<span style="display:block;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};">${c.codeLabel}</span><strong style="display:block;margin-top:4px;font-family:monospace;font-size:22px;letter-spacing:1px;color:${BRAND};">${escapeHtml(d.code)}</strong>`)}`
    : "";
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:22px;color:${INK};">${c.welcomeTitle}</h1>
<p style="margin:0 0 18px;font-size:14px;line-height:1.55;">${c.welcomeBody}</p>
${codeBlock}
<div style="margin-top:22px;">${button(d.shopUrl, c.shopCta)}</div>
<p style="margin:26px 0 0;font-size:12px;color:${MUTED};"><a href="${d.unsubscribeUrl}" style="color:${MUTED};">${c.unsubscribe}</a></p>
</td></tr>
${footerRow(d.locale)}`;
  return {
    subject: c.welcomeSubject(d.code),
    html: layout(inner, c.welcomeBody.slice(0, 140)),
    text: [
      c.welcomeTitle,
      "",
      c.welcomeBody,
      ...(d.code ? ["", c.codeIntro(d.amountLabel ?? "", d.minOrderLabel ?? "", d.validUntil ?? ""), `${c.codeLabel}: ${d.code}`] : []),
      "",
      `${c.shopCta}: ${d.shopUrl}`,
      `${c.unsubscribe}: ${d.unsubscribeUrl}`,
    ].join("\n"),
  };
}

/* ── Kontaktní formulář ────────────────────────────────────────────────── */

const CONTACT_COPY = {
  cs: { subject: "Přijali jsme vaši zprávu — Reptiplus", title: "Děkujeme za zprávu", body: "Vaši zprávu jsme přijali a ozveme se obvykle do jednoho pracovního dne. Pro doplnění stačí odpovědět na tento e-mail.", yourMessage: "Vaše zpráva" },
  en: { subject: "We've received your message — Reptiplus", title: "Thanks for your message", body: "We've received your message and usually reply within one business day. To add anything, just reply to this e-mail.", yourMessage: "Your message" },
  de: { subject: "Wir haben Ihre Nachricht erhalten — Reptiplus", title: "Danke für Ihre Nachricht", body: "Wir haben Ihre Nachricht erhalten und antworten in der Regel innerhalb eines Werktags. Für Ergänzungen antworten Sie einfach auf diese E-Mail.", yourMessage: "Ihre Nachricht" },
} as const;

export function contactConfirmEmail(d: { locale: Locale; name: string; subject: string; message: string }): { subject: string; html: string; text: string } {
  const c = CONTACT_COPY[d.locale] ?? CONTACT_COPY.cs;
  const hello = d.locale === "de" ? `Guten Tag ${d.name},` : d.locale === "en" ? `Hello ${d.name},` : `Dobrý den ${d.name},`;
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:22px;color:${INK};">${c.title}</h1>
<p style="margin:0 0 6px;font-size:14px;line-height:1.55;">${escapeHtml(hello)}</p>
<p style="margin:0 0 18px;font-size:14px;line-height:1.55;">${c.body}</p>
<p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};">${c.yourMessage}${d.subject ? ` — ${escapeHtml(d.subject)}` : ""}</p>
${infoBox(`<span style="white-space:pre-line;">${escapeHtml(d.message)}</span>`)}
</td></tr>
${footerRow(d.locale)}`;
  return { subject: c.subject, html: layout(inner, c.body.slice(0, 140)), text: [c.title, "", hello, c.body, "", `${c.yourMessage}: ${d.subject}`, d.message].join("\n") };
}

/** Zpráva z kontaktního formuláře do obchodu (česky, reply-to = zákazník). */
export function contactShopEmail(d: { name: string; email: string; phone: string | null; subject: string; message: string; locale: string; orderNumber: string | null }): { subject: string; html: string; text: string } {
  const rows: [string, string][] = [
    ["Jméno", d.name],
    ["E-mail", d.email],
    ...(d.phone ? ([["Telefon", d.phone]] as [string, string][]) : []),
    ...(d.orderNumber ? ([["Objednávka", d.orderNumber]] as [string, string][]) : []),
    ["Jazyk webu", d.locale.toUpperCase()],
  ];
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 12px;font-size:20px;">Zpráva z kontaktního formuláře${d.subject ? `: ${escapeHtml(d.subject)}` : ""}</h1>
<table role="presentation" cellpadding="0" cellspacing="0">${kvRows(rows)}</table>
<div style="margin-top:16px;">${infoBox(`<span style="white-space:pre-line;">${escapeHtml(d.message)}</span>`)}</div>
<p style="margin:16px 0 0;font-size:12px;color:${MUTED};">Odpověď stačí poslat jako reply — jde přímo zákazníkovi.</p>
</td></tr>`;
  return {
    subject: `Kontakt: ${d.subject || d.name}${d.orderNumber ? ` (${d.orderNumber})` : ""}`,
    html: layout(inner, d.message.slice(0, 140)),
    text: [...rows.map(([k, v]) => `${k}: ${v}`), "", d.message].join("\n"),
  };
}
