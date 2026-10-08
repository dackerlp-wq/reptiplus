"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hasPurchasedProduct } from "@/lib/reviews/queries";

export type ReviewState =
  | { status: "idle" }
  | { status: "ok"; published: boolean }
  | { status: "error"; error: "AUTH" | "RATING" | "BODY" | "SERVER" };

/**
 * Odeslání recenze přihlášeným zákazníkem. Ověřený nákup (zákazník si produkt
 * u nás koupil) se zveřejní rovnou se štítkem „Ověřený nákup"; ostatní čekají
 * na schválení v adminu (is_approved=false).
 */
export async function submitReviewAction(
  _prev: ReviewState,
  fd: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "AUTH" };

  const productId = String(fd.get("productId") ?? "").trim();
  const rating = parseInt(String(fd.get("rating") ?? "0"), 10);
  const title = String(fd.get("title") ?? "").trim();
  const body = String(fd.get("body") ?? "").trim();

  if (!(rating >= 1 && rating <= 5)) return { status: "error", error: "RATING" };
  if (!body) return { status: "error", error: "BODY" };
  if (!productId) return { status: "error", error: "SERVER" };

  // Vkládá service klient (štítek „ověřený nákup" ani zveřejnění nesmí jít nastavit z klienta).
  const verified = await hasPurchasedProduct(user.id, productId);
  const { error } = await createServiceClient().from("review").insert({
    product_id: productId,
    customer_id: user.id,
    rating,
    title: title || null,
    body,
    verified_purchase: verified,
    is_approved: verified,
  });
  if (error) return { status: "error", error: "SERVER" };

  revalidatePath("/", "layout");
  return { status: "ok", published: verified };
}
