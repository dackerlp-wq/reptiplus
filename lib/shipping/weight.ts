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

/** Odhad hmotnosti objednávky z produktů + počet položek bez zadané hmotnosti (pro panel balení). */
export async function orderWeightInfo(orderId: string): Promise<{ kg: number; missing: number }> {
  const svc = createServiceClient();
  const { data: items } = await svc.from("order_item").select("product_id, qty").eq("order_id", orderId);
  const ids = [...new Set((items ?? []).map((i) => i.product_id).filter((x): x is string => Boolean(x)))];
  const { data: prods } = ids.length
    ? await svc.from("product").select("id, weight_kg").in("id", ids)
    : { data: [] as { id: string; weight_kg: number | null }[] };
  const w = new Map((prods ?? []).map((p) => [p.id, p.weight_kg]));
  let kg = 0;
  let missing = 0;
  for (const i of items ?? []) {
    const pw = i.product_id ? w.get(i.product_id) : null;
    if (pw) kg += Number(pw) * i.qty;
    else missing++;
  }
  return { kg: Math.round(kg * 1000) / 1000, missing };
}
