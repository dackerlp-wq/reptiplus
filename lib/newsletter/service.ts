import "server-only";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import { newsletterConfirmEmail, newsletterWelcomeEmail } from "@/lib/email/templates";
import { getNewsletterSettings } from "@/lib/settings";
import { getCnbEurRate } from "@/lib/exchange-rate";
import { formatPrice } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

export function safeLocale(v: string | null | undefined): Locale {
  return v === "en" || v === "de" ? v : "cs";
}

export function newToken(): string {
  return randomBytes(24).toString("hex");
}

export function confirmUrl(token: string): string {
  return `${siteUrl()}/api/newsletter/confirm?t=${token}`;
}
export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/api/newsletter/unsubscribe?t=${token}`;
}

/**
 * Přihlášení: založí / obnoví záznam s tokenem a pošle potvrzovací e-mail.
 * Už potvrzený a neodhlášený odběratel → "already" (nic neposíláme).
 */
export async function requestSubscription(
  email: string,
  locale: Locale,
  opts: { source?: string; customerId?: string | null } = {},
): Promise<"sent" | "already" | "error"> {
  const svc = createServiceClient();
  const { data: existing } = await svc
    .from("newsletter_subscriber")
    .select("id, token, confirmed_at, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle();

  if (existing?.confirmed_at && !existing.unsubscribed_at) return "already";

  const token = existing?.token ?? newToken();
  const { error } = await svc.from("newsletter_subscriber").upsert(
    {
      email,
      token,
      locale,
      source: opts.source ?? "web",
      customer_id: opts.customerId ?? null,
      is_confirmed: false,
      confirmed_at: null,
      unsubscribed_at: null,
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("[newsletter] uložení selhalo:", error.message);
    return "error";
  }
  const mail = newsletterConfirmEmail({ locale, confirmUrl: confirmUrl(token) });
  const ok = await sendMail({ to: email, ...mail });
  return ok ? "sent" : "error";
}

/** Vygeneruje unikátní kód (VITEJ-XXXXXX). */
function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return "VITEJ-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Potvrzení odběru přes token: nastaví potvrzeno, vytvoří jednorázový
 * slevový kód (podle nastavení) a pošle uvítací e-mail. Idempotentní.
 */
export async function confirmSubscription(token: string): Promise<{ ok: boolean; locale: Locale }> {
  const svc = createServiceClient();
  const { data: sub } = await svc.from("newsletter_subscriber").select("*").eq("token", token).maybeSingle();
  if (!sub) return { ok: false, locale: "cs" };
  const locale = safeLocale(sub.locale);
  if (sub.confirmed_at && !sub.unsubscribed_at) return { ok: true, locale };

  const settings = await getNewsletterSettings();
  let code: string | null = null;
  let discountId = sub.discount_code_id;
  let validUntil: string | null = null;

  // Sleva jen jednou na e-mail (i po odhlášení a novém přihlášení).
  if (!discountId && settings.discountCzk > 0) {
    validUntil = new Date(Date.now() + settings.validDays * 86400000).toISOString();
    for (let i = 0; i < 3 && !discountId; i++) {
      const candidate = genCode();
      const { data: dc, error } = await svc
        .from("discount_code")
        .insert({
          code: candidate,
          type: "fixed",
          value: settings.discountCzk,
          min_order: settings.minOrderCzk || null,
          usage_limit: 1,
          valid_to: validUntil,
          is_active: true,
        })
        .select("id, code")
        .single();
      if (!error && dc) {
        discountId = dc.id;
        code = dc.code;
      }
    }
  } else if (discountId) {
    const { data: dc } = await svc.from("discount_code").select("code, valid_to").eq("id", discountId).maybeSingle();
    code = dc?.code ?? null;
    validUntil = dc?.valid_to ?? null;
  }

  await svc
    .from("newsletter_subscriber")
    .update({ is_confirmed: true, confirmed_at: new Date().toISOString(), unsubscribed_at: null, discount_code_id: discountId })
    .eq("id", sub.id);

  const cnb = locale === "cs" ? null : await getCnbEurRate();
  const toLocale = (czkMinor: number) =>
    locale === "cs" ? formatPrice(czkMinor, "cs") : formatPrice(cnb ? Math.round(czkMinor / cnb.rate) : czkMinor, locale);
  const dateFmt = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : locale === "de" ? "de-DE" : "en-GB", { dateStyle: "long" });

  const mail = newsletterWelcomeEmail({
    locale,
    code,
    amountLabel: toLocale(settings.discountCzk),
    minOrderLabel: toLocale(settings.minOrderCzk),
    validUntil: validUntil ? dateFmt.format(new Date(validUntil)) : "",
    shopUrl: `${siteUrl()}/${locale}/produkty`,
    unsubscribeUrl: unsubscribeUrl(token),
  });
  await sendMail({ to: sub.email, ...mail });
  return { ok: true, locale };
}

export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; locale: Locale }> {
  const svc = createServiceClient();
  const { data: sub } = await svc.from("newsletter_subscriber").select("id, locale").eq("token", token).maybeSingle();
  if (!sub) return { ok: false, locale: "cs" };
  await svc.from("newsletter_subscriber").update({ unsubscribed_at: new Date().toISOString(), is_confirmed: false }).eq("id", sub.id);
  return { ok: true, locale: safeLocale(sub.locale) };
}

/**
 * Přihlášení z účtu s ověřeným e-mailem: bez potvrzovacího kroku — záznam
 * založí/obnoví s tokenem a rovnou projde `confirmSubscription` (uvítací e-mail + sleva jen jednou).
 */
export async function confirmSubscriptionForEmail(email: string, locale: Locale, customerId: string | null): Promise<boolean> {
  const svc = createServiceClient();
  const { data: existing } = await svc
    .from("newsletter_subscriber")
    .select("id, token, confirmed_at, unsubscribed_at")
    .ilike("email", email)
    .maybeSingle();
  if (existing?.confirmed_at && !existing.unsubscribed_at) return true;
  const token = existing?.token ?? newToken();
  const { error } = await svc.from("newsletter_subscriber").upsert(
    { email, token, locale, source: "account", customer_id: customerId, is_confirmed: false, unsubscribed_at: null },
    { onConflict: "email" },
  );
  if (error) {
    console.error("[newsletter] uložení selhalo:", error.message);
    return false;
  }
  return (await confirmSubscription(token)).ok;
}

/** Odhlášení podle e-mailu (z účtu). Záznam zůstává jako odhlášený (kvůli evidenci uvítací slevy). */
export async function unsubscribeByEmail(email: string): Promise<void> {
  const svc = createServiceClient();
  await svc
    .from("newsletter_subscriber")
    .update({ unsubscribed_at: new Date().toISOString(), is_confirmed: false })
    .ilike("email", email)
    .is("unsubscribed_at", null);
}
