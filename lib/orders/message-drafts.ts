/**
 * Předvyplněné zprávy k objednávce posílané z adminu (zákazník je dostane
 * ve svém jazyce, admin text před odesláním upraví). Bez "server-only".
 */
import type { Locale } from "@/i18n/routing";

export const ORDER_MESSAGE_KINDS = ["custom", "delay", "question", "claim", "pickup"] as const;
export type OrderMessageKind = (typeof ORDER_MESSAGE_KINDS)[number];

export const ORDER_MESSAGE_META: Record<OrderMessageKind, { label: string; description: string }> = {
  custom: { label: "Vlastní zpráva", description: "Prázdná šablona jen s oslovením a podpisem." },
  delay: { label: "Zpoždění dodání", description: "Omluva, důvod a nový předpokládaný termín." },
  question: { label: "Dotaz k objednávce", description: "Potřebujeme něco upřesnit (adresa, varianta, náhrada)." },
  claim: { label: "Reklamace vyřízena", description: "Výsledek reklamace a další postup." },
  pickup: { label: "Připraveno k vyzvednutí", description: "Osobní odběr — kde a kdy si zboží vyzvednout." },
};

export type OrderMessageDraft = { subject: string; body: string };

export type OrderForMessage = {
  number: string;
  locale: string;
  customerName: string | null;
  shopName: string;
  shopPhone: string;
  shopEmail: string;
  shopAddress: string;
};

type Copy = {
  hello: (name: string | null) => string;
  regards: string;
  custom: { subject: (n: string) => string; body: string };
  delay: { subject: (n: string) => string; body: string };
  question: { subject: (n: string) => string; body: string };
  claim: { subject: (n: string) => string; body: string };
  pickup: { subject: (n: string) => string; body: (addr: string) => string };
};

