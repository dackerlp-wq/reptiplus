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

/** Rozměry kusů zboží (cm) z produktů — každý kus zvlášť (max. 50 kusů), produkty bez rozměrů vynechá. */
export async function itemsDims(items: { productId: string | null; qty: number }[]): Promise<[number, number, number][]> {
  const ids = [...new Set(items.map((i) => i.productId).filter((x): x is string => Boolean(x)))];
  if (ids.length === 0) return [];
  const { data } = await createServiceClient().from("product").select("id, length_cm, width_cm, height_cm").in("id", ids);
  const d = new Map(
    (data ?? [])
      .filter((p) => p.length_cm && p.width_cm && p.height_cm)
      .map((p) => [p.id, [Number(p.length_cm), Number(p.width_cm), Number(p.height_cm)] as [number, number, number]]),
  );
  const out: [number, number, number][] = [];
  for (const i of items) {
    const dims = i.productId ? d.get(i.productId) : undefined;
    if (dims) for (let k = 0; k < Math.min(i.qty, 50 - out.length); k++) out.push(dims);
  }
  return out;
}
