import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { pickI18n } from "@/lib/i18n";
import { getCnbEurRate } from "@/lib/exchange-rate";
import {
  createTransaction,
  deleteTransaction,
  ecomailEnabled,
  getEcomailConfig,
  subscribe,
  subscribeBulk,
  trackEvent,
  unsubscribe,
  updateTransaction,
  EcomailError,
  type EcomailConfig,
  type EcomailEvent,
  type EcomailSubscriber,
  type EcomailTransaction,
  type EcomailTransactionItem,
} from "@/lib/ecomail/client";
import { buildCustomerProfile, profileFields, rootCategoryResolver, type CustomerProfile, type ProfileOrder } from "@/lib/ecomail/profile";

/**
 * Synchronizace do Ecomailu — nikdy nevyhazuje, chyby jen loguje
 * (newsletter ani objednávka nesmí spadnout kvůli externí službě).
 *
 * Pravidlo, kdo smí do seznamu: potvrzený odběratel newsletteru vždy; ostatní (zákazníci, poptávky LEDX,
 * hlídání skladu, recenzenti) jen při zapnutém přepínači „syncCustomers“ (oprávněný zájem, bez souhlasu).
 * Štítky se v Ecomailu přepisují celé → vždy se počítají znovu z našich dat (`computeTags`).
 */

export const TAG_NEWSLETTER = "newsletter";
export const TAG_CUSTOMER = "zakaznik";
export const TAG_INQUIRY = "ledx-poptavka";
export const TAG_STOCK_ALERT = "hlidani-skladu";
export const TAG_REVIEWER = "recenzent";

type EnabledConfig = EcomailConfig & { listId: number };
type Fields = Record<string, string | number>;

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

const today = () => new Date().toISOString().slice(0, 10);

/* ── Data z naší DB ─────────────────────────────────────────────────────── */

async function isNewsletterSubscriber(email: string): Promise<boolean> {
  const { data } = await createServiceClient().from("newsletter_subscriber").select("confirmed_at, unsubscribed_at").ilike("email", email).maybeSingle();
  return !!data?.confirmed_at && !data.unsubscribed_at;
}

async function markSynced(email: string) {
  await createServiceClient()
    .from("newsletter_subscriber")
    .update({ ecomail_synced_at: new Date().toISOString() })
    .ilike("email", email);
}

type OrderLite = {
  number: string;
  status: string;
  currency: string;
  total: number;
  created_at: string;
  email: string;
  order_item: { product_id: string | null; qty: number; line_total: number }[] | null;
};

/** Kořenová kategorie podle ID produktu (jedno načtení kategorií + produktů). */
async function productRootResolver(productIds: string[]) {
  const svc = createServiceClient();
  const ids = [...new Set(productIds)];
  const [{ data: cats }, { data: prods }] = await Promise.all([
    svc.from("category").select("id, slug, name, parent_id"),
    ids.length ? svc.from("product").select("id, category_id").in("id", ids) : Promise.resolve({ data: [] as { id: string; category_id: string | null }[] }),
  ]);
  const byCategory = rootCategoryResolver(cats ?? []);
  const catOfProduct = new Map((prods ?? []).map((p) => [p.id, p.category_id]));
  return (productId: string) => byCategory(catOfProduct.get(productId) ?? null);
}

function toProfileOrder(o: OrderLite): ProfileOrder {
  return { number: o.number, status: o.status, currency: o.currency, total: o.total, created_at: o.created_at, items: o.order_item ?? [] };
}

/** Profil zákazníka (objednávky, útrata, zájmy) pro jeden e-mail. */
async function loadProfile(email: string): Promise<CustomerProfile | null> {
  const svc = createServiceClient();
  const { data: orders } = await svc
    .from("order")
    .select("number, status, currency, total, created_at, email, order_item(product_id, qty, line_total)")
    .ilike("email", email)
    .limit(500);
  const list = (orders ?? []) as OrderLite[];
  if (list.length === 0) return null;
  const rootOf = await productRootResolver(list.flatMap((o) => (o.order_item ?? []).map((i) => i.product_id)).filter((x): x is string => !!x));
  const rate = await getCnbEurRate().catch(() => null);
  return buildCustomerProfile(list.map(toProfileOrder), rootOf, rate?.rate ?? null);
}

