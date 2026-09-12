"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { assertAdminUser } from "@/lib/admin/auth";
import {
  getInvoiceById,
  getInvoiceSettings,
  INVOICE_SETTINGS_KEY,
  issueCreditNoteForRefund,
  issueInvoiceForOrder,
} from "@/lib/invoices/issue";
import { sendInvoiceToCustomer } from "@/lib/invoices/email";

const str = (fd: FormData, k: string, max = 500) =>
  String(fd.get(k) ?? "").trim().slice(0, max);

/** Ručně vystaví fakturu k objednávce (idempotentní). */
export async function issueInvoiceAction(fd: FormData) {
  const admin = await assertAdminUser();
  const orderId = str(fd, "order_id");
  if (!orderId) throw new Error("Chybí objednávka");
  await issueInvoiceForOrder(orderId, { author: admin.email });
  revalidatePath("/", "layout");
}

/** Ručně vystaví dobropis na zadanou částku (bez refundace přes bránu). */
export async function issueCreditNoteAction(fd: FormData) {
  const admin = await assertAdminUser();
  const orderId = str(fd, "order_id");
  const raw = str(fd, "amount", 20).replace(/\s/g, "").replace(",", ".");
  const amount = Math.round(parseFloat(raw) * 100);
  if (!orderId || !Number.isFinite(amount) || amount <= 0) throw new Error("Zadejte částku");
  const reason = str(fd, "reason", 300) || null;
  const cn = await issueCreditNoteForRefund(orderId, amount, { author: admin.email, reason });
  if (!cn) throw new Error("K objednávce zatím není faktura, dobropis nelze vystavit.");
  revalidatePath("/", "layout");
}

/** Pošle doklad zákazníkovi e-mailem (PDF v příloze + odkaz). */
export async function sendInvoiceEmailAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = str(fd, "invoice_id");
  const inv = await getInvoiceById(id);
  if (!inv) throw new Error("Doklad nenalezen");
  const { data: order } = await createServiceClient()
    .from("order")
    .select("id, number, email, locale, billing_address")
    .eq("id", inv.order_id)
    .maybeSingle();
  if (!order) throw new Error("Objednávka nenalezena");

  const ok = await sendInvoiceToCustomer(inv, order, admin.email);
  if (!ok) throw new Error("Odeslání selhalo (SMTP)");
  revalidatePath("/", "layout");
}

/** Nastavení fakturace (prefixy, splatnost, poznámka) + posun číselné řady. */
export async function saveInvoiceSettingsAction(fd: FormData) {
  await assertAdminUser();
  const svc = createServiceClient();
  const current = await getInvoiceSettings();
  const dueDays = parseInt(str(fd, "dueDays", 4), 10);
  const value = {
    prefix: str(fd, "prefix", 10).replace(/[^A-Za-z0-9]/g, "") || current.prefix,
    creditPrefix: str(fd, "creditPrefix", 10).replace(/[^A-Za-z0-9]/g, "") || current.creditPrefix,
    dueDays: Number.isFinite(dueDays) && dueDays >= 0 ? dueDays : current.dueDays,
    note: str(fd, "note", 1000),
  };
  const { error } = await svc
    .from("app_setting")
    .upsert({ key: INVOICE_SETTINGS_KEY, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);

  // Příští číslo v řadě (jen zvýšení — ať nevzniknou duplicity).
  const year = new Date().getFullYear();
  for (const [field, series] of [["nextInvoice", "invoice"], ["nextCredit", "credit_note"]] as const) {
    const next = parseInt(str(fd, field, 8), 10);
    if (!Number.isFinite(next) || next < 1) continue;
    const { data: row } = await svc
      .from("invoice_counter")
      .select("last_number")
      .eq("series", series)
      .eq("year", year)
      .maybeSingle();
    const last = row?.last_number ?? 0;
    if (next - 1 > last) {
      await svc
        .from("invoice_counter")
        .upsert({ series, year, last_number: next - 1 }, { onConflict: "series,year" });
    }
  }
  revalidatePath("/", "layout");
}
