import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { cartWeightKg } from "@/lib/shipping/price";

/** Hmotnost položek (košíku i objednávky) z `product.weight_kg`. */
export async function itemsWeightKg(items: { productId: string | null; qty: number }[]): Promise<number> {
  const ids = [...new Set(items.map((i) => i.productId).filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) return 0;
  const { data } = await createServiceClient().from("product").select("id, weight_kg").in("id", ids);
  const w = new Map((data ?? []).map((p) => [p.id, p.weight_kg as number | null]));
  return cartWeightKg(items.map((i) => ({ qty: i.qty, weightKg: i.productId ? w.get(i.productId) : null })));
}
