import "server-only";
import { getContentI18n } from "@/lib/settings";

/**
 * Ecomail API v2 (https://docs.ecomail.cz/api-reference) — tenký klient.
 * Klíč a ID seznamu jsou v `app_setting` `integrations.ecomail` (Nastavení → Integrace).
 * Všechna volání jdou ze serveru (Ecomail blokuje volání z prohlížeče), limit 1000 požadavků/min.
 */
const BASE = "https://api2.ecomailapp.cz";

export type EcomailConfig = {
  apiKey: string;
  listId: number | null;
  /** Název obchodu v transakcích (segmentace „shop“). */
  shopName: string;
  /** Zákazníky z objednávek přidávat do seznamu se štítkem „zakaznik“. */
  syncCustomers: boolean;
  /** Posílat objednávky jako transakce (tržby a položky u kontaktu). */
  sendTransactions: boolean;
  /** Tajný token v URL webhooku (odhlášení z Ecomailu → odhlásit i u nás). */
  webhookToken: string;
};

export async function getEcomailConfig(): Promise<EcomailConfig> {
  const v = (await getContentI18n("integrations.ecomail").catch(() => ({}))) as Record<string, unknown>;
  const listRaw = v.listId;
  const listId =
    typeof listRaw === "number" && Number.isFinite(listRaw)
      ? listRaw
      : typeof listRaw === "string" && /^\d+$/.test(listRaw.trim())
        ? parseInt(listRaw, 10)
        : null;
  return {
    apiKey: typeof v.apiKey === "string" ? v.apiKey.trim() : "",
    listId,
    shopName: typeof v.shopName === "string" && v.shopName.trim() ? v.shopName.trim() : "Reptiplus",
    syncCustomers: v.syncCustomers === true,
    sendTransactions: v.sendTransactions === true,
    webhookToken: typeof v.webhookToken === "string" ? v.webhookToken : "",
  };
}

/** Napojení je aktivní, když je klíč i seznam. */
export function ecomailEnabled(c: EcomailConfig): c is EcomailConfig & { listId: number } {
  return c.apiKey.length > 0 && c.listId != null;
}

export class EcomailError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
  }
}

export async function ecomailRequest<T = unknown>(
  apiKey: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}/${path.replace(/^\//, "")}`, {
    method,
    headers: { key: apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : null) ?? `Ecomail ${res.status}`;
    throw new EcomailError(msg, res.status, data);
  }
  return data as T;
}

export type EcomailSubscriber = {
  email: string;
  name?: string;
  surname?: string;
  phone?: string;
  city?: string;
  street?: string;
  zip?: string;
  country?: string;
  company?: string;
  source?: string;
  tags?: string[];
  custom_fields?: Record<string, string | number>;
  /** 1 = přihlášen, 2 = odhlášen. */
  status?: 1 | 2;
};

/** Přidá / aktualizuje kontakt v seznamu (náš double opt-in už proběhl → bez potvrzení v Ecomailu). */
export async function subscribe(c: EcomailConfig & { listId: number }, sub: EcomailSubscriber, opts: { resubscribe?: boolean; triggerAutomations?: boolean } = {}) {
  return ecomailRequest<{ id: number; already_subscribed?: boolean }>(c.apiKey, "POST", `lists/${c.listId}/subscribe`, {
    subscriber_data: sub,
    update_existing: true,
    skip_confirmation: true,
    resubscribe: opts.resubscribe ?? false,
    trigger_autoresponders: opts.triggerAutomations ?? true,
  });
}

/** Hromadně (max 3000 na volání; vždy bez potvrzení). */
export async function subscribeBulk(c: EcomailConfig & { listId: number }, subs: EcomailSubscriber[], opts: { resubscribe?: boolean } = {}) {
  let inserts = 0;
  for (let i = 0; i < subs.length; i += 3000) {
    const res = await ecomailRequest<{ inserts?: number }>(c.apiKey, "POST", `lists/${c.listId}/subscribe-bulk`, {
      subscriber_data: subs.slice(i, i + 3000),
      update_existing: true,
      resubscribe: opts.resubscribe ?? false,
      trigger_autoresponders: false,
    });
    inserts += res?.inserts ?? 0;
  }
  return inserts;
}

export async function unsubscribe(c: EcomailConfig & { listId: number }, email: string) {
  return ecomailRequest(c.apiKey, "DELETE", `lists/${c.listId}/unsubscribe`, { email });
}

export type EcomailList = { id: number; name: string; double_optin?: boolean | null };
export async function listLists(apiKey: string): Promise<EcomailList[]> {
  const res = await ecomailRequest<EcomailList[] | { data?: EcomailList[] }>(apiKey, "GET", "lists");
  return Array.isArray(res) ? res : (res?.data ?? []);
}

export type EcomailTransaction = {
  order_id: string;
  email: string;
  shop?: string;
  amount?: number;
  tax?: number;
  shipping?: number;
  city?: string;
  country?: string;
  timestamp?: number;
  status?: "processing" | "canceled" | "pending" | "completed";
  props?: Record<string, string | number>;
};
export type EcomailTransactionItem = {
  code?: string;
  title?: string;
  categories?: string[];
  price?: number;
  amount?: number;
};

export async function createTransaction(apiKey: string, transaction: EcomailTransaction, items: EcomailTransactionItem[]) {
  return ecomailRequest(apiKey, "POST", "tracker/transaction", { transaction, transaction_items: items });
}
/** Přepíše celou transakci (např. změna stavu na completed / canceled). */
export async function updateTransaction(apiKey: string, transaction: EcomailTransaction, items: EcomailTransactionItem[]) {
  return ecomailRequest(apiKey, "PUT", `tracker/transaction/${encodeURIComponent(transaction.order_id)}`, { transaction, transaction_items: items });
}
export async function deleteTransaction(apiKey: string, orderId: string) {
  return ecomailRequest(apiKey, "DELETE", `tracker/transaction/${encodeURIComponent(orderId)}/delete`);
}
