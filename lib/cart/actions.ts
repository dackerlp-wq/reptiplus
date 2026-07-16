"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getCartId } from "@/lib/cart/cart";

export type CartActionResult = { ok: boolean; error?: string };

/** Přidá produkt (výchozí +1). Ověří publikaci a sklad, množství ořeže na sklad. */
export async function addToCartAction(
  productId: string,
  qty = 1,
  variantId: string | null = null,
): Promise<CartActionResult> {
  if (!productId) return { ok: false, error: "MISSING_PRODUCT" };
  const add = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
  const svc = createServiceClient();

  // Produkt musí existovat, být publikovaný a skladem.
  const { data: product } = await svc
    .from("product")
    .select("id, stock_qty, is_published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.is_published) return { ok: false, error: "NOT_FOUND" };
  if (product.stock_qty <= 0) return { ok: false, error: "OUT_OF_STOCK" };

  const cartId = await getCartId(true);
  if (!cartId) return { ok: false, error: "CART" };

  // Existující položka (stejný produkt + varianta) → sečíst, jinak vložit.
  let existingQuery = svc
    .from("cart_item")
    .select("id, qty")
    .eq("cart_id", cartId)
    .eq("product_id", productId);
  existingQuery = variantId
    ? existingQuery.eq("variant_id", variantId)
    : existingQuery.is("variant_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const qtyNext = Math.min(existing.qty + add, product.stock_qty);
    await svc.from("cart_item").update({ qty: qtyNext }).eq("id", existing.id);
  } else {
    await svc.from("cart_item").insert({
      cart_id: cartId,
      product_id: productId,
      variant_id: variantId,
      qty: Math.min(add, product.stock_qty),
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Nastaví množství položky. qty ≤ 0 → odebere. Ořeže na sklad. Scoped na vlastní košík. */
export async function updateQtyAction(
  itemId: string,
  qty: number,
): Promise<CartActionResult> {
  if (!itemId) return { ok: false, error: "MISSING_ITEM" };
  const cartId = await getCartId(false);
  if (!cartId) return { ok: false, error: "CART" };
  const svc = createServiceClient();

  // Ověříme, že položka patří do TOHOTO košíku (nikdo nesáhne na cizí).
  const { data: item } = await svc
    .from("cart_item")
    .select("id, product_id")
    .eq("id", itemId)
    .eq("cart_id", cartId)
    .maybeSingle();
  if (!item) return { ok: false, error: "NOT_FOUND" };

  if (qty <= 0) {
    await svc.from("cart_item").delete().eq("id", itemId).eq("cart_id", cartId);
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const { data: product } = await svc
    .from("product")
    .select("stock_qty")
    .eq("id", item.product_id)
    .maybeSingle();
  const stock = product?.stock_qty ?? 0;
  if (stock <= 0) {
    await svc.from("cart_item").delete().eq("id", itemId).eq("cart_id", cartId);
    revalidatePath("/", "layout");
    return { ok: true };
  }

  const qtyNext = Math.min(Math.floor(qty), stock);
  await svc
    .from("cart_item")
    .update({ qty: qtyNext })
    .eq("id", itemId)
    .eq("cart_id", cartId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Odebere položku z košíku. Scoped na vlastní košík. */
export async function removeItemAction(itemId: string): Promise<CartActionResult> {
  if (!itemId) return { ok: false, error: "MISSING_ITEM" };
  const cartId = await getCartId(false);
  if (!cartId) return { ok: false, error: "CART" };
  const svc = createServiceClient();
  await svc.from("cart_item").delete().eq("id", itemId).eq("cart_id", cartId);
  revalidatePath("/", "layout");
  return { ok: true };
}
