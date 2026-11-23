"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { startComgatePayment, syncComgateTransaction } from "@/lib/orders/comgate";
import { routing, type Locale } from "@/i18n/routing";

function safeLocale(v: string): Locale {
  return (routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale;
}

/**
 * „Zaplatit znovu" ze stránky objednávky: nezaplacená online objednávka
 * (zrušená platba, chyba brány) dostane nový pokus o platbu v Comgate.
 * Číslo objednávky je náhodné a funguje jako přístupový klíč (stejně jako
 * stránka objednávky); zaplatit cizí objednávku nikomu neuškodí.
 */
export async function payAgainAction(fd: FormData): Promise<void> {
  const number = String(fd.get("number") ?? "").trim();
  const locale = safeLocale(String(fd.get("locale") ?? ""));
  const back = `/${locale}/objednavka/${encodeURIComponent(number)}`;
  if (!/^RP\d{6}-[A-Z0-9]{4}$/.test(number)) redirect(`/${locale}`);

  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select("id, number, total, currency, email, status, payment_status, payment_method, comgate_ref, shipping_address")
    .eq("number", number)
    .maybeSingle();
  if (!order) redirect(`/${locale}`);

  // Mezitím mohla platba projít (webhook ještě nedorazil) → nejdřív ověřit.
  if (order.comgate_ref && order.payment_status !== "paid") {
    const res = await syncComgateTransaction(order.comgate_ref);
    if (res === "paid") redirect(`${back}?platba=uspech`);
  }

  const { data: method } = await svc
    .from("payment_method")
    .select("provider")
    .eq("code", order.payment_method ?? "")
    .maybeSingle();
  const payable =
    method?.provider === "comgate" &&
    order.status === "new" &&
    order.payment_status !== "paid" &&
    (order.total ?? 0) > 0;
  if (!payable) redirect(back);

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const siteUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "https://reptiplus.cz";

  const gatewayUrl = await startComgatePayment({
    orderId: order.id,
    number: order.number,
    total: order.total ?? 0,
    currency: order.currency,
    email: order.email,
    fullName: (order.shipping_address as { full_name?: string } | null)?.full_name,
    locale,
    siteUrl,
  });
  redirect(gatewayUrl ?? `${back}?platba=chyba`);
}
