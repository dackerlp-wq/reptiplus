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
    method: "ALL",
    email: input.email,
    prepareOnly: "true",
    lang: input.lang ?? "cs",
    country: "CZ",
    url_paid: input.urlPaid,
    url_pending: input.urlPending,
    url_cancelled: input.urlCancelled,
  });
  if (cfg.test) body.set("test", "true");
  if (input.fullName) body.set("fullName", input.fullName);

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
 * `amount` je v minor units (haléře / eurocenty). `curr` musí odpovídat platbě.
 */
export async function refundComgatePayment(
  transId: string,
  amount: number,
  curr: string,
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
    curr,
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

/** Ověří skutečný stav platby přes /status. Vrací PAID|CANCELLED|PENDING|AUTHORIZED nebo null. */
export async function getComgateStatus(transId: string): Promise<string | null> {
  const cfg = await getComgateConfig();
  if (!cfg) return null;
  const body = new URLSearchParams({
    merchant: cfg.merchant,
    secret: cfg.secret,
    transId,
  });
  const res = await fetch(`${BASE}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const p = new URLSearchParams(await res.text());
  if (p.get("code") !== "0") return null;
  return p.get("status");
}
