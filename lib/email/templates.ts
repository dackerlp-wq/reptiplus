import "server-only";
import { formatPrice } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";

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
  paymentMethod: string; // code: cod | bank | ...
  shippingAddress: {
    full_name?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;
  orderUrl: string;
  locale: Locale;
};

const COPY = {
  cs: {
    subject: (n: string) => `Potvrzení objednávky ${n} — Reptiplus`,
    preheader: "Děkujeme za vaši objednávku.",
    thanks: "Děkujeme za objednávku!",
    intro: "Vaši objednávku jsme přijali. Níže najdete její shrnutí.",
    orderNo: "Číslo objednávky",
    items: "Položky",
    qty: "ks",
    subtotal: "Mezisoučet",
    shipping: "Doprava a platba",
    discount: "Sleva",
    total: "Celkem",
    delivery: "Doručovací adresa",
    payTitle: "Platba",
    payCod: "Dobírka — částku uhradíte při převzetí zásilky.",
    payBank: "Bankovní převod — platební údaje vám zašleme samostatně. Objednávku expedujeme po připsání platby.",
    payOther: "Pokyny k platbě vám zašleme e-mailem.",
    viewOrder: "Zobrazit objednávku",
    footer: "Reptiplus — specializovaná teraristika",
  },
  en: {
    subject: (n: string) => `Order confirmation ${n} — Reptiplus`,
    preheader: "Thank you for your order.",
    thanks: "Thank you for your order!",
    intro: "We've received your order. Here's a summary below.",
    orderNo: "Order number",
    items: "Items",
    qty: "pcs",
    subtotal: "Subtotal",
    shipping: "Shipping & payment",
    discount: "Discount",
    total: "Total",
    delivery: "Delivery address",
    payTitle: "Payment",
    payCod: "Cash on delivery — you'll pay when the parcel is delivered.",
    payBank: "Bank transfer — we'll send you the payment details separately. We ship once the payment arrives.",
    payOther: "We'll email you the payment instructions.",
    viewOrder: "View order",
    footer: "Reptiplus — specialist terrarium shop",
  },
  de: {
    subject: (n: string) => `Bestellbestätigung ${n} — Reptiplus`,
    preheader: "Vielen Dank für Ihre Bestellung.",
    thanks: "Vielen Dank für Ihre Bestellung!",
    intro: "Wir haben Ihre Bestellung erhalten. Nachfolgend die Zusammenfassung.",
    orderNo: "Bestellnummer",
    items: "Artikel",
    qty: "Stk",
    subtotal: "Zwischensumme",
    shipping: "Versand & Zahlung",
    discount: "Rabatt",
    total: "Gesamt",
    delivery: "Lieferadresse",
    payTitle: "Zahlung",
    payCod: "Nachnahme — Sie zahlen bei der Zustellung.",
    payBank: "Banküberweisung — die Zahlungsdaten senden wir separat. Wir versenden nach Zahlungseingang.",
    payOther: "Die Zahlungsanweisungen senden wir per E-Mail.",
    viewOrder: "Bestellung ansehen",
    footer: "Reptiplus — Fachgeschäft für Terraristik",
  },
} as const;

const BRAND = "#3f6a2e";
const DARK = "#1e3a14";
const INK = "#26231d";
const MUTED = "#8a897f";
const BORDER = "#e7e3d8";
const CREAM = "#f7f5ef";

function layout(inner: string, preheader: string): string {
  return `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:${INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
<tr><td style="background:${DARK};padding:20px 28px;">
<span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:.5px;">REPTIPLUS</span>
</td></tr>
${inner}
</table>
</td></tr>
</table>
</body></html>`;
}

function money(m: number, locale: Locale) {
  return formatPrice(m, locale);
}

