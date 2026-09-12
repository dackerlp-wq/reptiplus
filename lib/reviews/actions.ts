"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Stavy objednávky, které počítáme jako uskutečněný nákup. */
const PURCHASED_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

/** Koupil zákazník tento produkt (zaplacená / odeslaná / doručená objednávka s položkou)? */
async function hasPurchased(customerId: string, productId: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("order_item")
    .select("id, order:order_id!inner(customer_id, status, payment_status)")
    .eq("product_id", productId)
    .eq("order.customer_id", customerId)
    .or(`status.in.(${PURCHASED_STATUSES.join(",")}),payment_status.eq.paid`, { referencedTable: "order" })
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export type ReviewState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; error: "AUTH" | "RATING" | "BODY" | "SERVER" };

/** Odeslání recenze přihlášeným zákazníkem. Čeká na schválení (is_approved=false). */
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

  // Vkládá service klient (štítek „ověřený nákup" nesmí jít nastavit z klienta); is_approved zůstává false.
  const verified = await hasPurchased(user.id, productId);
  const { error } = await createServiceClient().from("review").insert({
    product_id: productId,
    customer_id: user.id,
    rating,
    title: title || null,
    body,
    verified_purchase: verified,
  });
  if (error) return { status: "error", error: "SERVER" };

  revalidatePath("/", "layout");
  return { status: "ok" };
}
