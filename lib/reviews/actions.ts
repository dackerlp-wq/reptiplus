"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  // RLS: owner insert (customer_id = auth.uid()), is_approved zůstává false.
  const { error } = await supabase.from("review").insert({
    product_id: productId,
    customer_id: user.id,
    rating,
    title: title || null,
    body,
  });
  if (error) return { status: "error", error: "SERVER" };

  revalidatePath("/", "layout");
  return { status: "ok" };
}
