import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getCnbEurRate } from "@/lib/exchange-rate";
import { sendMail } from "@/lib/email/client";
import { giftVoucherEmail } from "@/lib/email/templates";
import { logOrderEvent } from "@/lib/orders/events";
import { getShopContact } from "@/lib/settings";
import { siteUrl } from "@/lib/seo";
import { renderVoucherPdf } from "@/lib/vouchers/pdf";
import type { Database } from "@/types/database";
import type { Locale } from "@/i18n/routing";

/** Platnost poukazu koupeného v e-shopu (měsíce). */
export const VOUCHER_VALID_MONTHS = 12;

export type VoucherRow = Database["public"]["Tables"]["gift_voucher"]["Row"];

/** Kód DP-XXXX-XXXX bez zaměnitelných znaků. */
export function genVoucherCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return `DP-${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function normalizeVoucherCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isVoucherCodeLike(raw: string): boolean {
  return /^DP-?[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(raw.trim());
}

export type VoucherError = "NOT_FOUND" | "INACTIVE" | "EXPIRED" | "EMPTY" | "CURRENCY";
export type VoucherCheck =
  | { ok: true; voucherId: string; code: string; balanceCzk: number; balance: number; rate: number | null }
  | { ok: false; error: VoucherError };

/** Ověří poukaz a vrátí zůstatek v měně objednávky (EUR kurzem ČNB). */
export async function validateVoucher(svc: SupabaseClient<Database>, rawCode: string, currency: "CZK" | "EUR"): Promise<VoucherCheck> {
  const code = normalizeVoucherCode(rawCode);
  if (!code) return { ok: false, error: "NOT_FOUND" };
  const { data } = await svc.from("gift_voucher").select("id, code, balance, status, valid_to").ilike("code", code).maybeSingle();
  if (!data) return { ok: false, error: "NOT_FOUND" };
  if (data.status === "cancelled" || data.status === "expired") return { ok: false, error: "INACTIVE" };
  if (data.valid_to && new Date(data.valid_to).getTime() < Date.now() - 86400_000) return { ok: false, error: "EXPIRED" };
  if (data.balance <= 0 || data.status === "used") return { ok: false, error: "EMPTY" };

  let rate: number | null = null;
  let balance = data.balance;
  if (currency === "EUR") {
    const cnb = await getCnbEurRate();
    if (!cnb) return { ok: false, error: "CURRENCY" };
    rate = cnb.rate;
    balance = Math.floor(data.balance / cnb.rate);
  }
  return { ok: true, voucherId: data.id, code: data.code, balanceCzk: data.balance, balance, rate };
}

/** Kolik z poukazu se uplatní: min(zůstatek, částka k úhradě); vrací částku v měně objednávky i v CZK. */
export function voucherRedemption(check: Extract<VoucherCheck, { ok: true }>, payable: number): { amount: number; amountCzk: number } {
  const amount = Math.max(0, Math.min(check.balance, payable));
  const amountCzk = check.rate ? Math.min(check.balanceCzk, Math.round(amount * check.rate)) : amount;
  return { amount, amountCzk };
}

const dateFmt = (locale: Locale) => new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : locale === "de" ? "de-DE" : "en-GB", { dateStyle: "long" });

/**
 * Pošle zákazníkovi e-mail s poukazy (kódy + PDF přílohy). Používá se po
 * zaplacení objednávky i při ručním vystavení / znovuodeslání z adminu.
 */
export async function sendVoucherEmail(vouchers: VoucherRow[], to: string, locale: Locale, opts: { orderNumber?: string | null } = {}): Promise<boolean> {
  if (vouchers.length === 0) return false;
  const shop = await getShopContact().catch(() => null);
  const attachments = await Promise.all(
    vouchers.map(async (v) => ({
      filename: `poukaz-${v.code}.pdf`,
      content: await renderVoucherPdf({ code: v.code, valueCzk: v.value, validTo: v.valid_to, locale, shopName: shop?.name || "Reptiplus", message: v.message }),
    })),
  );
  const mail = giftVoucherEmail({
    locale,
    vouchers: vouchers.map((v) => ({ code: v.code, valueCzk: v.value, validTo: v.valid_to ? dateFmt(locale).format(new Date(v.valid_to)) : null })),
    shopUrl: `${siteUrl()}/${locale}/produkty`,
    orderNumber: opts.orderNumber ?? null,
  });
  return sendMail({ to, ...mail, attachments });
}

/**
 * Po zaplacení objednávky: za každou položku označenou jako dárkový poukaz
 * vygeneruje kódy (hodnota = jednotková cena, v EUR přepočet kurzem ČNB),
 * pošle je zákazníkovi a zapíše do historie. Idempotentní (podle order_id).
 */
export async function issueVouchersForOrder(orderId: string): Promise<number> {
  try {
    const svc = createServiceClient();
    const { data: existing } = await svc.from("gift_voucher").select("id").eq("order_id", orderId).limit(1);
    if (existing && existing.length > 0) return 0;

    const { data: order } = await svc
      .from("order")
      .select("id, number, email, currency, locale, order_item(product_id, qty, unit_price, name)")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return 0;
    const items = (order.order_item ?? []).filter((i) => i.product_id);
    if (items.length === 0) return 0;
    const { data: products } = await svc
      .from("product")
      .select("id, is_gift_voucher")
      .in("id", items.map((i) => i.product_id as string))
      .eq("is_gift_voucher", true);
    const voucherProductIds = new Set((products ?? []).map((p) => p.id));
    const voucherItems = items.filter((i) => voucherProductIds.has(i.product_id as string));
    if (voucherItems.length === 0) return 0;

    let rate = 1;
    if (order.currency === "EUR") {
      const cnb = await getCnbEurRate();
      if (!cnb) {
        console.error("[voucher] kurz ČNB nedostupný, poukazy z EUR objednávky nevystaveny:", order.number);
        return 0;
      }
      rate = cnb.rate;
    }
    const validTo = new Date();
    validTo.setMonth(validTo.getMonth() + VOUCHER_VALID_MONTHS);
    const validToIso = validTo.toISOString().slice(0, 10);

    const created: VoucherRow[] = [];
    for (const it of voucherItems) {
      const valueCzk = Math.round(it.unit_price * rate);
      if (valueCzk <= 0) continue;
      for (let n = 0; n < it.qty; n++) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await svc
            .from("gift_voucher")
            .insert({ code: genVoucherCode(), value: valueCzk, balance: valueCzk, valid_to: validToIso, order_id: order.id, recipient_email: order.email, created_by: "shop" })
            .select("*")
            .single();
          if (!error && data) {
            created.push(data);
            break;
          }
        }
      }
    }
    if (created.length === 0) return 0;

    const locale: Locale = order.locale === "en" || order.locale === "de" ? order.locale : "cs";
    const sent = await sendVoucherEmail(created, order.email, locale, { orderNumber: order.number });
    await logOrderEvent(
      order.id,
      "system",
      `Vystaveno ${created.length} dárkových poukazů: ${created.map((v) => v.code).join(", ")}${sent ? " (e-mail odeslán)" : " (e-mail se nepodařilo odeslat)"}`,
      { source: "voucher", codes: created.map((v) => v.code) },
    );
    return created.length;
  } catch (e) {
    console.error("[voucher] vystavení poukazů selhalo:", e);
    return 0;
  }
}