/** Příznaky kontaktu z dalších zdrojů (poptávka, hlídání skladu, recenze). */
async function loadFlags(email: string): Promise<{ inquiry: boolean; stockAlert: boolean; reviewer: boolean }> {
  const svc = createServiceClient();
  const [inq, alert, cust] = await Promise.all([
    svc.from("ledx_inquiry").select("id", { count: "exact", head: true }).ilike("email", email).is("anonymized_at", null),
    svc.from("stock_alert").select("id", { count: "exact", head: true }).ilike("email", email).is("notified_at", null),
    svc.from("customer").select("id").ilike("email", email).maybeSingle(),
  ]);
  let reviewer = false;
  if (cust.data?.id) {
    const { count } = await svc.from("review").select("id", { count: "exact", head: true }).eq("customer_id", cust.data.id);
    reviewer = (count ?? 0) > 0;
  }
  return { inquiry: (inq.count ?? 0) > 0, stockAlert: (alert.count ?? 0) > 0, reviewer };
}

function computeTags(
  newsletter: boolean,
  profile: CustomerProfile | null,
  flags: { inquiry: boolean; stockAlert: boolean; reviewer: boolean },
): string[] {
  const tags: string[] = [];
  if (newsletter) tags.push(TAG_NEWSLETTER);
  if (profile && profile.pocet_objednavek > 0) tags.push(TAG_CUSTOMER, ...profile.zajmy);
  if (flags.inquiry) tags.push(TAG_INQUIRY);
  if (flags.stockAlert) tags.push(TAG_STOCK_ALERT);
  if (flags.reviewer) tags.push(TAG_REVIEWER);
  return [...new Set(tags)];
}

/* ── Jádro: upsert kontaktu + událost ───────────────────────────────────── */

type ContactExtra = {
  fullName?: string | null;
  phone?: string | null;
  city?: string | null;
  street?: string | null;
  zip?: string | null;
  country?: string | null;
  source?: string;
  fields?: Fields;
  /** Volající už ví, že jde o potvrzeného odběratele (šetří dotaz). */
  assumeNewsletter?: boolean;
  /** Předpokládané příznaky (řádek je čerstvě vložený / změněný). */
  assumeFlags?: Partial<{ inquiry: boolean; stockAlert: boolean; reviewer: boolean }>;
};

type UpsertResult = { allowed: boolean; ok: boolean; c: EnabledConfig | null };

/**
 * Přidá / aktualizuje kontakt se všemi štítky a poli spočítanými z našich dat.
 * Vrací, zda kontakt vůbec smí do seznamu (podle souhlasu / přepínače).
 */
async function upsertContact(email: string, extra: ContactExtra, opts: { resubscribe?: boolean; triggerAutomations?: boolean } = {}): Promise<UpsertResult> {
  const c = await getEcomailConfig();
  if (!ecomailEnabled(c)) return { allowed: false, ok: false, c: null };
  const newsletter = extra.assumeNewsletter || (await isNewsletterSubscriber(email));
  if (!newsletter && !c.syncCustomers) return { allowed: false, ok: false, c };
  try {
    const [profile, flags] = await Promise.all([loadProfile(email), loadFlags(email)]);
    const merged = { ...flags, ...extra.assumeFlags };
    const sub: EcomailSubscriber = {
      email,
      ...splitName(extra.fullName),
      phone: extra.phone || undefined,
      city: extra.city || undefined,
      street: extra.street || undefined,
      zip: extra.zip || undefined,
      country: extra.country || undefined,
      source: extra.source,
      tags: computeTags(newsletter, profile, merged),
      custom_fields: { ...profileFields(profile), newsletter: newsletter ? "ano" : "ne", ...extra.fields },
      ...(newsletter ? { status: 1 as const } : {}),
    };
    await subscribe(c, sub, { resubscribe: opts.resubscribe ?? false, triggerAutomations: opts.triggerAutomations ?? true });
    if (newsletter) await markSynced(email);
    return { allowed: true, ok: true, c };
  } catch (e) {
    logErr("contact upsert", e);
    return { allowed: true, ok: false, c };
  }
}

