import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 * je bezměnová. Fixní sleva a min_order se proto uplatní jen u CZK objednávek.
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

  // Fixní sleva je definovaná v CZK haléřích → pro EUR ji nelze korektně uplatnit.
  if (data.type === "fixed" && currency !== "CZK")
    return { ok: false, error: "CURRENCY" };

  // min_order (haléře CZK) kontrolujeme jen u CZK objednávek.
  if (data.min_order != null && currency === "CZK" && subtotalMinor < data.min_order)
    return { ok: false, error: "MIN_ORDER" };

  let amount =
    data.type === "percent"
      ? Math.round((subtotalMinor * data.value) / 100)
      : data.value;

  // Sleva nikdy nepřesáhne mezisoučet.
  amount = Math.max(0, Math.min(amount, subtotalMinor));

  return { ok: true, discountId: data.id, amount, code: data.code };
}
