import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Comgate platební brána — REST API v1.0 (form-encoded).
 * Dokumentace: https://apidoc.comgate.cz/
 *
 * Přihlašovací údaje se berou z app_setting (`integrations.comgate`), který
 * plní admin (Nastavení → Integrace), s fallbackem na env proměnné.
 */

const BASE = "https://payments.comgate.cz/v1.0";

export type ComgateConfig = { merchant: string; secret: string; test: boolean };

/** Načte konfiguraci Comgate. Vrací null, pokud chybí merchant nebo secret. */
export async function getComgateConfig(): Promise<ComgateConfig | null> {
  let merchant = "";
  let secret = "";
  let test: boolean | undefined;

  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("app_setting")
      .select("value")
      .eq("key", "integrations.comgate")
      .maybeSingle();
    const v = (data?.value ?? {}) as {
      merchant?: string;
      secret?: string;
      test?: boolean;
    };
    merchant = v.merchant ?? "";
    secret = v.secret ?? "";
    if (typeof v.test === "boolean") test = v.test;
  } catch {
    // app_setting nedostupné → fallback na env
  }

  merchant = merchant || process.env.COMGATE_MERCHANT || "";
  secret = secret || process.env.COMGATE_SECRET || "";
  if (test === undefined) test = process.env.COMGATE_TEST === "true";

  if (!merchant || !secret) return null;
  return { merchant, secret, test };
}

export type CreatePaymentInput = {
  /** Cena v minor units (haléře / eurocenty) — musí být > 0. */
  price: number;
  /** Měna: CZK | EUR. */
  curr: string;
  /** Reference obchodníka = číslo objednávky. */
  refId: string;
  /** Krátký popis (zobrazí se u platby). */
  label: string;
  email: string;
  fullName?: string;
  /** Jazyk brány (cs/en/de/sk…). */
  lang?: string;
  /** Předvybraná metoda na bráně (`method` u /create), výchozí ALL. */
  method?: string;
  urlPaid: string;
  urlPending: string;
  urlCancelled: string;
};

export type CreatePaymentResult = { transId: string; redirect: string };

/** Založí platbu v Comgate a vrátí transId + URL brány, kam přesměrovat zákazníka. */
export async function createComgatePayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const cfg = await getComgateConfig();
  if (!cfg) throw new Error("Comgate není nakonfigurován (chybí merchant/secret).");
  if (!Number.isInteger(input.price) || input.price <= 0)
    throw new Error("Comgate: neplatná částka.");

  const body = new URLSearchParams({
    merchant: cfg.merchant,
    secret: cfg.secret,
    price: String(input.price),
    curr: input.curr,
    label: input.label.slice(0, 16),
    refId: input.refId,
    method: input.method || "ALL",
    email: input.email,
    prepareOnly: "true",
    lang: input.lang ?? "cs",
    country: "CZ",
    url_paid: input.urlPaid,
    url_pending: input.urlPending,
    url_cancelled: input.urlCancelled,
  });
  if (cfg.test) body.set("test", "true");
  // fullName je podle aktuální dokumentace povinný → fallback na e-mail.
  body.set("fullName", (input.fullName || input.email).slice(0, 255));

  const res = await fetch(`${BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const p = new URLSearchParams(await res.text());
  if (p.get("code") !== "0") {
    throw new Error(
      `Comgate create selhalo: code=${p.get("code")} message=${p.get("message") ?? ""}`,
    );
  }
  const transId = p.get("transId") ?? "";
  const redirect = p.get("redirect") ?? "";
  if (!transId || !redirect) throw new Error("Comgate: chybí transId/redirect v odpovědi.");
  return { transId, redirect };
}

export type RefundResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Vrátí (refunduje) část nebo celou částku platby přes Comgate /refund.
 * `amount` je v minor units (haléře / eurocenty) v měně původní platby —
 * měnu Comgate nebere jako parametr, vrací se vždy v měně platby.
 */
export async function refundComgatePayment(
  transId: string,
  amount: number,
): Promise<RefundResult> {
  const cfg = await getComgateConfig();
  if (!cfg) return { ok: false, error: "Comgate není nakonfigurován." };
  if (!transId) return { ok: false, error: "Chybí Comgate reference platby." };
  if (!Number.isInteger(amount) || amount <= 0)
    return { ok: false, error: "Neplatná částka refundace." };

  const body = new URLSearchParams({
    merchant: cfg.merchant,
    secret: cfg.secret,
    transId,
    amount: String(amount),
  });
  if (cfg.test) body.set("test", "true");

  let text = "";
  try {
    const res = await fetch(`${BASE}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    text = await res.text();
  } catch {
    return { ok: false, error: "Comgate je nedostupný." };
  }
  const p = new URLSearchParams(text);
  if (p.get("code") !== "0") {
    return {
      ok: false,
      error: `Comgate refund selhal: code=${p.get("code")} ${p.get("message") ?? ""}`.trim(),
    };
  }
  return { ok: true };
}

