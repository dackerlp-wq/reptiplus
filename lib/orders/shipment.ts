import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { logOrderEvent } from "@/lib/orders/events";
import { sendOrderStatusEmail } from "@/lib/orders/notify";
import { getInvoicesForOrder, issueInvoiceForOrder } from "@/lib/invoices/issue";
import { invoiceFileName, renderInvoicePdf } from "@/lib/invoices/pdf";

/**
 * Po vytvoření zásilky u dopravce: zapsat do historie, u dobírky vystavit
 * fakturu (platí se při převzetí) a poslat zákazníkovi e-mail „odesláno"
 * se sledovacím odkazem (+ faktura v příloze u dobírky). Nikdy nevyhazuje.
 */
export async function afterShipmentCreated(
  orderId: string,
  opts: { author?: string | null; carrier?: string | null } = {},
): Promise<void> {
  const svc = createServiceClient();
  const { data: order } = await svc.from("order").select("*").eq("id", orderId).maybeSingle();
  if (!order) return;

  await logOrderEvent(
    orderId,
    "shipment",
    null,
    { carrier: opts.carrier ?? null, tracking_number: order.tracking_number, tracking_url: order.tracking_url, shipment_id: order.carrier_shipment_id },
    opts.author ?? null,
  );

  let attachments: { filename: string; content: Uint8Array }[] | undefined;
  let invoiceAttached = false;
  if (order.payment_method === "cod" && order.payment_status !== "paid") {
    try {
      const existing = (await getInvoicesForOrder(orderId)).find((i) => i.type === "invoice");
      const inv = existing ?? (await issueInvoiceForOrder(orderId, { author: opts.author ?? null, paidAt: null })).invoice;
      attachments = [{ filename: invoiceFileName(inv), content: await renderInvoicePdf(inv) }];
      invoiceAttached = true;
    } catch (e) {
      console.error("[order] faktura k dobírce selhala:", e);
    }
  }

  await sendOrderStatusEmail(
    {
      id: order.id,
      number: order.number,
      email: order.email,
      currency: order.currency,
      locale: order.locale,
      tracking_number: order.tracking_number,
      tracking_url: order.tracking_url,
      shipping_method: order.shipping_method,
    },
    "shipped",
    { attachments, invoiceAttached, author: opts.author ?? null },
  );
}
