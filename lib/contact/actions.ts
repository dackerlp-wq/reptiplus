"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { sendMail } from "@/lib/email/client";
import { contactConfirmEmail, contactShopEmail } from "@/lib/email/templates";
import { routing, type Locale } from "@/i18n/routing";

export type ContactState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: "FORM" | "GDPR" | "RATE" | "SERVER" };

const MIN_FILL_MS = 2500;
const MAX_LINKS = 3;

const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const fakeOk: ContactState = { status: "ok" };

/** Jednoduchý rate limit v paměti instance (IP hash → časy odeslání). */
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

/** Odeslání kontaktního formuláře: e-mail obchodu + potvrzení zákazníkovi. */
export async function submitContactAction(_prev: ContactState, fd: FormData): Promise<ContactState> {
  if (s(fd, "company_website")) return fakeOk;
  const ts = Number(s(fd, "ts", 20));
  if (ts && Date.now() - ts < MIN_FILL_MS) return fakeOk;

  const name = s(fd, "name", 120);
  const email = s(fd, "email", 200).toLowerCase();
  const phone = s(fd, "phone", 40) || null;
  const subject = s(fd, "subject", 150);
  const orderNumber = s(fd, "order_number", 30) || null;
  const message = s(fd, "message", 5000);
  const localeRaw = s(fd, "locale", 5);
  const locale: Locale = (routing.locales as readonly string[]).includes(localeRaw) ? (localeRaw as Locale) : routing.defaultLocale;

  if (!name || !isEmail(email) || !message) return { status: "error", error: "FORM" };
  if (fd.get("gdpr") !== "on") return { status: "error", error: "GDPR" };
  if ((message.match(/https?:\/\/|www\./gi)?.length ?? 0) > MAX_LINKS) return fakeOk;
  if (await rateLimited()) return { status: "error", error: "RATE" };

  const contact = await getShopContact().catch(() => null);
  const shopEmail = contact?.email || process.env.SHOP_NOTIFY_EMAIL || "";
  if (!shopEmail) return { status: "error", error: "SERVER" };

  const shopMail = contactShopEmail({ name, email, phone, subject, message, locale, orderNumber });
  const ok = await sendMail({ to: shopEmail, ...shopMail, replyTo: email });
  if (!ok) return { status: "error", error: "SERVER" };

  // Zpráva k objednávce → i do její historie (pokud číslo existuje).
  if (orderNumber) {
    const svc = createServiceClient();
    const { data: order } = await svc.from("order").select("id").eq("number", orderNumber).maybeSingle();
    if (order) {
      await svc.from("order_event").insert({
        order_id: order.id,
        type: "note",
        body: `Zpráva z kontaktního formuláře od ${name} <${email}>${subject ? ` — ${subject}` : ""}:\n${message}`,
        meta: { source: "contact-form" },
      });
    }
  }

  const confirm = contactConfirmEmail({ locale, name, subject, message });
  await sendMail({ to: email, ...confirm, replyTo: shopEmail });
  return { status: "ok" };
}
