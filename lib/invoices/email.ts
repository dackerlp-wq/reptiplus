import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import { invoiceEmail } from "@/lib/email/templates";
import { invoiceFileName, renderInvoicePdf } from "@/lib/invoices/pdf";
import type { InvoiceRow } from "@/lib/invoices/issue";
import { siteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

function orderLocale(v: string | null | undefined): Locale {
  return v === "en" || v === "de" ? v : "cs";
}

export type OrderForInvoiceMail = {
  id: string;
  number: string;
  email: string;
  locale: string | null;
  billing_address: unknown;
};

/** URL ke stažení PDF dokladu (odkaz z e-mailu a ze stránky objednávky). */
export function invoiceDownloadUrl(inv: InvoiceRow, orderNumber: string): string {
  return `${siteUrl()}/api/invoices/${inv.id}?o=${encodeURIComponent(orderNumber)}&dl=1`;
}

/** Pošle doklad zákazníkovi (PDF v příloze + odkaz) a zapíše událost. */
export async function sendInvoiceToCustomer(
  inv: InvoiceRow,
  order: OrderForInvoiceMail,
  author: string | null,
): Promise<boolean> {
  const locale = orderLocale(order.locale);
  const name = (order.billing_address as { full_name?: string } | null)?.full_name ?? null;
  const mail = invoiceEmail({
    locale,
    number: inv.number,
    isCreditNote: inv.type === "credit_note",
    orderNumber: order.number,
    total: inv.total,
    currency: inv.currency === "EUR" ? "EUR" : "CZK",
    downloadUrl: invoiceDownloadUrl(inv, order.number),
    orderUrl: `${siteUrl()}/${locale}/objednavka/${order.number}`,
    greetingName: name,
  });
  const pdf = await renderInvoicePdf(inv);
  const ok = await sendMail({
    to: order.email,
    ...mail,
    attachments: [{ filename: invoiceFileName(inv), content: pdf }],
  });
  if (ok) {
    await createServiceClient().from("order_event").insert({
      order_id: order.id,
      type: "email",
      body: mail.text,
      meta: {
        kind: inv.type === "credit_note" ? "credit_note" : "invoice",
        subject: mail.subject,
        to: order.email,
        invoice_id: inv.id,
      },
      author_email: author,
    });
  }
  return ok;
}
