import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import {
  newOrderNotificationEmail,
  orderConfirmationEmail,
  type OrderAddress,
  type OrderEmailData,
} from "@/lib/email/templates";
import { getShopContact } from "@/lib/settings";
import { logOrderEvent } from "@/lib/orders/events";
import { currentSiteUrl, methodLabel, orderLocale } from "@/lib/orders/notify";
import { variableSymbolForOrder } from "@/lib/orders/vs";
import type { Tables } from "@/types/database";

/** Sestaví data pro potvrzovací e-mail z uložené objednávky. */
export async function buildOrderEmailData(orderId: string): Promise<OrderEmailData | null> {
  const svc = createServiceClient();
  const { data: order } = await svc.from("order").select("*, order_item(*)").eq("id", orderId).maybeSingle();
  if (!order) return null;
  const locale = orderLocale(order);
  const [siteUrl, shop, shippingLabel, paymentLabel] = await Promise.all([
    currentSiteUrl(),
    getShopContact().catch(() => null),
    methodLabel("shipping_method", order.shipping_method, locale),
    methodLabel("payment_method", order.payment_method, locale),
  ]);
  const items = (order.order_item ?? []) as Tables<"order_item">[];
  return {
    number: order.number,
    email: order.email,
    items: items.map((it) => ({ name: it.name, qty: it.qty, lineTotal: it.line_total })),
    subtotal: order.subtotal ?? 0,
    shipping: order.shipping ?? 0,
    paymentFee: order.payment_fee ?? 0,
    discount: order.discount ?? 0,
    total: order.total ?? 0,
    currency: order.currency === "EUR" ? "EUR" : "CZK",
    paymentMethod: order.payment_method ?? "",
    paymentMethodLabel: paymentLabel,
    shippingMethodLabel: shippingLabel,
    shippingAddress: order.shipping_address as OrderAddress,
    billingAddress: order.billing_address as OrderAddress,
    note: order.note,
    bank: shop
      ? {
          account: shop.bankAccount || undefined,
          iban: shop.iban || undefined,
          bic: shop.bic || undefined,
          variableSymbol: variableSymbolForOrder(order.number),
        }
      : null,
    orderUrl: `${siteUrl}/${locale}/objednavka/${order.number}`,
    adminUrl: `${siteUrl}/cs/admin/orders/${order.id}`,
    locale,
  };
}

/**
 * Potvrzení objednávky zákazníkovi (+ volitelně notifikace obchodu).
 * Selhání e-mailu nesmí shodit objednávku — chyby jen loguje.
 */
export async function sendOrderConfirmation(
  orderId: string,
  opts: { notifyShop?: boolean; author?: string | null } = {},
): Promise<void> {
  try {
    const data = await buildOrderEmailData(orderId);
    if (!data) return;
    const shop = await getShopContact().catch(() => null);
    const replyTo = shop?.email || process.env.SHOP_NOTIFY_EMAIL || undefined;

    const conf = orderConfirmationEmail(data);
    const ok = await sendMail({ to: data.email, ...conf, replyTo });
    if (ok) {
      await logOrderEvent(orderId, "email", conf.text, { kind: "confirmation", subject: conf.subject, to: data.email }, opts.author ?? null);
    }

    if (opts.notifyShop) {
      const shopEmail = shop?.email || process.env.SHOP_NOTIFY_EMAIL;
      if (shopEmail) {
        const notif = newOrderNotificationEmail(data);
        await sendMail({ to: shopEmail, ...notif, replyTo: data.email });
      }
    }
  } catch (e) {
    console.error("[order] potvrzení objednávky se nepodařilo odeslat:", e);
  }
}
