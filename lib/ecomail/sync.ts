import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { pickI18n } from "@/lib/i18n";
import {
  createTransaction,
  deleteTransaction,
  ecomailEnabled,
  getEcomailConfig,
  subscribe,
  subscribeBulk,
  unsubscribe,
  updateTransaction,
  EcomailError,
  type EcomailSubscriber,
  type EcomailTransaction,
  type EcomailTransactionItem,
} from "@/lib/ecomail/client";

/**
 * Synchronizace do Ecomailu — nikdy nevyhazuje, chyby jen loguje
 * (newsletter ani objednávka nesmí spadnout kvůli externí službě).
 */

export const TAG_NEWSLETTER = "newsletter";
export const TAG_CUSTOMER = "zakaznik";

function splitName(full: string | null | undefined): { name?: string; surname?: string } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { name: parts[0] };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

function logErr(where: string, e: unknown) {
  if (e instanceof EcomailError) console.error(`[ecomail] ${where}: ${e.status} ${e.message}`, e.body);
  else console.error(`[ecomail] ${where}:`, e);
}

/** Štítky se v Ecomailu přepisují celé → spočítat je z našich dat (odběratel newsletteru? zákazník?). */
async function tagsFor(email: string, c: { syncCustomers: boolean }, assume: { newsletter?: boolean; customer?: boolean } = {}): Promise<string[]> {
  const svc = createServiceClient();
  const tags: string[] = [];
  let isNewsletter = assume.newsletter ?? false;
  let isCustomer = assume.customer ?? false;
  if (!isNewsletter) {
    const { data } = await svc.from("newsletter_subscriber").select("confirmed_at, unsubscribed_at").ilike("email", email).maybeSingle();
    isNewsletter = !!data?.confirmed_at && !data.unsubscribed_at;
  }
  if (!isCustomer && c.syncCustomers) {
    const { count } = await svc.from("order").select("id", { count: "exact", head: true }).ilike("email", email).neq("status", "cancelled");
    isCustomer = (count ?? 0) > 0;
  }
  if (isNewsletter) tags.push(TAG_NEWSLETTER);
  if (isCustomer && c.syncCustomers) tags.push(TAG_CUSTOMER);
  return tags;
}

async function markSynced(email: string) {
  await createServiceClient()
    .from("newsletter_subscriber")
    .update({ ecomail_synced_at: new Date().toISOString() })
    .ilike("email", email);
}

/** Potvrzený odběratel newsletteru → kontakt v seznamu se štítkem „newsletter“. */
export async function syncNewsletterSubscriber(input: { email: string; locale: string; source?: string | null; fullName?: string | null }): Promise<boolean> {
  try {
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c)) return false;
    await subscribe(
      c,
      {
        email: input.email,
        ...splitName(input.fullName),
        source: `reptiplus-${input.source ?? "web"}`,
        tags: await tagsFor(input.email, c, { newsletter: true }),
        custom_fields: { jazyk: input.locale, newsletter: "ano" },
        status: 1,
      },
      { resubscribe: true, triggerAutomations: true },
    );
    await markSynced(input.email);
    return true;
  } catch (e) {
    logErr("subscribe", e);
    return false;
  }
}

/** Odhlášení (z webu, účtu, adminu) → odhlásit i v Ecomailu. */
export async function syncUnsubscribe(email: string): Promise<boolean> {
  try {
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c)) return false;
    await unsubscribe(c, email);
    return true;
  } catch (e) {
    // 404 = kontakt v Ecomailu není, to není chyba.
    if (!(e instanceof EcomailError && e.status === 404)) logErr("unsubscribe", e);
    return false;
  }
}

type OrderRow = {
  id: string;
  number: string;
  email: string;
  status: string;
  payment_status: string;
  currency: string;
  subtotal: number;
  shipping: number;
  payment_fee: number;
  discount: number;
  total: number;
  locale: string;
  created_at: string;
  shipping_address: { full_name?: string; city?: string; postal_code?: string; street?: string; country?: string; phone?: string } | null;
  order_item: { product_id: string | null; name: string; sku: string | null; qty: number; line_total: number; vat_rate: number | null }[] | null;
};

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("order")
    .select("id, number, email, status, payment_status, currency, subtotal, shipping, payment_fee, discount, total, locale, created_at, shipping_address, order_item(product_id, name, sku, qty, line_total, vat_rate)")
    .eq("id", orderId)
    .maybeSingle();
  return (data as unknown as OrderRow) ?? null;
}