export type ComgatePaymentStatus = {
  /** PAID | CANCELLED | PENDING | AUTHORIZED */
  status: string;
  /** Reference obchodníka = číslo objednávky. */
  refId: string;
  /** Částka v minor units. */
  price: number;
  curr: string;
};

/**
 * Ověří skutečný stav platby přes /status. Protože se volá s naším
 * merchant/secret, úspěšná odpověď zároveň dokazuje, že platba patří nám.
 * Vrací null při chybě (síť, neznámá transakce, nenakonfigurováno).
 */
export async function getComgatePayment(transId: string): Promise<ComgatePaymentStatus | null> {
  const cfg = await getComgateConfig();
  if (!cfg || !transId) return null;
  const body = new URLSearchParams({
    merchant: cfg.merchant,
    secret: cfg.secret,
    transId,
  });
  try {
    const res = await fetch(`${BASE}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    const p = new URLSearchParams(await res.text());
    if (p.get("code") !== "0" || !p.get("status")) return null;
    return {
      status: p.get("status") ?? "",
      refId: p.get("refId") ?? "",
      price: Number(p.get("price") ?? 0),
      curr: p.get("curr") ?? "",
    };
  } catch {
    return null;
  }
}

/** Zkratka: jen stav platby (PAID|CANCELLED|PENDING|AUTHORIZED) nebo null. */
export async function getComgateStatus(transId: string): Promise<string | null> {
  return (await getComgatePayment(transId))?.status ?? null;
}

/* ── Platební metody pro výběr v pokladně ─────────────────────────────── */

/**
 * Varianty platby přes Comgate, které nabízíme rovnou v pokladně.
 * Hodnota = parametr `method` pro /create (předvybere metodu na bráně).
 * `ALL` = brána nabídne vše (fallback, „Zaplatit znovu").
 */
export const COMGATE_VARIANTS = ["CARD_ALL", "APPLEPAY_REDIRECT", "GOOGLEPAY_REDIRECT", "BANK_ONLY", "LATER_ALL", "ALL"] as const;
export type ComgateVariant = (typeof COMGATE_VARIANTS)[number];

export function isComgateVariant(v: string): v is ComgateVariant {
  return (COMGATE_VARIANTS as readonly string[]).includes(v);
}

type MethodsCacheEntry = { at: number; variants: ComgateVariant[] | null };
const methodsCache = new Map<string, MethodsCacheEntry>();
const METHODS_TTL = 10 * 60_000;

/**
 * Které varianty má obchod v Comgate povolené (přes /methods, filtrované měnou).
 * Výsledek se drží 10 minut v paměti instance. Při chybě vrací null → pokladna
 * nabídne jen obecnou platbu přes bránu (`ALL`).
 */
export async function getComgateVariants(curr: string): Promise<ComgateVariant[] | null> {
  const hit = methodsCache.get(curr);
  if (hit && Date.now() - hit.at < METHODS_TTL) return hit.variants;

  const cfg = await getComgateConfig();
  if (!cfg) return null;
  let variants: ComgateVariant[] | null = null;
  try {
    const body = new URLSearchParams({
      merchant: cfg.merchant,
      secret: cfg.secret,
      type: "json",
      curr,
    });
    const res = await fetch(`${BASE}/methods`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    const json = (await res.json()) as { methods?: { id?: string }[] };
    const ids = (json.methods ?? []).map((m) => String(m.id ?? ""));
    if (ids.length > 0) {
      variants = [];
      if (ids.some((id) => id.startsWith("CARD_"))) variants.push("CARD_ALL");
      if (ids.includes("APPLEPAY_REDIRECT")) variants.push("APPLEPAY_REDIRECT");
      if (ids.includes("GOOGLEPAY_REDIRECT")) variants.push("GOOGLEPAY_REDIRECT");
      if (ids.some((id) => id.startsWith("BANK_"))) variants.push("BANK_ONLY");
      if (ids.some((id) => id.startsWith("LATER_"))) variants.push("LATER_ALL");
    }
  } catch (e) {
    console.error("[comgate] načtení platebních metod selhalo:", e);
  }
  methodsCache.set(curr, { at: Date.now(), variants });
  return variants;
}
