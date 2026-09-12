"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { genVoucherCode, sendVoucherEmail } from "@/lib/vouchers/service";
import type { Locale } from "@/i18n/routing";

async function assertAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("customer").select("role").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) throw new Error("Forbidden");
  return user.email ?? "admin";
}

function flashRedirect(
  path: string,
  flash: "saved" | "error",
  msg?: string,
): never {
  const p = new URLSearchParams({ flash, t: Date.now().toString() });
  if (msg) p.set("msg", msg);
  redirect(`${path}?${p.toString()}`);
}

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const safeLocale = (v: string): Locale => (v === "en" || v === "de" ? v : "cs");

/** Ruční vystavení poukazu (např. prodaný na prodejně nebo jako kompenzace). */
export async function createVoucherAction(fd: FormData) {
  const author = await assertAdmin();
  const locale = str(fd, "locale", 5) || "cs";
  const value = Math.round(parseFloat(str(fd, "value", 20).replace(",", ".")) * 100);
  if (!Number.isFinite(value) || value <= 0) flashRedirect(`/${locale}/admin/vouchers`, "error", "Zadej kladnou hodnotu poukazu.");
  const validTo = str(fd, "valid_to", 10) || null;
  const recipientEmail = str(fd, "recipient_email", 200).toLowerCase() || null;
  const recipientName = str(fd, "recipient_name", 120) || null;
  const message = str(fd, "message", 500) || null;
  const note = str(fd, "note", 500) || null;
  const send = fd.get("send") === "on";
  const mailLocale = safeLocale(str(fd, "mail_locale", 5));

  const svc = createServiceClient();
  let created = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const { data, error } = await svc
      .from("gift_voucher")
      .insert({ code: genVoucherCode(), value, balance: value, valid_to: validTo, recipient_email: recipientEmail, recipient_name: recipientName, message, note, created_by: author })
      .select("*")
      .single();
    if (!error && data) created = data;
  }
  if (!created) flashRedirect(`/${locale}/admin/vouchers`, "error", "Poukaz se nepodařilo vytvořit.");

  let msg = `Poukaz ${created.code} vytvořen`;
  if (send && recipientEmail) {
    const ok = await sendVoucherEmail([created], recipientEmail, mailLocale);
    msg += ok ? `, e-mail odeslán na ${recipientEmail}` : ", e-mail se nepodařilo odeslat";
  }
  revalidatePath("/", "layout");
  flashRedirect(`/${locale}/admin/vouchers`, "saved", msg);
}

/** Znovu poslat poukaz e-mailem (na zadanou nebo uloženou adresu). */
export async function resendVoucherAction(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id", 40);
  const to = str(fd, "email", 200).toLowerCase();
  const svc = createServiceClient();
  const { data: v } = await svc.from("gift_voucher").select("*").eq("id", id).maybeSingle();
  if (!v) throw new Error("Poukaz nenalezen.");
  const target = to || v.recipient_email;
  if (!target) throw new Error("Chybí e-mail příjemce.");
  const ok = await sendVoucherEmail([v], target, safeLocale(str(fd, "mail_locale", 5)));
  if (!ok) throw new Error("E-mail se nepodařilo odeslat (zkontroluj SMTP).");
  if (!v.recipient_email) await svc.from("gift_voucher").update({ recipient_email: target }).eq("id", id);
  revalidatePath("/admin/vouchers");
}

/** Zneplatnění poukazu (zůstatek zůstane vidět, ale nejde uplatnit). */
export async function cancelVoucherAction(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id", 40);
  const svc = createServiceClient();
  const { error } = await svc.from("gift_voucher").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "active");
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vouchers");
}

/** Obnovení zrušeného poukazu. */
export async function reactivateVoucherAction(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id", 40);
  const svc = createServiceClient();
  const { data: v } = await svc.from("gift_voucher").select("balance").eq("id", id).maybeSingle();
  if (!v) throw new Error("Poukaz nenalezen.");
  const { error } = await svc
    .from("gift_voucher")
    .update({ status: v.balance > 0 ? "active" : "used", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/vouchers");
}
