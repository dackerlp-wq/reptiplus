import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCnbEurRate } from "@/lib/exchange-rate";

export type DiscountResult =
  | { ok: true; discountId: string; amount: number; code: string }
  | { ok: false; error: DiscountError };

export type DiscountError =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "USED_UP"
  | "MIN_ORDER"
  | "CURRENCY";

/**
 * Ověří slevový kód proti mezisoučtu. Běží jen se service klientem
 * (tabulka discount_code nemá public RLS). Vrací výši slevy v minor units.
 *
 * Pozn.: `value`/`min_order` jsou u fixní slevy v haléřích (CZK). Procentní sleva
 * je bezměnová. U EUR objednávek se fixní částka i min_order přepočítají kurzem ČNB.
 */
export async function validateDiscount(
  svc: SupabaseClient,
  rawCode: string,
  subtotalMinor: number,
  currency: "CZK" | "EUR",
): Promise<DiscountResult> {
  const code = rawCode.trim();
  if (!code) return { ok: false, error: "NOT_FOUND" };

  const { data } = await svc
    .from("discount_code")
    .select("id, code, type, value, min_order, valid_from, valid_to, usage_limit, used_count, is_active")
    .ilike("code", code)
    .maybeSingle();

  if (!data) return { ok: false, error: "NOT_FOUND" };
  if (!data.is_active) return { ok: false, error: "INACTIVE" };

  const now = Date.now();
  if (data.valid_from && new Date(data.valid_from).getTime() > now)
    return { ok: false, error: "NOT_STARTED" };
  if (data.valid_to && new Date(data.valid_to).getTime() < now)
    return { ok: false, error: "EXPIRED" };
  if (data.usage_limit != null && data.used_count >= data.usage_limit)
    return { ok: false, error: "USED_UP" };

  // Fixní sleva a min_order jsou v CZK haléřích → pro EUR přepočet kurzem ČNB.
  let toCurrency = (czkMinor: number) => czkMinor;
  if (currency !== "CZK" && (data.type === "fixed" || data.min_order != null)) {
    const cnb = await getCnbEurRate();
    if (!cnb) return { ok: false, error: "CURRENCY" };
    toCurrency = (czkMinor: number) => Math.round(czkMinor / cnb.rate);
  }

  if (data.min_order != null && subtotalMinor < toCurrency(data.min_order))
    return { ok: false, error: "MIN_ORDER" };

  let amount =
    data.type === "percent"
      ? Math.round((subtotalMinor * data.value) / 100)
      : toCurrency(data.value);

  // Sleva nikdy nepřesáhne mezisoučet.
  amount = Math.max(0, Math.min(amount, subtotalMinor));

  return { ok: true, discountId: data.id, amount, code: data.code };
}
