import "server-only";
import type { Locale } from "@/i18n/routing";
import type { ShopContact } from "@/lib/settings";
import {
  EMAIL_KINDS,
  formatQuote,
  type EmailKind,
} from "@/lib/ledx/inquiry-status";

/** Data poptávky potřebná pro sestavení návrhu e-mailu. */
export type InquiryForDraft = {
  name: string;
  locale: string;
  rada: string | null;
  model: string | null;
  cct: string | null;
  uhel: string | null;
  pocet: number | null;
  stmivani: string | null;
  quote_amount: number | null;
  quote_currency: string | null;
  quote_valid_until: string | null;
  quote_number: string | null;
};

export type EmailDraft = { subject: string; body: string };

type Copy = {
  hello: (name: string) => string;
  labels: { rada: string; model: string; cct: string; uhel: string; pocet: string; stmivani: string };
  dimNone: string;
  price: string;
  priceHint: string;
  validUntil: string;
  quoteNo: string;
  fill: string;
  regards: string;
  quote: { subject: (r: string) => string; intro: string; outro: string };
  question: { subject: (r: string) => string; intro: string; items: string[]; outro: string };
  order: {
    subject: (r: string) => string;
    intro: string;
    delivery: string;
    payment: string;
    account: string;
    iban: string;
    bic: string;
    amount: string;
    vs: string;
    outro: string;
  };
  cancel: { subject: (r: string) => string; intro: string; reason: string; outro: string };
};

