import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail, type MailAttachment } from "@/lib/email/client";
import { orderStatusEmail } from "@/lib/email/templates";
import { getShopContact } from "@/lib/settings";
import { pickI18n } from "@/lib/i18n";
import { logOrderEvent } from "@/lib/orders/events";
import type { Locale } from "@/i18n/routing";

export type OrderForNotify = {
  id?: string;
  number: string;
  email: string;
  currency: string;
  locale?: string | null;
  tracking_number: string | null;
  tracking_url?: string | null;
  shipping_method: string | null;
};

/** Jazyk objednávky (uložený při vytvoření; staré objednávky podle měny). */
export function orderLocale(o: { locale?: string | null; currency?: string | null }): Locale {
  if (o.locale === "cs" || o.locale === "en" || o.locale === "de") return o.locale;
  return o.currency === "CZK" ? "cs" : "en";
}

/** Absolutní URL webu — z requestu (doména, kde zákazník objednal), jinak env. */
export async function currentSiteUrl(): Promise<string> {
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://reptiplus.cz";
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) siteUrl = `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  } catch {
    /* mimo request kontext — použije se fallback */
  }
  return siteUrl.replace(/\/+$/, "");
}

export async function orderUrlFor(order: { number: string; locale?: string | null; currency?: string | null }): Promise<string> {
  return `${await currentSiteUrl()}/${orderLocale(order)}/objednavka/${order.number}`;
}

/** Název způsobu dopravy / platby podle kódu v jazyce zákazníka. */
export async function methodLabel(
  table: "shipping_method" | "payment_method",
  code: string | null | undefined,
  locale: Locale,
): Promise<string | null> {
  if (!code) return null;
  const { data } = await createServiceClient().from(table).select("name_i18n").eq("code", code).maybeSingle();
  if (!data) return code;
  return pickI18n(data.name_i18n as Record<string, string>, locale, code);
}

/** Reply-to = kontaktní e-mail obchodu (zákazník může rovnou odpovědět). */
export async function shopReplyTo(): Promise<string | undefined> {
  const shop = await getShopContact().catch(() => null);
  return shop?.email || process.env.SHOP_NOTIFY_EMAIL || undefined;
}

/**
 * Pošle zákazníkovi e-mail o změně stavu objednávky (jen notifikovatelné
 * stavy) a zapíše to do historie. Chyby nepropadají ven.
 */
export async function sendOrderStatusEmail(
  order: OrderForNotify,
  status: string,
  opts: { attachments?: MailAttachment[]; invoiceAttached?: boolean; author?: string | null } = {},
): Promise<boolean> {
  try {
    const locale = orderLocale(order);
    const [orderUrl, carrierLabel, replyTo] = await Promise.all([
      orderUrlFor(order),
      status === "shipped" ? methodLabel("shipping_method", order.shipping_method, locale) : Promise.resolve(null),
      shopReplyTo(),
    ]);
    const mail = orderStatusEmail({
      number: order.number,
      status,
      trackingNumber: order.tracking_number,
      trackingUrl: order.tracking_url ?? null,
      carrierLabel,
      invoiceAttached: opts.invoiceAttached,
      orderUrl,
      locale,
    });
    if (!mail) return false;
    const ok = await sendMail({ to: order.email, ...mail, replyTo, attachments: opts.attachments });
    if (ok && order.id) {
      await logOrderEvent(order.id, "email", mail.text, { kind: `status:${status}`, subject: mail.subject, to: order.email }, opts.author ?? null);
    }
    return ok;
  } catch (e) {
    console.error("[order] e-mail o stavu se nepodařilo odeslat:", e);
    return false;
  }
}
