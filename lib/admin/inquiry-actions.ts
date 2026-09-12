"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { assertAdminUser } from "@/lib/admin/auth";
import { getShopContact } from "@/lib/settings";
import { sendMail } from "@/lib/email/client";
import { ledxInquiryMessageEmail } from "@/lib/email/templates";
import {
  isEmailKind,
  isInquiryStatus,
  type InquiryEventType,
  type InquiryStatus,
} from "@/lib/ledx/inquiry-status";
import type { Locale } from "@/i18n/routing";
import type { Json, TablesUpdate } from "@/types/database";

const str = (fd: FormData, k: string, max = 5000) =>
  String(fd.get(k) ?? "").trim().slice(0, max);

type Admin = Awaited<ReturnType<typeof assertAdminUser>>;

async function logEvent(
  inquiryId: string,
  admin: Admin,
  type: InquiryEventType,
  body: string | null,
  meta: Record<string, Json | undefined> = {},
) {
  const clean = Object.fromEntries(
    Object.entries(meta).filter(([, v]) => v !== undefined),
  ) as Record<string, Json>;
  const { error } = await createServiceClient().from("ledx_inquiry_event").insert({
    inquiry_id: inquiryId,
    type,
    body,
    meta: clean,
    author_id: admin.id,
    author_email: admin.email,
  });
  if (error) console.error("[inquiry] zápis události selhal:", error.message);
}

function revalidate() {
  revalidatePath("/", "layout"); // odznak v menu, seznam i detail
}

async function loadInquiry(id: string) {
  const { data, error } = await createServiceClient()
    .from("ledx_inquiry")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Poptávka nenalezena");
  return data;
}

/* ── Stav ──────────────────────────────────────────────────────────────── */
export async function setInquiryStatusAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!isInquiryStatus(status)) throw new Error("Neplatný stav");

  const inq = await loadInquiry(id);
  if (inq.status === status) return;

  const { error } = await createServiceClient()
    .from("ledx_inquiry")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logEvent(id, admin, "status", null, { from: inq.status, to: status });
  revalidate();
}

/* ── Interní poznámka ──────────────────────────────────────────────────── */
export async function addInquiryNoteAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = str(fd, "id");
  const body = str(fd, "body", 5000);
  if (!body) throw new Error("Poznámka je prázdná");
  await loadInquiry(id);
  await logEvent(id, admin, "note", body);
  // updated_at drží trigger jen při update řádku → dotkneme se ho
  await createServiceClient().from("ledx_inquiry").update({ updated_at: new Date().toISOString() }).eq("id", id);
  revalidate();
}

/* ── Nabídka ───────────────────────────────────────────────────────────── */
export async function saveInquiryQuoteAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = str(fd, "id");
  const inq = await loadInquiry(id);

  const raw = str(fd, "amount", 20).replace(/\s/g, "").replace(",", ".");
  const amountNum = raw ? parseFloat(raw) : NaN;
  const amount = Number.isFinite(amountNum) && amountNum >= 0 ? Math.round(amountNum * 100) : null;
  if (raw && amount === null) throw new Error("Neplatná částka");

  const currency = str(fd, "currency", 3) === "EUR" ? "EUR" : "CZK";
  const validUntil = str(fd, "valid_until", 10) || null;
  const number = str(fd, "number", 60) || null;
  const markQuoted = fd.get("mark_quoted") === "on";

  const statusChange = markQuoted && inq.status !== "quoted";
  const update: TablesUpdate<"ledx_inquiry"> = {
    quote_amount: amount,
    quote_currency: amount === null ? null : currency,
    quote_valid_until: validUntil,
    quote_number: number,
    ...(statusChange ? { status: "quoted" } : {}),
  };

  const { error } = await createServiceClient().from("ledx_inquiry").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  await logEvent(id, admin, "quote", null, {
    amount,
    currency: amount === null ? null : currency,
    valid_until: validUntil,
    number,
  });
  if (statusChange) await logEvent(id, admin, "status", null, { from: inq.status, to: "quoted" });
  revalidate();
}

