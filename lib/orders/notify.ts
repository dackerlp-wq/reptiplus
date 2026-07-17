import "server-only";
import { headers } from "next/headers";
import { sendMail } from "@/lib/email/client";
import { orderStatusEmail } from "@/lib/email/templates";
import type { Locale } from "@/i18n/routing";

export type OrderForNotify = {
  number: string;
  email: string;
  currency: string;
  tracking_number: string | null;
  shipping_method: string | null;
};

/**
 * Pošle zákazníkovi e-mail o změně stavu objednávky (jen notifikovatelné stavy).
 * Jazyk odvozen z měny (CZK→cs, jinak en). Chyby nepropadají ven.
 */
export async function sendOrderStatusEmail(
  order: OrderForNotify,
  status: string,
): Promise<void> {
  const locale: Locale = order.currency === "CZK" ? "cs" : "en";

  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://reptiplus.cz";
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) siteUrl = `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  } catch {
    /* mimo request kontext — použije se fallback */
  }

  const mail = orderStatusEmail({
    number: order.number,
    status,
    trackingNumber: order.tracking_number,
    shippingMethod: order.shipping_method,
    orderUrl: `${siteUrl}/${locale}/objednavka/${order.number}`,
    locale,
  });
  if (!mail) return;
  await sendMail({ to: order.email, ...mail });
}