const COPY: Record<Locale, Copy> = {
  cs: {
    hello: (n) => `Dobrý den ${n},`,
    labels: { rada: "Řada", model: "Model / výkon", cct: "Barva světla", uhel: "Úhel vyzařování", pocet: "Počet kusů", stmivani: "Stmívání" },
    dimNone: "bez stmívání",
    price: "Cena celkem",
    priceHint: "(doplňte cenu)",
    validUntil: "Nabídka platí do",
    quoteNo: "Číslo nabídky",
    fill: "(doplňte)",
    regards: "S pozdravem",
    quote: {
      subject: (r) => `Cenová nabídka LEDX${r ? ` ${r}` : ""} — Reptiplus`,
      intro: "děkujeme za vaši poptávku profesionálního osvětlení LEDX. Na základě zadaných parametrů posíláme cenovou nabídku:",
      outro: "V případě zájmu nebo jakýchkoli dotazů stačí odpovědět na tento e-mail — rádi upravíme konfiguraci podle vašich potřeb.",
    },
    question: {
      subject: (r) => `Vaše poptávka LEDX${r ? ` ${r}` : ""} — potřebujeme upřesnit`,
      intro: "děkujeme za vaši poptávku osvětlení LEDX. Abychom vám mohli připravit nabídku na míru, potřebujeme upřesnit několik věcí:",
      items: [
        "rozměry prostoru nebo plochy, kterou chcete nasvítit",
        "výšku zavěšení svítidel",
        "účel osvětlení (chov, pěstování, expozice…) a požadovanou intenzitu",
        "případně fotografii prostoru",
      ],
      outro: "Stačí odpovědět na tento e-mail. Jakmile budeme mít podklady, ozveme se s návrhem řešení a cenou.",
    },
    order: {
      subject: (r) => `Potvrzení objednávky LEDX${r ? ` ${r}` : ""} — Reptiplus`,
      intro: "děkujeme za vaši objednávku. Potvrzujeme, že jsme ji přijali v tomto rozsahu:",
      delivery: "Předpokládaný termín dodání",
      payment: "Platební údaje (bankovní převod)",
      account: "Číslo účtu",
      iban: "IBAN",
      bic: "BIC / SWIFT",
      amount: "Částka",
      vs: "Variabilní symbol",
      outro: "Po připsání platby zboží expedujeme a pošleme vám číslo zásilky. Fakturu obdržíte e-mailem. S případnými dotazy se na nás kdykoli obraťte odpovědí na tento e-mail.",
    },
    cancel: {
      subject: (r) => `Vaše poptávka LEDX${r ? ` ${r}` : ""} — uzavření`,
      intro: "děkujeme za váš zájem o osvětlení LEDX. Vaši poptávku jsme uzavřeli.",
      reason: "Důvod: (doplňte, nebo řádek smažte)",
      outro: "Pokud budete mít v budoucnu zájem, rádi se k poptávce vrátíme — stačí odpovědět na tento e-mail nebo poslat novou poptávku přes web.",
    },
  },
  en: {
    hello: (n) => `Hello ${n},`,
    labels: { rada: "Range", model: "Model / power", cct: "Colour temperature", uhel: "Beam angle", pocet: "Quantity", stmivani: "Dimming" },
    dimNone: "no dimming",
    price: "Total price",
    priceHint: "(fill in the price)",
    validUntil: "Quote valid until",
    quoteNo: "Quote number",
    fill: "(fill in)",
    regards: "Kind regards",
    quote: {
      subject: (r) => `LEDX quote${r ? ` ${r}` : ""} — Reptiplus`,
      intro: "thank you for your inquiry about LEDX professional lighting. Based on the parameters you provided, here is our quote:",
      outro: "If you'd like to proceed or have any questions, just reply to this e-mail — we're happy to adjust the configuration to your needs.",
    },
    question: {
      subject: (r) => `Your LEDX inquiry${r ? ` ${r}` : ""} — a few details needed`,
      intro: "thank you for your inquiry about LEDX lighting. To prepare a tailored quote, we need to clarify a few things:",
      items: [
        "the dimensions of the space or area you want to illuminate",
        "the mounting height of the fixtures",
        "the purpose (animal keeping, growing, display…) and required light intensity",
        "a photo of the space, if possible",
      ],
      outro: "Simply reply to this e-mail. Once we have the details, we'll get back to you with a proposed solution and price.",
    },
    order: {
      subject: (r) => `LEDX order confirmation${r ? ` ${r}` : ""} — Reptiplus`,
      intro: "thank you for your order. We confirm that we have received it as follows:",
      delivery: "Estimated delivery",
      payment: "Payment details (bank transfer)",
      account: "Account number",
      iban: "IBAN",
      bic: "BIC / SWIFT",
      amount: "Amount",
      vs: "Payment reference",
      outro: "We will ship the goods once the payment has been received and send you the tracking number. The invoice will follow by e-mail. If you have any questions, just reply to this e-mail.",
    },
    cancel: {
      subject: (r) => `Your LEDX inquiry${r ? ` ${r}` : ""} — closed`,
      intro: "thank you for your interest in LEDX lighting. We have closed your inquiry.",
      reason: "Reason: (fill in, or delete this line)",
      outro: "Should you be interested in the future, we'll gladly pick it up again — just reply to this e-mail or send a new inquiry via our website.",
    },
  },
  de: {
    hello: (n) => `Guten Tag ${n},`,
    labels: { rada: "Serie", model: "Modell / Leistung", cct: "Lichtfarbe", uhel: "Abstrahlwinkel", pocet: "Stückzahl", stmivani: "Dimmung" },
    dimNone: "ohne Dimmung",
    price: "Gesamtpreis",
    priceHint: "(Preis eintragen)",
    validUntil: "Angebot gültig bis",
    quoteNo: "Angebotsnummer",
    fill: "(ausfüllen)",
    regards: "Mit freundlichen Grüßen",
    quote: {
      subject: (r) => `LEDX-Angebot${r ? ` ${r}` : ""} — Reptiplus`,
      intro: "vielen Dank für Ihre Anfrage zur LEDX Profi-Beleuchtung. Auf Basis Ihrer Angaben senden wir Ihnen unser Angebot:",
      outro: "Bei Interesse oder Fragen antworten Sie einfach auf diese E-Mail — wir passen die Konfiguration gerne an Ihre Bedürfnisse an.",
    },
    question: {
      subject: (r) => `Ihre LEDX-Anfrage${r ? ` ${r}` : ""} — Rückfrage`,
      intro: "vielen Dank für Ihre Anfrage zur LEDX-Beleuchtung. Um ein passendes Angebot zu erstellen, benötigen wir noch einige Angaben:",
      items: [
        "die Abmessungen des Raums bzw. der zu beleuchtenden Fläche",
        "die Montagehöhe der Leuchten",
        "den Verwendungszweck (Tierhaltung, Pflanzenzucht, Ausstellung…) und die gewünschte Lichtintensität",
        "nach Möglichkeit ein Foto des Raums",
      ],
      outro: "Antworten Sie einfach auf diese E-Mail. Sobald wir die Angaben haben, melden wir uns mit einem Lösungsvorschlag und Preis.",
    },
    order: {
      subject: (r) => `Bestellbestätigung LEDX${r ? ` ${r}` : ""} — Reptiplus`,
      intro: "vielen Dank für Ihre Bestellung. Wir bestätigen den Eingang in folgendem Umfang:",
      delivery: "Voraussichtlicher Liefertermin",
      payment: "Zahlungsdaten (Banküberweisung)",
      account: "Kontonummer",
      iban: "IBAN",
      bic: "BIC / SWIFT",
      amount: "Betrag",
      vs: "Verwendungszweck",
      outro: "Nach Zahlungseingang versenden wir die Ware und senden Ihnen die Sendungsnummer. Die Rechnung erhalten Sie per E-Mail. Bei Fragen antworten Sie einfach auf diese E-Mail.",
    },
    cancel: {
      subject: (r) => `Ihre LEDX-Anfrage${r ? ` ${r}` : ""} — abgeschlossen`,
      intro: "vielen Dank für Ihr Interesse an der LEDX-Beleuchtung. Wir haben Ihre Anfrage abgeschlossen.",
      reason: "Grund: (eintragen oder Zeile löschen)",
      outro: "Sollten Sie in Zukunft Interesse haben, nehmen wir die Anfrage gerne wieder auf — antworten Sie einfach auf diese E-Mail oder senden Sie eine neue Anfrage über unsere Website.",
    },
  },
};

