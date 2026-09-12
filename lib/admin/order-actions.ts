"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { assertAdminUser } from "@/lib/admin/auth";
import { sendMail } from "@/lib/email/client";
import { orderMessageEmail } from "@/lib/email/templates";
import { logOrderEvent } from "@/lib/orders/events";
import { orderLocale, orderUrlFor, shopReplyTo } from "@/lib/orders/notify";
import { PLACEHOLDER_RE, ORDER_MESSAGE_KINDS } from "@/lib/orders/message-drafts";

const str = (fd: FormData, k: string, max = 5000) =>
  String(fd.get(k) ?? "").trim().slice(0, max);

/** Interní poznámka do historie objednávky (zákazník ji nevidí). */
export async function addOrderNoteAction(fd: FormData) {
  const admin = await assertAdminUser();
  const id = str(fd, "id");
  const body = str(fd, "body", 5000);
  if (!id || !body) throw new Error("Poznámka je prázdná");
  await logOrderEvent(id, "note", body, {}, admin.email);
  revalidatePath("/", "layout");
}

export type SendOrderEmailState =
  | { status: "idle" }
  | { status: "sent"; at: string }
  | { status: "error"; message: string };

/** Vlastní zpráva zákazníkovi k objednávce (text z adminu, v jazyce objednávky). */
export async function sendOrderMessageAction(
  _prev: SendOrderEmailState,
  fd: FormData,
): Promise<SendOrderEmailState> {
  let admin;
  try {
    admin = await assertAdminUser();
  } catch {
    return { status: "error", message: "Nemáte oprávnění." };
  }
  const id = str(fd, "id");
  const kind = str(fd, "kind", 30);
  const subject = str(fd, "subject", 200);
  const body = str(fd, "body", 20000);
  if (!(ORDER_MESSAGE_KINDS as readonly string[]).includes(kind)) {
    return { status: "error", message: "Neznámý typ zprávy." };
  }
  if (!subject || !body) return { status: "error", message: "Vyplňte předmět i text." };
  if (PLACEHOLDER_RE.test(body)) {
    return { status: "error", message: "V textu zůstal nevyplněný zástupný text v závorce — doplňte ho nebo smažte." };
  }

  const { data: order } = await createServiceClient()
    .from("order")
    .select("id, number, email, locale, currency")
    .eq("id", id)
    .maybeSingle();
  if (!order) return { status: "error", message: "Objednávka nenalezena." };

  const mail = orderMessageEmail({
    locale: orderLocale(order),
    subject,
    body,
    orderNumber: order.number,
    orderUrl: await orderUrlFor(order),
  });
  const ok = await sendMail({ to: order.email, ...mail, replyTo: await shopReplyTo() });
  if (!ok) {
    return { status: "error", message: "Odeslání selhalo — zkontrolujte SMTP nastavení a zkuste znovu." };
  }
  await logOrderEvent(id, "email", body, { kind: `message:${kind}`, subject, to: order.email }, admin.email);
  revalidatePath("/", "layout");
  return { status: "sent", at: new Date().toISOString() };
}