/** Vlastní událost u kontaktu (jen když kontakt smí být v seznamu; neexistující kontakt Ecomail odmítne → tiše). */
async function sendEvent(c: EnabledConfig, ev: EcomailEvent): Promise<void> {
  try {
    await trackEvent(c.apiKey, ev);
  } catch (e) {
    if (e instanceof EcomailError && (e.status === 404 || e.status === 422)) return;
    logErr(`event ${ev.action}`, e);
  }
}

/* ── Newsletter ─────────────────────────────────────────────────────────── */

/** Potvrzený odběratel newsletteru → kontakt v seznamu se štítkem „newsletter“ (spouští uvítací automatizaci). */
export async function syncNewsletterSubscriber(input: { email: string; locale: string; source?: string | null; fullName?: string | null }): Promise<boolean> {
  const r = await upsertContact(
    input.email,
    { fullName: input.fullName, source: `reptiplus-${input.source ?? "web"}`, fields: { jazyk: input.locale }, assumeNewsletter: true },
    { resubscribe: true, triggerAutomations: true },
  );
  if (r.ok && r.c) await sendEvent(r.c, { email: input.email, category: "newsletter", action: "newsletter_confirmed", property: input.source ?? "web" });
  return r.ok;
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

/* ── Objednávky ─────────────────────────────────────────────────────────── */

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

/** Kontakt z objednávky (adresa, jazyk, profil) — jen pokud smí do seznamu. */
async function upsertOrderContact(o: OrderRow, fields: Fields = {}): Promise<UpsertResult> {
  const a = o.shipping_address ?? {};
  return upsertContact(
    o.email,
    {
      fullName: a.full_name,
      phone: a.phone,
      city: a.city,
      street: a.street,
      zip: a.postal_code,
      country: a.country,
      source: "reptiplus-objednavka",
      fields: { jazyk: o.locale, ...fields },
    },
    { resubscribe: false, triggerAutomations: true },
  );
}

/**
 * Po vytvoření objednávky: kontakt do seznamu (zákazník + zájmy + útrata), událost `order_created`
 * a objednávka jako transakce (pending / completed podle platby).
 */
export async function syncOrderCreated(orderId: string): Promise<void> {
  try {
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c)) return;
    const o = await loadOrder(orderId);
    if (!o) return;
    const r = await upsertOrderContact(o);
    if (r.ok && r.c) {
      await sendEvent(r.c, {
        email: o.email,
        category: "objednavka",
        action: "order_created",
        label: o.number,
        property: o.number,
        value: { total: Math.round(o.total) / 100, currency: o.currency, items: (o.order_item ?? []).length },
      });
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

/** Změna stavu platby / storno → stav transakce. */
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

/**
 * Změna stavu objednávky (paid / processing / shipped / delivered / cancelled / refunded):
 * storno → transakce canceled; vždy aktualizace polí kontaktu (`posledni_objednavka_stav`, `posledni_doruceni`)
 * a událost `order_<stav>` pro automatizace (poděkování po doručení, žádost o recenzi…).
 */
export async function syncOrderStage(orderId: string, stage: string): Promise<void> {
  try {
    if (stage === "cancelled" || stage === "refunded") await syncOrderStatus(orderId, "canceled");
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c)) return;
    const o = await loadOrder(orderId);
    if (!o) return;
    const fields: Fields = { posledni_objednavka_stav: stage };
    if (stage === "delivered") fields.posledni_doruceni = today();
    if (stage === "shipped") fields.posledni_odeslani = today();
    const r = await upsertOrderContact(o, fields);
    if (r.ok && r.c) {
      await sendEvent(r.c, { email: o.email, category: "objednavka", action: `order_${stage}`, label: o.number, property: o.number, value: { total: Math.round(o.total) / 100, currency: o.currency } });
    }
  } catch (e) {
    logErr("order stage", e);
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

/* ── Další zdroje: recenze, hlídání skladu, poptávky LEDX, zobrazení produktu ── */

/** Nová recenze → štítek `recenzent`, pole `posledni_recenze`, událost `review_left`. */
export async function syncReviewCreated(input: { email: string; productId: string; productName?: string | null; rating: number }): Promise<void> {
  try {
    const r = await upsertContact(input.email, { fields: { posledni_recenze: today() }, assumeFlags: { reviewer: true } });
    if (r.ok && r.c) {
      await sendEvent(r.c, {
        email: input.email,
        category: "recenze",
        action: "review_left",
        label: input.productName ?? undefined,
        property: input.productId,
        value: { rating: input.rating },
      });
    }
  } catch (e) {
    logErr("review", e);
  }
}

/** Hlídání skladu → štítek `hlidani-skladu`, pole `hlidany_produkt`, událost `stock_alert_created`. */
export async function syncStockAlert(input: { email: string; locale: string; productId: string; variantId?: string | null }): Promise<void> {
  try {
    const { data: p } = await createServiceClient()
      .from("product")
      .select("name, name_i18n, slug, product_variant(id, name, name_i18n)")
      .eq("id", input.productId)
      .maybeSingle();
    const variant = input.variantId ? (p?.product_variant ?? []).find((v) => v.id === input.variantId) : null;
    const base = p ? pickI18n(p.name_i18n as Record<string, string> | null, "cs", p.name) : input.productId;
    const name = variant ? `${base} – ${pickI18n(variant.name_i18n as Record<string, string> | null, "cs", variant.name)}` : base;
    const r = await upsertContact(input.email, {
      source: "reptiplus-hlidani-skladu",
      fields: { jazyk: input.locale, hlidany_produkt: name, hlidani_skladu_datum: today() },
      assumeFlags: { stockAlert: true },
    });
    if (r.ok && r.c) await sendEvent(r.c, { email: input.email, category: "sklad", action: "stock_alert_created", label: name, property: input.productId, value: { slug: p?.slug ?? null } });
  } catch (e) {
    logErr("stock alert", e);
  }
}

/** Poptávka LEDX (nová i změna stavu) → štítek `ledx-poptavka`, pole stavu, událost `inquiry_<stav>`. */
export async function syncInquiry(input: { email: string; name?: string | null; phone?: string | null; locale?: string | null; status: string; model?: string | null; rada?: string | null; createdAt?: string | null }): Promise<void> {
  try {
    const r = await upsertContact(input.email, {
      fullName: input.name,
      phone: input.phone,
      source: "reptiplus-ledx",
      fields: {
        ...(input.locale ? { jazyk: input.locale } : {}),
        ledx_poptavka_stav: input.status,
        ledx_poptavka_datum: (input.createdAt ?? new Date().toISOString()).slice(0, 10),
        ledx_poptavka_model: [input.rada, input.model].filter(Boolean).join(" ") || "",
      },
      assumeFlags: { inquiry: true },
    });
    if (r.ok && r.c) {
      await sendEvent(r.c, { email: input.email, category: "ledx", action: `inquiry_${input.status}`, label: [input.rada, input.model].filter(Boolean).join(" ") || undefined, property: input.status });
    }
  } catch (e) {
    logErr("inquiry", e);
  }
}

/** Zobrazení produktu přihlášeným zákazníkem (server) → událost `product_viewed`; anonymní návštěvy řeší JS tracker. */
export async function syncProductViewed(input: { email: string; productId: string; name: string; price: number; currency: string; url: string; category?: string | null }): Promise<void> {
  try {
    const c = await getEcomailConfig();
    if (!ecomailEnabled(c)) return;
    if (!c.syncCustomers && !(await isNewsletterSubscriber(input.email))) return;
    await sendEvent(c, {
      email: input.email,
      category: "shopping",
      action: "product_viewed",
      label: input.name,
      property: input.productId,
      value: { price: input.price, currency: input.currency, url: input.url, category: input.category ?? null },
    });
  } catch (e) {
    logErr("product viewed", e);
  }
}

/* ── Hromadná synchronizace z adminu ────────────────────────────────────── */

export type BulkSyncResult = { ok: true; subscribed: number; unsubscribed: number; customers: number } | { ok: false; error: string };

/**
 * Hromadná synchronizace z adminu: všichni potvrzení odběratelé do seznamu (se štítky a profilem),
 * odhlášení odhlásit, a (pokud je zapnuté) zákazníci, poptávky a hlídání skladu bez souhlasu.
 */
export async function bulkSyncToEcomail(): Promise<BulkSyncResult> {
  const c = await getEcomailConfig();
  if (!ecomailEnabled(c)) return { ok: false, error: "Chybí API klíč nebo ID seznamu (Nastavení → Integrace → Ecomail)." };
  const svc = createServiceClient();
  try {
    const [{ data: subs }, { data: orders }, { data: inquiries }, { data: alerts }, { data: reviews }, rate] = await Promise.all([
      svc.from("newsletter_subscriber").select("email, locale, source, confirmed_at, unsubscribed_at, customer:customer_id(full_name)").limit(20000),
      svc.from("order").select("number, status, currency, total, created_at, email, locale, shipping_address, order_item(product_id, qty, line_total)").order("created_at", { ascending: false }).limit(20000),
      svc.from("ledx_inquiry").select("email, name, phone, locale, status, created_at, model, rada").is("anonymized_at", null).order("created_at", { ascending: false }).limit(20000),
      svc.from("stock_alert").select("email, locale").is("notified_at", null).limit(20000),
      svc.from("review").select("customer:customer_id(email)").limit(20000),
      getCnbEurRate().catch(() => null),
    ]);
    const lower = (e: string) => e.trim().toLowerCase();

    // Profily zákazníků z objednávek (jedno načtení kategorií).
    const orderList = (orders ?? []) as (OrderLite & { locale: string; shipping_address: OrderRow["shipping_address"] })[];
    const rootOf = await productRootResolver(orderList.flatMap((o) => (o.order_item ?? []).map((i) => i.product_id)).filter((x): x is string => !!x));
    const ordersByEmail = new Map<string, typeof orderList>();
    for (const o of orderList) {
      const k = lower(o.email);
      ordersByEmail.set(k, [...(ordersByEmail.get(k) ?? []), o]);
    }
    const profiles = new Map<string, CustomerProfile | null>();
    for (const [k, list] of ordersByEmail) profiles.set(k, buildCustomerProfile(list.map(toProfileOrder), rootOf, rate?.rate ?? null));

    const inquiryByEmail = new Map<string, NonNullable<typeof inquiries>[number]>();
    for (const i of inquiries ?? []) if (!inquiryByEmail.has(lower(i.email))) inquiryByEmail.set(lower(i.email), i);
    const alertEmails = new Map<string, string>();
    for (const a of alerts ?? []) if (!alertEmails.has(lower(a.email))) alertEmails.set(lower(a.email), a.locale ?? "cs");
    const reviewerEmails = new Set<string>();
    for (const r of reviews ?? []) {
      const cu = r.customer as { email?: string | null } | { email?: string | null }[] | null;
      const one = Array.isArray(cu) ? cu[0] : cu;
      if (one?.email) reviewerEmails.add(lower(one.email));
    }

    const confirmed = (subs ?? []).filter((s) => s.confirmed_at && !s.unsubscribed_at);
    const unsubscribed = (subs ?? []).filter((s) => s.unsubscribed_at);
    const newsletterEmails = new Set(confirmed.map((s) => lower(s.email)));
    const nameOf = (s: { customer: unknown }) => {
      const cu = s.customer as { full_name?: string | null } | { full_name?: string | null }[] | null;
      const one = Array.isArray(cu) ? cu[0] : cu;
      return one?.full_name ?? null;
    };

    const contactFor = (email: string, base: Partial<EcomailSubscriber> & { fields?: Fields }): EcomailSubscriber => {
      const k = lower(email);
      const newsletter = newsletterEmails.has(k);
      const profile = profiles.get(k) ?? null;
      const inq = inquiryByEmail.get(k);
      const flags = { inquiry: !!inq, stockAlert: alertEmails.has(k), reviewer: reviewerEmails.has(k) };
      const lastOrder = ordersByEmail.get(k)?.[0];
      const a = (lastOrder?.shipping_address ?? {}) as NonNullable<OrderRow["shipping_address"]>;
      const { fields, ...rest } = base;
      return {
        email,
        ...splitName(a.full_name ?? inq?.name ?? null),
        phone: a.phone || inq?.phone || undefined,
        city: a.city || undefined,
        street: a.street || undefined,
        zip: a.postal_code || undefined,
        country: a.country || undefined,
        ...rest,
        tags: computeTags(newsletter, profile, flags),
        custom_fields: {
          ...profileFields(profile),
          newsletter: newsletter ? "ano" : "ne",
          ...(inq ? { ledx_poptavka_stav: inq.status, ledx_poptavka_datum: inq.created_at.slice(0, 10), ledx_poptavka_model: [inq.rada, inq.model].filter(Boolean).join(" ") } : {}),
          ...fields,
        },
      };
    };

    // 1) Potvrzení odběratelé (souhlas) — vždy, status přihlášen.
    const subscribed = await subscribeBulk(
      c,
      confirmed.map((s) => ({
        ...contactFor(s.email, { source: `reptiplus-${s.source ?? "web"}`, fields: { jazyk: s.locale } }),
        ...splitName(nameOf(s)),
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

    // 2) Odhlášení.
    let unsubCount = 0;
    for (const s of unsubscribed) {
      try {
        await unsubscribe(c, s.email);
        unsubCount++;
      } catch (e) {
        if (!(e instanceof EcomailError && e.status === 404)) logErr("bulk unsubscribe", e);
      }
    }

    // 3) Bez souhlasu (oprávněný zájem) — jen při zapnutém přepínači; odběratelé už jsou v bodě 1.
    let customers = 0;
    if (c.syncCustomers) {
      const others = new Map<string, EcomailSubscriber>();
      for (const [k, list] of ordersByEmail) {
        if (newsletterEmails.has(k) || (profiles.get(k)?.pocet_objednavek ?? 0) === 0) continue;
        others.set(k, contactFor(list[0].email, { source: "reptiplus-objednavka", fields: { jazyk: list[0].locale } }));
      }
      for (const [k, inq] of inquiryByEmail) {
        if (newsletterEmails.has(k) || others.has(k)) continue;
        others.set(k, contactFor(inq.email, { source: "reptiplus-ledx", fields: { jazyk: inq.locale } }));
      }
      for (const [k, locale] of alertEmails) {
        if (newsletterEmails.has(k) || others.has(k)) continue;
        others.set(k, contactFor(k, { source: "reptiplus-hlidani-skladu", fields: { jazyk: locale } }));
      }
      if (others.size > 0) customers = await subscribeBulk(c, [...others.values()], { resubscribe: false });
    }
    return { ok: true, subscribed, unsubscribed: unsubCount, customers };
  } catch (e) {
    logErr("bulk", e);
    return { ok: false, error: e instanceof Error ? e.message : "Synchronizace selhala." };
  }
}
