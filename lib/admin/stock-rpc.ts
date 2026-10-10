import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import type { MovementType } from "@/lib/admin/stock-stats";

export type ApplyStockChangeArgs = {
  p_product_id: string;
  p_variant_id: string | null;
  /** Přičíst (záporné = odečíst); ignoruje se, když je p_set_qty. */
  p_delta: number;
  /** Nastavit absolutní stav (null = použít p_delta). */
  p_set_qty: number | null;
  p_type: MovementType;
  p_note: string | null;
  p_author: string | null;
  p_source: string | null;
};

/**
 * Změna skladu přes RPC `apply_stock_change` — trigger zapíše pohyb s typem,
 * autorem a poznámkou. Generované typy neumí null u uuid/text parametrů,
 * proto přetypování; DB null přijímá. Vrací stav po změně.
 */
export function applyStockChange(svc: ReturnType<typeof createServiceClient>, args: ApplyStockChangeArgs) {
  return svc.rpc("apply_stock_change", args as never);
}