const COPY: Record<Locale, Copy> = {
  cs: {
    hello: (n) => (n ? `Dobrý den ${n},` : "Dobrý den,"),
    regards: "S pozdravem",
    custom: { subject: (n) => `K vaší objednávce ${n} — Reptiplus`, body: "(text zprávy)" },
    delay: {
      subject: (n) => `Objednávka ${n} — zpoždění dodání`,
      body: "omlouváme se, u vaší objednávky došlo ke zpoždění. Důvod: (doplňte).\n\nNový předpokládaný termín odeslání: (doplňte).\n\nPokud by vám termín nevyhovoval, dejte nám prosím vědět — objednávku můžeme upravit nebo zrušit a peníze vrátit.",
    },
    question: {
      subject: (n) => `Objednávka ${n} — potřebujeme upřesnit`,
      body: "k vaší objednávce potřebujeme upřesnit jednu věc:\n\n(doplňte dotaz — např. adresa, varianta, náhrada za vyprodané zboží)\n\nStačí odpovědět na tento e-mail, objednávku poté hned vyřídíme.",
    },
    claim: {
      subject: (n) => `Objednávka ${n} — vyřízení reklamace`,
      body: "vaši reklamaci jsme posoudili s tímto výsledkem: (doplňte).\n\nDalší postup: (doplňte — výměna zboží, vrácení peněz, oprava).\n\nDěkujeme za trpělivost.",
    },
    pickup: {
      subject: (n) => `Objednávka ${n} je připravena k vyzvednutí`,
      body: (addr) => `vaše objednávka je připravena k osobnímu odběru.\n\nKde: ${addr || "(doplňte adresu)"}\nKdy: (doplňte otevírací dobu / termín)\n\nPři převzetí stačí uvést číslo objednávky.`,
    },
  },
  en: {
    hello: (n) => (n ? `Hello ${n},` : "Hello,"),
    regards: "Kind regards",
    custom: { subject: (n) => `Regarding your order ${n} — Reptiplus`, body: "(message text)" },
    delay: {
      subject: (n) => `Order ${n} — delivery delay`,
      body: "we're sorry, your order has been delayed. Reason: (fill in).\n\nNew estimated dispatch date: (fill in).\n\nIf the new date doesn't suit you, just let us know — we can adjust or cancel the order and refund you.",
    },
    question: {
      subject: (n) => `Order ${n} — we need to clarify something`,
      body: "we need to clarify one thing regarding your order:\n\n(fill in the question — e.g. address, variant, replacement for an out-of-stock item)\n\nJust reply to this e-mail and we'll process the order right away.",
    },
    claim: {
      subject: (n) => `Order ${n} — claim resolution`,
      body: "we've assessed your claim with the following result: (fill in).\n\nNext steps: (fill in — replacement, refund, repair).\n\nThank you for your patience.",
    },
    pickup: {
      subject: (n) => `Order ${n} is ready for pickup`,
      body: (addr) => `your order is ready for collection.\n\nWhere: ${addr || "(fill in the address)"}\nWhen: (fill in opening hours / date)\n\nJust quote your order number when collecting.`,
    },
  },
  de: {
    hello: (n) => (n ? `Guten Tag ${n},` : "Guten Tag,"),
    regards: "Mit freundlichen Grüßen",
    custom: { subject: (n) => `Zu Ihrer Bestellung ${n} — Reptiplus`, body: "(Nachrichtentext)" },
    delay: {
      subject: (n) => `Bestellung ${n} — Lieferverzögerung`,
      body: "leider verzögert sich Ihre Bestellung. Grund: (ausfüllen).\n\nNeuer voraussichtlicher Versandtermin: (ausfüllen).\n\nSollte Ihnen der Termin nicht passen, geben Sie uns bitte Bescheid — wir können die Bestellung anpassen oder stornieren und den Betrag erstatten.",
    },
    question: {
      subject: (n) => `Bestellung ${n} — Rückfrage`,
      body: "zu Ihrer Bestellung müssen wir noch etwas klären:\n\n(Frage ausfüllen — z. B. Adresse, Variante, Ersatz für ausverkaufte Ware)\n\nAntworten Sie einfach auf diese E-Mail, dann bearbeiten wir die Bestellung sofort.",
    },
    claim: {
      subject: (n) => `Bestellung ${n} — Reklamationsbearbeitung`,
      body: "wir haben Ihre Reklamation mit folgendem Ergebnis geprüft: (ausfüllen).\n\nWeiteres Vorgehen: (ausfüllen — Umtausch, Erstattung, Reparatur).\n\nVielen Dank für Ihre Geduld.",
    },
    pickup: {
      subject: (n) => `Bestellung ${n} ist abholbereit`,
      body: (addr) => `Ihre Bestellung ist zur Abholung bereit.\n\nWo: ${addr || "(Adresse ausfüllen)"}\nWann: (Öffnungszeiten / Termin ausfüllen)\n\nBei der Abholung genügt die Bestellnummer.`,
    },
  },
};

function safeLocale(v: string): Locale {
  return v === "en" || v === "de" ? v : "cs";
}

export function buildOrderMessageDraft(kind: OrderMessageKind, o: OrderForMessage): OrderMessageDraft {
  const c = COPY[safeLocale(o.locale)];
  const sig = [c.regards, o.shopName, o.shopPhone, o.shopEmail].filter(Boolean).join("\n");
  const body = kind === "pickup" ? c.pickup.body(o.shopAddress) : c[kind].body;
  return {
    subject: c[kind].subject(o.number),
    body: [c.hello(o.customerName), body, sig].join("\n\n"),
  };
}

export function buildAllOrderMessageDrafts(o: OrderForMessage): Record<OrderMessageKind, OrderMessageDraft> {
  return Object.fromEntries(ORDER_MESSAGE_KINDS.map((k) => [k, buildOrderMessageDraft(k, o)])) as Record<
    OrderMessageKind,
    OrderMessageDraft
  >;
}

/** Zbylý zástupný text „(doplňte)" apod. — e-mail se s ním neodešle. */
export const PLACEHOLDER_RE = /\((?:doplňte|text zprávy|fill in|message text|ausfüllen|Nachrichtentext|Adresse ausfüllen|Frage ausfüllen|Öffnungszeiten)[^)]*\)/i;