/** Transakce Ecomailu z objednávky; částky v měně objednávky (Kč / €), ne v haléřích. */
async function buildTransaction(o: OrderRow, status: EcomailTransaction["status"], shop: string): Promise<{ t: EcomailTransaction; items: EcomailTransactionItem[] }> {
  const svc = createServiceClient();
  const ids = (o.order_item ?? []).map((i) => i.product_id).filter((x): x is string => !!x);
  const { data: prods } = ids.length
    ? await svc.from("product").select("id, category:category_id(name_i18n, name)").in("id", ids)
    : { data: [] as { id: string; category: unknown }[] };
  const catById = new Map<string, string>();
  for (const p of prods ?? []) {
    const c = p.category as { name_i18n?: Record<string, string>; name?: string } | { name_i18n?: Record<string, string>; name?: string }[] | null;
    const one = Array.isArray(c) ? c[0] : c;
    if (one) catById.set(p.id, pickI18n(one.name_i18n ?? null, "cs", one.name ?? ""));
  }
  const major = (minor: number) => Math.round(minor) / 100;
  const items: EcomailTransactionItem[] = (o.order_item ?? []).map((i) => ({
    code: i.sku ?? i.product_id ?? undefined,
    title: i.name,
    categories: i.product_id && catById.get(i.product_id) ? [catById.get(i.product_id)!] : undefined,
    price: major(i.line_total),
    amount: i.qty,
  }));
  const vat = (o.order_item ?? []).reduce((s, i) => {
    const rate = (i.vat_rate ?? 21) / 100;
    return s + (i.line_total - i.line_total / (1 + rate));
  }, 0);
  const a = o.shipping_address ?? {};
  return {
    t: {
      order_id: o.number,
      email: o.email,
      shop,
      amount: major(o.total),
      tax: major(vat),
      shipping: major(o.shipping + o.payment_fee),
      city: a.city || undefined,
      country: a.country || undefined,
      timestamp: Math.floor(new Date(o.created_at).getTime() / 1000),
      status,
      props: { currency: o.currency, number: o.number, payment_status: o.payment_status },
    },
    items,
  };
}

/**
 * Po vytvoření objednávky: zákazník do seznamu (štítek „zakaznik“, pokud je to zapnuté)
 * a objednávka jako transakce (pending / completed podle platby).
 */
export async function syncOrderCreated(orderId: string): Promise<void> {
  try {
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c) || (!c.syncCustomers && !c.sendTransactions)) return;
    const o = await loadOrder(orderId);
    if (!o) return;
    const a = o.shipping_address ?? {};
    if (c.syncCustomers) {
      // Existující kontakt se neodhlašuje ani nepřihlašuje znovu (resubscribe false) — jen doplní údaje a štítek.
      const sub: EcomailSubscriber = {
        email: o.email,
        ...splitName(a.full_name),
        phone: a.phone || undefined,
        city: a.city || undefined,
        street: a.street || undefined,
        zip: a.postal_code || undefined,
        country: a.country || undefined,
        source: "reptiplus-objednavka",
        tags: await tagsFor(o.email, c, { customer: true }),
        custom_fields: {
          jazyk: o.locale,
          posledni_objednavka: o.created_at.slice(0, 10),
          posledni_objednavka_cislo: o.number,
        },
      };
      try {
        await subscribe(c, sub, { resubscribe: false, triggerAutomations: true });
      } catch (e) {
        logErr("order subscribe", e);
      }
    }
    if (c.sendTransactions) {
      const { t, items } = await buildTransaction(o, o.payment_status === "paid" ? "completed" : "pending", c.shopName);
      try {
        await createTransaction(c.apiKey, t, items);
      } catch (e) {
        if (e instanceof EcomailError && e.status === 422) {
          // Už existuje (opakované volání) → přepsat.
          await updateTransaction(c.apiKey, t, items).catch((e2) => logErr("transaction update", e2));
        } else logErr("transaction create", e);
      }
    }
  } catch (e) {
    logErr("order", e);
  }
}

/** Změna stavu objednávky (zaplaceno / storno / vráceno) → stav transakce. */
export async function syncOrderStatus(orderId: string, status: "completed" | "canceled" | "processing"): Promise<void> {
  try {
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c) || !c.sendTransactions) return;
    const o = await loadOrder(orderId);
    if (!o) return;
    const { t, items } = await buildTransaction(o, status, c.shopName);
    try {
      await updateTransaction(c.apiKey, t, items);
    } catch (e) {
      if (e instanceof EcomailError && e.status === 404) await createTransaction(c.apiKey, t, items).catch((e2) => logErr("transaction create", e2));
      else logErr("transaction status", e);
    }
  } catch (e) {
    logErr("order status", e);
  }
}

