"use server";

import { createClient } from "@/lib/supabase/server";
import { requestSubscription, safeLocale } from "@/lib/newsletter/service";

export type NewsletterState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "already" }
  | { status: "error"; error: "EMAIL" | "SERVER" };

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Přihlášení k newsletteru z webu (double opt-in). */
export async function subscribeNewsletterAction(_prev: NewsletterState, fd: FormData): Promise<NewsletterState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const locale = safeLocale(String(fd.get("locale") ?? ""));
  if (String(fd.get("company_website") ?? "")) return { status: "sent" }; // honeypot
  const ts = Number(fd.get("ts") ?? 0);
  if (ts && Date.now() - ts < 1500) return { status: "sent" }; // příliš rychlé odeslání = bot
  if (!isEmail(email)) return { status: "error", error: "EMAIL" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const res = await requestSubscription(email, locale, { source: "homepage", customerId: user?.id ?? null });
  if (res === "error") return { status: "error", error: "SERVER" };
  return { status: res };
}
