"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { sendMail } from "@/lib/email/client";
import { claimConfirmEmail, claimShopEmail } from "@/lib/email/templates";
import { isClaimType, type ClaimType } from "@/lib/claims/status";
import { routing, type Locale } from "@/i18n/routing";

export type ClaimState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: "FORM" | "GDPR" | "RATE" | "SERVER" };

const MIN_FILL_MS = 3000;
const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const fakeOk: ClaimState = { status: "ok" };

const recent = new Map<string, number[]>();
async function rateLimited(): Promise<boolean> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
    if (!ip) return false;
    const key = createHash("sha256").update(`${process.env.RATE_LIMIT_SALT || "reptiplus"}:${ip}`).digest("hex").slice(0, 24);
    const now = Date.now();
    const times = (recent.get(key) ?? []).filter((t) => now - t < 3600_000);
    if (times.length >= 5) return true;
    times.push(now);
    recent.set(key, times);
    return false;
  } catch {
    return false;
  }
}

/** Odeslání reklamace / odstoupení od smlouvy: uložení, e-mail obchodu, potvrzení zákazníkovi, záznam k objednávce. */
export async function submitClaimAction(_prev: ClaimState, fd: FormData): Promise<ClaimState> {
  if (s(fd, "company_website")) return fakeOk;
  const ts = Number(s(fd, "ts", 20));
  if (ts && Date.now() - ts < MIN_FILL_MS) return fakeOk;

  const typeRaw = s(fd, "type", 20);
  const type: ClaimType = isClaimType(typeRaw) ? typeRaw : "claim";
  const orderNumber = s(fd, "order_number", 30).toUpperCase();
  const name = s(fd, "name", 120);
  const email = s(fd, "email", 200).toLowerCase();
  const phone = s(fd, "phone", 40) || null;
  const items = s(fd, "items", 2000);
  const reason = s(fd, "reason", 5000) || null;
  const bankAccount = s(fd, "bank_account", 80) || null;
  const localeRaw = s(fd, "locale", 5);
  const locale: Locale = (routing.locales as readonly string[]).includes(localeRaw) ? (localeRaw as Locale) : routing.defaultLocale;

  if (!orderNumber || !name || !isEmail(email) || !items) return { status: "error", error: "FORM" };
  if (type === "claim" && !reason) return { status: "error", error: "FORM" };
  if (fd.get("gdpr") !== "on") return { status: "error", error: "GDPR" };
  if (await rateLimited()) return { status: "error", error: "RATE" };

  const svc = createServiceClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: order } = await svc.from("order").select("id, email, customer_id").eq("number", orderNumber).maybeSingle();

  const { data: claim, error } = await svc
    .from("claim")
    .insert({
      type,
      order_number: orderNumber,
      order_id: order?.id ?? null,
      customer_id: user?.id ?? order?.customer_id ?? null,
      name,
      email,
      phone,
      items,
      reason,
      bank_account: bankAccount,
      locale,
    })
    .select("id")
    .single();
  if (error || !claim) return { status: "error", error: "SERVER" };

  if (order) {
    await svc.from("order_event").insert({
      order_id: order.id,
      type: "note",
      body: `${type === "claim" ? "Reklamace" : "Odstoupení od smlouvy"} z webu od ${name} <${email}>:\n${items}${reason ? `\n\n${reason}` : ""}`,
      meta: { source: "claim-form", claim_id: claim.id, type },
    });
  }

  const contact = await getShopContact().catch(() => null);
  const shopEmail = contact?.email || process.env.SHOP_NOTIFY_EMAIL || "";
  if (shopEmail) {
    const shopMail = claimShopEmail({ type, name, email, phone, orderNumber, items, reason, bankAccount, locale, orderFound: Boolean(order), claimId: claim.id });
    await sendMail({ to: shopEmail, ...shopMail, replyTo: email });
  }
  const returnAddress = contact?.address ? `${contact.name}, ${contact.address}` : null;
  const confirm = claimConfirmEmail({ type, locale, name, orderNumber, items, reason, returnAddress });
  await sendMail({ to: email, ...confirm, replyTo: shopEmail || undefined });
  return { status: "ok" };
}