/** Smazání transakce (např. storno nezaplacené objednávky). */
export async function syncOrderDeleted(orderNumber: string): Promise<void> {
  try {
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c) || !c.sendTransactions) return;
    await deleteTransaction(c.apiKey, orderNumber);
  } catch (e) {
    if (!(e instanceof EcomailError && e.status === 404)) logErr("transaction delete", e);
  }
}

export type BulkSyncResult = { ok: true; subscribed: number; unsubscribed: number; customers: number } | { ok: false; error: string };

/**
 * Hromadná synchronizace z adminu: všichni potvrzení odběratelé do seznamu,
 * odhlášení odhlásit, a (pokud je zapnuté) zákazníci z objednávek se štítkem „zakaznik“.
 */
export async function bulkSyncToEcomail(): Promise<BulkSyncResult> {
  const c = await getEcomailConfig();
  if (!ecomailEnabled(c)) return { ok: false, error: "Chybí API klíč nebo ID seznamu (Nastavení → Integrace → Ecomail)." };
  const svc = createServiceClient();
  try {
    const { data: subs } = await svc
      .from("newsletter_subscriber")
      .select("email, locale, source, confirmed_at, unsubscribed_at, customer:customer_id(full_name)")
      .limit(20000);
    const confirmed = (subs ?? []).filter((s) => s.confirmed_at && !s.unsubscribed_at);
    const unsubscribed = (subs ?? []).filter((s) => s.unsubscribed_at);
    const nameOf = (s: { customer: unknown }) => {
      const cu = s.customer as { full_name?: string | null } | { full_name?: string | null }[] | null;
      const one = Array.isArray(cu) ? cu[0] : cu;
      return one?.full_name ?? null;
    };
    // Zákazníci (e-maily nestornovaných objednávek) kvůli kombinaci štítků.
    const customerEmails = new Set<string>();
    if (c.syncCustomers) {
      const { data: oe } = await svc.from("order").select("email").neq("status", "cancelled").limit(20000);
      for (const o of oe ?? []) customerEmails.add(o.email.toLowerCase());
    }
    const subscribed = await subscribeBulk(
      c,
      confirmed.map((s) => ({
        email: s.email,
        ...splitName(nameOf(s)),
        source: `reptiplus-${s.source ?? "web"}`,
        tags: customerEmails.has(s.email.toLowerCase()) ? [TAG_NEWSLETTER, TAG_CUSTOMER] : [TAG_NEWSLETTER],
        custom_fields: { jazyk: s.locale, newsletter: "ano" },
        status: 1 as const,
      })),
      { resubscribe: true },
    );
    if (confirmed.length > 0) {
      await svc
        .from("newsletter_subscriber")
        .update({ ecomail_synced_at: new Date().toISOString() })
        .not("confirmed_at", "is", null)
        .is("unsubscribed_at", null);
    }
    let unsubCount = 0;
    for (const s of unsubscribed) {
      try {
        await unsubscribe(c, s.email);
        unsubCount++;
      } catch (e) {
        if (!(e instanceof EcomailError && e.status === 404)) logErr("bulk unsubscribe", e);
      }
    }
    let customers = 0;
    if (c.syncCustomers) {
      const { data: orders } = await svc
        .from("order")
        .select("email, locale, created_at, number, shipping_address")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20000);
      const byEmail = new Map<string, EcomailSubscriber>();
      for (const o of orders ?? []) {
        const key = o.email.toLowerCase();
        if (byEmail.has(key)) continue;
        const a = (o.shipping_address ?? {}) as { full_name?: string; city?: string; postal_code?: string; street?: string; country?: string; phone?: string };
        byEmail.set(key, {
          email: o.email,
          ...splitName(a.full_name),
          phone: a.phone || undefined,
          city: a.city || undefined,
          zip: a.postal_code || undefined,
          country: a.country || undefined,
          source: "reptiplus-objednavka",
          tags: [TAG_CUSTOMER],
          custom_fields: { jazyk: o.locale, posledni_objednavka: o.created_at.slice(0, 10), posledni_objednavka_cislo: o.number },
        });
      }
      // Odběratele newsletteru nepřepisovat štítkem zákazníka (tags se přepisují celé) → oba štítky.
      const newsletterEmails = new Set(confirmed.map((s) => s.email.toLowerCase()));
      const list = [...byEmail.values()].map((s) => (newsletterEmails.has(s.email.toLowerCase()) ? { ...s, tags: [TAG_NEWSLETTER, TAG_CUSTOMER] } : s));
      customers = await subscribeBulk(c, list, { resubscribe: false });
    }
    return { ok: true, subscribed, unsubscribed: unsubCount, customers };
  } catch (e) {
    logErr("bulk", e);
    return { ok: false, error: e instanceof Error ? e.message : "Synchronizace selhala." };
  }
}
