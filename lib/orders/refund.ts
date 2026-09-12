import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import { orderRefundEmail } from "@/lib/email/templates";
import { logOrderEvent } from "@/lib/orders/events";
import { orderLocale, orderUrlFor, shopReplyTo } from "@/lib/orders/notify";
import { issueCreditNoteForRefund } from "@/lib/invoices/issue";
import { invoiceFileName, renderInvoicePdf } from "@/lib/invoices/pdf";

/**
 * Po zaevidování vratky: dobropis k faktuře (pokud existuje) + e-mail
 * zákazníkovi s částkou a PDF dobropisu. Nikdy nevyhazuje.
 */
export async function afterRefund(
  orderId: string,
  amount: number,
  opts: { author?: string | null; fully: boolean; reason?: string | null },
): Promise<void> {
  const svc = createServiceClient();
  const { data: order } = await svc.from("order").select("*").eq("id", orderId).maybeSingle();
  if (!order) return;

  await logOrderEvent(orderId, "refund", opts.reason ?? null, { amount, currency: order.currency, fully: opts.fully }, opts.author ?? null);

  let creditNote = null;
  try {
    creditNote = await issueCreditNoteForRefund(orderId, amount, { author: opts.author ?? null, reason: opts.reason ?? null });
  } catch (e) {
    console.error("[order] dobropis selhal:", e);
  }

  try {
    const locale = orderLocale(order);
    const mail = orderRefundEmail({
      number: order.number,
      amount,
      partial: !opts.fully,
      creditNoteNumber: creditNote?.number ?? null,
      orderUrl: await orderUrlFor(order),
      locale,
    });
    const attachments = creditNote
      ? [{ filename: invoiceFileName(creditNote), content: await renderInvoicePdf(creditNote) }]
      : undefined;
    const ok = await sendMail({ to: order.email, ...mail, replyTo: await shopReplyTo(), attachments });
    if (ok) {
      await logOrderEvent(orderId, "email", mail.text, { kind: "refund", subject: mail.subject, to: order.email, credit_note_id: creditNote?.id ?? null }, opts.author ?? null);
    }
  } catch (e) {
    console.error("[order] e-mail o vratce selhal:", e);
  }
}
