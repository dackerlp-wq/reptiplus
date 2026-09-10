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
const INK = "#26231d";
const MUTED = "#8a897f";
const BORDER = "#e7e3d8";
const CREAM = "#f7f5ef";
// Bílá varianta loga (PNG kvůli kompatibilitě e-mailových klientů) na canonical doméně.
const LOGO_URL = "https://reptiplus.cz/logo-email.png";

function layout(inner: string, preheader: string): string {
  return `<!doctype html><html><body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:${INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</span>
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

/* ── E-mail o změně stavu objednávky ───────────────────────────────────── */

type NotifiableStatus = "processing" | "shipped" | "delivered" | "cancelled";
const NOTIFIABLE: NotifiableStatus[] = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_COPY = {
  cs: {
    orderNo: "Číslo objednávky",
    trackingLabel: "Sledovací číslo",
    carrierLabel: "Doprava",
    viewOrder: "Zobrazit objednávku",
    footer: "Reptiplus — specializovaná teraristika",
    s: {
      processing: {
        subject: (n: string) => `Objednávka ${n} se zpracovává — Reptiplus`,
        title: "Vaše objednávka se zpracovává",
        body: "Pustili jsme se do přípravy vaší objednávky. Jakmile ji předáme dopravci, dáme vám vědět.",
      },
      shipped: {
        subject: (n: string) => `Objednávka ${n} byla odeslána — Reptiplus`,
        title: "Zásilka je na cestě",
        body: "Vaši objednávku jsme právě předali dopravci.",
      },
      delivered: {
        subject: (n: string) => `Objednávka ${n} byla doručena — Reptiplus`,
        title: "Objednávka doručena",
        body: "Vaše zásilka byla doručena. Doufáme, že je vše v pořádku a vaši svěřenci budou spokojení!",
      },
      cancelled: {
        subject: (n: string) => `Objednávka ${n} byla stornována — Reptiplus`,
        title: "Objednávka stornována",
        body: "Vaši objednávku jsme stornovali. Pokud jste již platili, ozveme se vám ohledně vrácení platby.",
      },
    },
  },
  en: {
    orderNo: "Order number",
    trackingLabel: "Tracking number",
    carrierLabel: "Carrier",
    viewOrder: "View order",
    footer: "Reptiplus — specialist terrarium shop",
    s: {
      processing: {
        subject: (n: string) => `Order ${n} is being processed — Reptiplus`,
        title: "Your order is being processed",
        body: "We've started preparing your order. We'll let you know as soon as it's handed to the carrier.",
      },
      shipped: {
        subject: (n: string) => `Order ${n} has shipped — Reptiplus`,
        title: "Your parcel is on its way",
        body: "We've just handed your order to the carrier.",
      },
      delivered: {
        subject: (n: string) => `Order ${n} has been delivered — Reptiplus`,
        title: "Order delivered",
        body: "Your parcel has been delivered. We hope everything arrived in perfect condition!",
      },
      cancelled: {
        subject: (n: string) => `Order ${n} has been cancelled — Reptiplus`,
        title: "Order cancelled",
        body: "Your order has been cancelled. If you already paid, we'll contact you about a refund.",
      },
    },
  },
  de: {
    orderNo: "Bestellnummer",
    trackingLabel: "Sendungsnummer",
    carrierLabel: "Versand",
    viewOrder: "Bestellung ansehen",
    footer: "Reptiplus — Fachgeschäft für Terraristik",
    s: {
      processing: {
        subject: (n: string) => `Bestellung ${n} wird bearbeitet — Reptiplus`,
        title: "Ihre Bestellung wird bearbeitet",
        body: "Wir haben mit der Vorbereitung Ihrer Bestellung begonnen. Sobald sie an den Versanddienstleister übergeben wird, informieren wir Sie.",
      },
      shipped: {
        subject: (n: string) => `Bestellung ${n} wurde versandt — Reptiplus`,
        title: "Ihr Paket ist unterwegs",
        body: "Wir haben Ihre Bestellung soeben an den Versanddienstleister übergeben.",
      },
      delivered: {
        subject: (n: string) => `Bestellung ${n} wurde zugestellt — Reptiplus`,
        title: "Bestellung zugestellt",
        body: "Ihr Paket wurde zugestellt. Wir hoffen, alles ist einwandfrei angekommen!",
      },
      cancelled: {
        subject: (n: string) => `Bestellung ${n} wurde storniert — Reptiplus`,
        title: "Bestellung storniert",
        body: "Ihre Bestellung wurde storniert. Falls Sie bereits bezahlt haben, melden wir uns wegen der Rückerstattung.",
      },
    },
  },
} as const;

/** E-mail zákazníkovi o změně stavu. Vrací null, pokud stav není notifikovatelný. */
export function orderStatusEmail(d: {
  number: string;
  status: string;
  trackingNumber?: string | null;
  shippingMethod?: string | null;
  orderUrl: string;
  locale: Locale;
}): { subject: string; html: string; text: string } | null {
  if (!NOTIFIABLE.includes(d.status as NotifiableStatus)) return null;
  const t = STATUS_COPY[d.locale] ?? STATUS_COPY.cs;
  const c = t.s[d.status as NotifiableStatus];

  const trackRows =
    d.status === "shipped" && (d.trackingNumber || d.shippingMethod)
      ? `<div style="margin-top:18px;background:${CREAM};border:1px solid ${BORDER};border-radius:10px;padding:12px 16px;font-size:14px;line-height:1.6;">
${d.shippingMethod ? `${t.carrierLabel}: <strong>${escapeHtml(d.shippingMethod)}</strong><br>` : ""}${d.trackingNumber ? `${t.trackingLabel}: <strong style="font-family:monospace;">${escapeHtml(d.trackingNumber)}</strong>` : ""}</div>`
      : "";

  const inner = `
<tr><td style="padding:28px;">
<h1 style="margin:0 0 8px;font-size:22px;color:${INK};">${c.title}</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${INK};">${c.body}</p>
<p style="margin:0;font-size:14px;">${t.orderNo}: <strong style="font-family:monospace;">${escapeHtml(d.number)}</strong></p>
${trackRows}
<div style="margin-top:26px;">
<a href="${d.orderUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:8px;">${t.viewOrder}</a>
</div>
</td></tr>
<tr><td style="padding:18px 28px;background:${CREAM};border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;">${t.footer} · reptiplus.cz</td></tr>`;

  const text = `${c.title}\n${t.orderNo}: ${d.number}${d.trackingNumber ? `\n${t.trackingLabel}: ${d.trackingNumber}` : ""}\n${t.viewOrder}: ${d.orderUrl}`;

  return { subject: c.subject(d.number), html: layout(inner, c.title), text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
