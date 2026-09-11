/**
 * Stavy a typy událostí poptávek LEDX. Bez "server-only" — používá je
 * admin UI (server i client komponenty).
 */

export const INQUIRY_STATUSES = [
  "new",
  "in_progress",
  "quoted",
  "won",
  "lost",
  "cancelled",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/** Otevřené stavy = čekají na akci obchodu nebo zákazníka (odznak v menu). */
export const OPEN_STATUSES: readonly InquiryStatus[] = ["new", "in_progress", "quoted"];

export const STATUS_META: Record<
  InquiryStatus,
  { label: string; short: string; cls: string; dot: string; hint: string }
> = {
  new: {
    label: "Nová",
    short: "Nová",
    cls: "bg-amber/15 text-amber",
    dot: "bg-amber",
    hint: "Zatím bez reakce obchodu.",
  },
  in_progress: {
    label: "V řešení",
    short: "Řeším",
    cls: "bg-forest/10 text-forest",
    dot: "bg-forest",
    hint: "Komunikujeme se zákazníkem, připravujeme nabídku.",
  },
  quoted: {
    label: "Nabídka odeslána",
    short: "Nabídka",
    cls: "bg-gold/15 text-earth",
    dot: "bg-gold",
    hint: "Čekáme na rozhodnutí zákazníka.",
  },
  won: {
    label: "Objednáno",
    short: "Objednáno",
    cls: "bg-success/15 text-success",
    dot: "bg-success",
    hint: "Zákazník objednal, poptávka je uzavřená.",
  },
  lost: {
    label: "Zamítnuto",
    short: "Zamítnuto",
    cls: "bg-gray-soft/20 text-gray-soft",
    dot: "bg-gray-soft",
    hint: "Zákazník nabídku nevyužil nebo přestal reagovat.",
  },
  cancelled: {
    label: "Zrušeno",
    short: "Zrušeno",
    cls: "bg-error/10 text-error",
    dot: "bg-error",
    hint: "Poptávku jsme nemohli vyřídit nebo ji zákazník stáhl.",
  },
};

export function isInquiryStatus(v: unknown): v is InquiryStatus {
  return typeof v === "string" && (INQUIRY_STATUSES as readonly string[]).includes(v);
}

export function isOpenStatus(s: string): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(s);
}

/** Druhy e-mailů, které admin posílá zákazníkovi z detailu poptávky. */
export const EMAIL_KINDS = ["quote", "question", "order_confirmed", "cancel"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_KIND_META: Record<
  EmailKind,
  { label: string; description: string; suggestStatus: InquiryStatus }
> = {
  quote: {
    label: "Cenová nabídka",
    description: "Shrnutí poptávky, cena a platnost nabídky.",
    suggestStatus: "quoted",
  },
  question: {
    label: "Doplňující dotaz",
    description: "Prosba o upřesnění (prostor, výška zavěšení, fotky…).",
    suggestStatus: "in_progress",
  },
  order_confirmed: {
    label: "Potvrzení objednání",
    description: "Potvrzujeme objednávku, termín dodání a platební údaje.",
    suggestStatus: "won",
  },
  cancel: {
    label: "Zrušení / zamítnutí",
    description: "Poptávku uzavíráme; volitelně s důvodem.",
    suggestStatus: "cancelled",
  },
};

export function isEmailKind(v: unknown): v is EmailKind {
  return typeof v === "string" && (EMAIL_KINDS as readonly string[]).includes(v);
}

/** Typy událostí v historii poptávky (tabulka ledx_inquiry_event). */
export type InquiryEventType = "note" | "status" | "email" | "quote" | "follow_up" | "system";

/** Počet pracovních dnů (po–pá) mezi dvěma okamžiky, zaokrouhleno dolů. */
export function businessDaysBetween(from: Date, to: Date): number {
  let days = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) days++;
  }
  return days;
}

/** Nová poptávka bez reakce déle než 2 pracovní dny = po lhůtě slibované zákazníkovi. */
export const RESPONSE_SLA_DAYS = 2;

export function isOverdue(status: string, createdAt: string, now = new Date()): boolean {
  return status === "new" && businessDaysBetween(new Date(createdAt), now) >= RESPONSE_SLA_DAYS;
}

export function isFollowUpDue(followUpAt: string | null, now = new Date()): boolean {
  if (!followUpAt) return false;
  const today = now.toISOString().slice(0, 10);
  return followUpAt <= today;
}

/** Formát částky nabídky (minor units → text). */
export function formatQuote(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return "";
  const cur = currency === "EUR" ? "EUR" : "CZK";
  return new Intl.NumberFormat(cur === "CZK" ? "cs-CZ" : "de-DE", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: cur === "CZK" ? 0 : 2,
  }).format(amount / 100);
}