/** Potvrzení objednávky pro zákazníka. */
export function orderConfirmationEmail(d: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const c = COPY[d.locale] ?? COPY.cs;
  const rows = d.items
    .map(
      (it) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;">${escapeHtml(it.name)} <span style="color:${MUTED};">×${it.qty}</span></td>
<td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-size:14px;text-align:right;white-space:nowrap;">${money(it.lineTotal, d.locale)}</td>
</tr>`,
    )
    .join("");

  const payText =
    d.paymentMethod === "cod"
      ? c.payCod
      : d.paymentMethod === "bank" || d.paymentMethod === "bank_transfer"
        ? c.payBank
        : c.payOther;

  const a = d.shippingAddress;
  const addressBlock = a
    ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.5;">
${escapeHtml(a.full_name ?? "")}<br>${escapeHtml(a.street ?? "")}<br>${escapeHtml(a.postal_code ?? "")} ${escapeHtml(a.city ?? "")}, ${escapeHtml(a.country ?? "")}</p>`
    : "";

  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 6px;font-size:22px;color:${INK};">${c.thanks}</h1>
<p style="margin:0 0 4px;font-size:14px;color:${MUTED};">${c.intro}</p>
<p style="margin:14px 0 20px;font-size:14px;">${c.orderNo}: <strong style="font-family:monospace;">${escapeHtml(d.number)}</strong></p>

<div style="background:${CREAM};border:1px solid ${BORDER};border-radius:10px;padding:12px 16px;font-size:14px;line-height:1.5;">${payText}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
${rows}
<tr><td style="padding:10px 0 2px;color:${MUTED};font-size:14px;">${c.subtotal}</td><td style="padding:10px 0 2px;text-align:right;font-size:14px;">${money(d.subtotal, d.locale)}</td></tr>
<tr><td style="padding:2px 0;color:${MUTED};font-size:14px;">${c.shipping}</td><td style="padding:2px 0;text-align:right;font-size:14px;">${money(d.shipping + d.paymentFee, d.locale)}</td></tr>
${d.discount > 0 ? `<tr><td style="padding:2px 0;color:${BRAND};font-size:14px;">${c.discount}</td><td style="padding:2px 0;text-align:right;font-size:14px;color:${BRAND};">− ${money(d.discount, d.locale)}</td></tr>` : ""}
<tr><td style="padding:10px 0 0;border-top:2px solid ${BORDER};font-size:16px;font-weight:bold;">${c.total}</td><td style="padding:10px 0 0;border-top:2px solid ${BORDER};text-align:right;font-size:16px;font-weight:bold;">${money(d.total, d.locale)}</td></tr>
</table>

<p style="margin:22px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};">${c.delivery}</p>
${addressBlock}

<div style="margin-top:26px;">
<a href="${d.orderUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:8px;">${c.viewOrder}</a>
</div>
</td></tr>
<tr><td style="padding:18px 28px;background:${CREAM};border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;">${c.footer} · reptiplus.cz</td></tr>`;

  const text = `${c.thanks}\n${c.orderNo}: ${d.number}\n${c.total}: ${money(d.total, d.locale)}\n${c.viewOrder}: ${d.orderUrl}`;

  return { subject: c.subject(d.number), html: layout(inner, c.preheader), text };
}

/** Jednoduchá notifikace do obchodu o nové objednávce. */
export function newOrderNotificationEmail(d: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const rows = d.items
    .map((it) => `<li>${escapeHtml(it.name)} × ${it.qty} — ${money(it.lineTotal, d.locale)}</li>`)
    .join("");
  const a = d.shippingAddress;
  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 10px;font-size:20px;">Nová objednávka ${escapeHtml(d.number)}</h1>
<p style="margin:0 0 10px;font-size:14px;">Celkem <strong>${money(d.total, d.locale)}</strong> · platba: ${escapeHtml(d.paymentMethod)} · ${escapeHtml(d.email)}</p>
<ul style="font-size:14px;padding-left:18px;">${rows}</ul>
${a ? `<p style="font-size:14px;">${escapeHtml(a.full_name ?? "")}, ${escapeHtml(a.street ?? "")}, ${escapeHtml(a.postal_code ?? "")} ${escapeHtml(a.city ?? "")}</p>` : ""}
<p style="margin-top:14px;"><a href="${d.orderUrl}" style="color:${BRAND};">${d.number}</a></p>
</td></tr>`;
  return {
    subject: `Nová objednávka ${d.number} — ${money(d.total, d.locale)}`,
    html: layout(inner, `Nová objednávka ${d.number}`),
    text: `Nová objednávka ${d.number}, celkem ${money(d.total, d.locale)}, ${d.email}`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