/* ── Další kontakt (follow-up) ─────────────────────────────────────────── */
export async function setInquiryFollowUpAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = str(fd, "id");
  const date = str(fd, "follow_up_at", 10) || null;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Neplatné datum");
  const inq = await loadInquiry(id);
  if (inq.follow_up_at === date) return;

  const { error } = await createServiceClient()
    .from("ledx_inquiry")
    .update({ follow_up_at: date })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await logEvent(id, admin, "follow_up", null, { from: inq.follow_up_at, to: date });
  revalidate();
}

/* ── E-mail zákazníkovi ────────────────────────────────────────────────── */
export type SendInquiryEmailState =
  | { status: "idle" }
  | { status: "sent"; at: string }
  | { status: "error"; message: string };

export async function sendInquiryEmailAction(
  _prev: SendInquiryEmailState,
  fd: FormData,
): Promise<SendInquiryEmailState> {
  let admin: Admin;
  try {
    admin = await assertAdminUser();
  } catch {
    return { status: "error", message: "Nemáte oprávnění." };
  }

  const id = str(fd, "id");
  const kind = str(fd, "kind", 30);
  const subject = str(fd, "subject", 200);
  const body = str(fd, "body", 20000);
  const newStatus = str(fd, "new_status", 20);

  if (!isEmailKind(kind)) return { status: "error", message: "Neznámý typ e-mailu." };
  if (!subject || !body) return { status: "error", message: "Vyplňte předmět i text e-mailu." };
  if (/\(doplňte[^)]*\)|\(fill in[^)]*\)|\((?:Preis )?eintragen[^)]*\)|\(ausfüllen\)/i.test(body)) {
    return {
      status: "error",
      message: "V textu zůstal nevyplněný zástupný text v závorce — doplňte ho nebo smažte.",
    };
  }

  let inq;
  try {
    inq = await loadInquiry(id);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Poptávka nenalezena." };
  }
  if (inq.anonymized_at) {
    return { status: "error", message: "Poptávka je anonymizovaná, e-mail není kam poslat." };
  }

  const locale = (["cs", "en", "de"].includes(inq.locale) ? inq.locale : "cs") as Locale;
  const mail = ledxInquiryMessageEmail({ locale, subject, body });
  const shop = await getShopContact().catch(() => null);

  const ok = await sendMail({
    to: inq.email,
    ...mail,
    replyTo: shop?.email || undefined,
  });
  if (!ok) {
    return {
      status: "error",
      message: "Odeslání selhalo — zkontrolujte SMTP nastavení (env SMTP_HOST/USER/PASS) a zkuste znovu.",
    };
  }

  await logEvent(id, admin, "email", body, { kind, subject, to: inq.email });

  if (isInquiryStatus(newStatus) && newStatus !== inq.status) {
    const { error } = await createServiceClient()
      .from("ledx_inquiry")
      .update({ status: newStatus })
      .eq("id", id);
    if (!error) await logEvent(id, admin, "status", null, { from: inq.status, to: newStatus });
  } else {
    await createServiceClient().from("ledx_inquiry").update({ updated_at: new Date().toISOString() }).eq("id", id);
  }

  revalidate();
  return { status: "sent", at: new Date().toISOString() };
}

/* ── GDPR: anonymizace / smazání ───────────────────────────────────────── */
export async function anonymizeInquiryAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = str(fd, "id");
  const inq = await loadInquiry(id);
  if (inq.anonymized_at) return;

  const svc = createServiceClient();
  const closed: InquiryStatus = ["won", "lost", "cancelled"].includes(inq.status)
    ? (inq.status as InquiryStatus)
    : "cancelled";
  const { error } = await svc
    .from("ledx_inquiry")
    .update({
      name: "Anonymizováno",
      email: `anonymized-${id.slice(0, 8)}@invalid.local`,
      phone: null,
      poznamka: null,
      ip_hash: null,
      status: closed,
      anonymized_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Historie může obsahovat osobní údaje (těla e-mailů, poznámky) → smazat.
  await svc.from("ledx_inquiry_event").delete().eq("inquiry_id", id);
  await logEvent(id, admin, "system", "Osobní údaje anonymizovány (GDPR).", {
    from: inq.status,
    to: closed,
  });
  revalidate();
}

/** Smaže poptávku i s historií. Přesměrování na seznam řeší klient (InquiryDangerZone). */
export async function deleteInquiryAction(fd: FormData) {
  await assertAdminUser();
  const id = str(fd, "id");
  const { error } = await createServiceClient().from("ledx_inquiry").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
