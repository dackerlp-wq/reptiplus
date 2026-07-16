import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  author: string | null;
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
      "id, rating, title, body, created_at, customer:customer_id(full_name)",
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
    customer: { full_name: string | null } | null;
  }[];

  const reviews: Review[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
    author: r.customer?.full_name?.trim() || null,
  }));
  const count = reviews.length;
  const average = count
    ? reviews.reduce((s, r) => s + r.rating, 0) / count
    : 0;

  return { reviews, average, count };
}
