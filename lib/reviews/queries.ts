import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Stavy objednávky, které počítáme jako uskutečněný nákup. */
const PURCHASED_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

/**
 * Koupil zákazník tento produkt (zaplacená / zpracovávaná / odeslaná / doručená
 * objednávka s položkou)? Základ štítku „Ověřený nákup" a automatického
 * zveřejnění recenze bez schvalování.
 */
export async function hasPurchasedProduct(customerId: string, productId: string): Promise<boolean> {
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

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  author: string | null;
  verified: boolean;
};

export type ProductReviews = {
  reviews: Review[];
  average: number; // 0 = žádné recenze
  count: number;
};

/** Schválené recenze produktu + průměr (service client — approved je veřejné). */
export async function getProductReviews(
  productId: string,
): Promise<ProductReviews> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("review")
    .select(
      "id, rating, title, body, created_at, verified_purchase, customer:customer_id(full_name)",
    )
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    created_at: string;
    verified_purchase: boolean;
    customer: { full_name: string | null } | null;
  }[];

  const reviews: Review[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    author: r.customer?.full_name?.trim() || null,
    verified: r.verified_purchase,
  }));
  const count = reviews.length;
  const average = count
    ? reviews.reduce((s, r) => s + r.rating, 0) / count
    : 0;

  return { reviews, average, count };
}