const LOCALE_FOR_DATE: Record<Locale, string> = { cs: "cs-CZ", en: "en-GB", de: "de-DE" };

function safeLocale(v: string): Locale {
  return v === "en" || v === "de" ? v : "cs";
}

function specLines(inq: InquiryForDraft, c: Copy): string[] {
  const rows: [string, string | number | null][] = [
    [c.labels.rada, inq.rada],
    [c.labels.model, inq.model],
    [c.labels.cct, inq.cct],
    [c.labels.uhel, inq.uhel],
    [c.labels.pocet, inq.pocet],
    [c.labels.stmivani, inq.stmivani === "Bez" ? c.dimNone : inq.stmivani],
  ];
  return rows.filter(([, v]) => v !== null && v !== "").map(([k, v]) => `– ${k}: ${v}`);
}

function signature(c: Copy, shop: ShopContact): string {
  return [c.regards, shop.name, shop.phone, shop.email].filter(Boolean).join("\n");
}

function formatDate(iso: string | null, locale: Locale): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(LOCALE_FOR_DATE[locale], { dateStyle: "long" }).format(d);
}

/** Návrh e-mailu daného druhu v jazyce zákazníka. Admin ho může upravit. */
export function buildInquiryDraft(
  kind: EmailKind,
  inq: InquiryForDraft,
  shop: ShopContact,
): EmailDraft {
  const locale = safeLocale(inq.locale);
  const c = COPY[locale];
  const rada = inq.rada ?? "";
  const spec = specLines(inq, c).join("\n");
  const price = inq.quote_amount !== null ? formatQuote(inq.quote_amount, inq.quote_currency) : c.priceHint;
  const valid = formatDate(inq.quote_valid_until, locale);
  const sig = signature(c, shop);

  switch (kind) {
    case "quote": {
      const meta = [
        `${c.price}: ${price}`,
        valid ? `${c.validUntil}: ${valid}` : null,
        inq.quote_number ? `${c.quoteNo}: ${inq.quote_number}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return {
        subject: c.quote.subject(rada),
        body: [c.hello(inq.name), c.quote.intro, spec, meta, c.quote.outro, sig].filter(Boolean).join("\n\n"),
      };
    }
    case "question":
      return {
        subject: c.question.subject(rada),
        body: [
          c.hello(inq.name),
          c.question.intro,
          c.question.items.map((i) => `– ${i}`).join("\n"),
          c.question.outro,
          sig,
        ].join("\n\n"),
      };
    case "order_confirmed": {
      const amount = inq.quote_amount !== null ? formatQuote(inq.quote_amount, inq.quote_currency) : c.fill;
      const pay = [
        `${c.order.payment}:`,
        shop.bankAccount ? `– ${c.order.account}: ${shop.bankAccount}` : null,
        shop.iban ? `– ${c.order.iban}: ${shop.iban}` : null,
        shop.bic ? `– ${c.order.bic}: ${shop.bic}` : null,
        `– ${c.order.amount}: ${amount}`,
        `– ${c.order.vs}: ${inq.quote_number ?? c.fill}`,
      ]
        .filter(Boolean)
        .join("\n");
      return {
        subject: c.order.subject(rada),
        body: [
          c.hello(inq.name),
          c.order.intro,
          spec,
          `${c.price}: ${amount}\n${c.order.delivery}: ${c.fill}`,
          pay,
          c.order.outro,
          sig,
        ].join("\n\n"),
      };
    }
    case "cancel":
      return {
        subject: c.cancel.subject(rada),
        body: [c.hello(inq.name), c.cancel.intro, c.cancel.reason, c.cancel.outro, sig].join("\n\n"),
      };
  }
}

/** Návrhy všech druhů e-mailů najednou (pro detail poptávky). */
export function buildAllInquiryDrafts(
  inq: InquiryForDraft,
  shop: ShopContact,
): Record<EmailKind, EmailDraft> {
  return Object.fromEntries(
    EMAIL_KINDS.map((k) => [k, buildInquiryDraft(k, inq, shop)]),
  ) as Record<EmailKind, EmailDraft>;
}
