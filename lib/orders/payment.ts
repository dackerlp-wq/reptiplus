import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { logOrderEvent } from "@/lib/orders/events";
import { issueVouchersForOrder } from "@/lib/vouchers/service";
import { sendOrderStatusEmail } from "@/lib/orders/notify";
import { getInvoicesForOrder, issueInvoiceForOrder, markInvoicePaid } from "@/lib/invoices/issue";
import { invoiceFileName, renderInvoicePdf } from "@/lib/invoices/pdf";
import type { TablesUpdate } from "@/types/database";

/**
 * Přijetí platby: označí objednávku jako zaplacenou, vystaví fakturu
 * (nebo označí existující jako uhrazenou) a pošle zákazníkovi e-mail
 * „platba přijata" s PDF faktury. Idempotentní — opakované volání nic
 * nepošle znovu. Nikdy nevyhazuje (volá se i z webhooku).
 */
export async function markOrderPaid(
  orderId: string,
  opts: { source: "comgate" | "admin" | "manual" | "voucher"; author?: string | null; notify?: boolean } = { source: "admin" },
): Promise<void> {
  const svc = createServiceClient();
  const { data: order } = await svc.from("order").select("*").eq("id", orderId).maybeSingle();
  if (!order) return;
  if (order.payment_status === "paid") return;

  const patch: TablesUpdate<"order"> = { payment_status: "paid" };
  // Stav objednávky posunout jen z „nová" (odeslanou/doručenou neměnit).
  if (order.status === "new") patch.status = "paid";
  const { error } = await svc.from("order").update(patch).eq("id", orderId);
  if (error) {
    console.error("[order] označení platby selhalo:", error.message);
    return;
  }
  await logOrderEvent(orderId, "payment", null, { status: "paid", source: opts.source, amount: order.total, currency: order.currency }, opts.author ?? null);
  if (patch.status) {
    await logOrderEvent(orderId, "status", null, { from: order.status, to: "paid", source: opts.source }, opts.author ?? null);
  }

  // Faktura: vystavit, nebo existující (dobírka vystavená při odeslání) označit jako uhrazenou.
  let attachments: { filename: string; content: Uint8Array }[] | undefined;
  let invoiceAttached = false;
  try {
    const existing = (await getInvoicesForOrder(orderId)).find((i) => i.type === "invoice");
    let inv = existing;
    if (existing) {
      await markInvoicePaid(existing.id);
      inv = { ...existing, paid_at: existing.paid_at ?? new Date().toISOString().slice(0, 10) };
    } else {
      inv = (await issueInvoiceForOrder(orderId, { author: opts.author ?? null, paidAt: new Date().toISOString().slice(0, 10) })).invoice;
    }
    if (inv) {
      attachments = [{ filename: invoiceFileName(inv), content: await renderInvoicePdf(inv) }];
      invoiceAttached = true;
    }
  } catch (e) {
    console.error("[order] faktura po zaplacení selhala:", e);
  }

  // Dárkové poukazy v objednávce → vygenerovat kódy a poslat (idempotentní).
  await issueVouchersForOrder(orderId);

  if (opts.notify === false) return;
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
    "paid",
    { attachments, invoiceAttached, author: opts.author ?? null },
  );
}
