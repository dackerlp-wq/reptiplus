import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { linkGuestOrders } from "@/lib/account/link-orders";
import type { Tables } from "@/types/database";

export type AddressRow = Tables<"address">;

/** Přihlášený zákazník + profil; bez přihlášení přesměruje na login. */
export async function requireCustomer(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/prihlaseni`);
  const { data: profile } = await supabase
    .from("customer")
    .select("full_name, phone, email, role, created_at")
    .eq("id", user.id)
    .maybeSingle();
  // Hostovské objednávky se stejným (ověřeným) e-mailem → k účtu.
  await linkGuestOrders(user);
  return { supabase, user, profile };
}

export async function getAddresses(supabase: Awaited<ReturnType<typeof createClient>>): Promise<AddressRow[]> {
  const { data } = await supabase
    .from("address")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getMyOrders(supabase: Awaited<ReturnType<typeof createClient>>, limit?: number) {
  let q = supabase
    .from("order")
    .select("id, number, status, payment_status, total, currency, created_at, tracking_number, tracking_url")
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data } = await q;
  return data ?? [];
}

export async function getMyInvoices(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("invoice")
    .select("id, order_id, number, type")
    .order("created_at", { ascending: true });
  const byOrder = new Map<string, { id: string; number: string; type: string }[]>();
  for (const inv of data ?? []) {
    const list = byOrder.get(inv.order_id) ?? [];
    list.push(inv);
    byOrder.set(inv.order_id, list);
  }
  return byOrder;
}

export async function getMyReviews(userId: string) {
  // Service role: vlastník má RLS select jen na své, ale potřebujeme join na produkt (i nepublikovaný).
  const { data } = await createServiceClient()
    .from("review")
    .select("id, rating, title, body, is_approved, created_at, product:product_id(slug, name, name_i18n)")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getWishlistIds(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const { data } = await supabase.from("wishlist_item").select("product_id").order("added_at", { ascending: false });
  return (data ?? []).map((r) => r.product_id);
}

export async function isNewsletterSubscribed(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const { data } = await createServiceClient()
    .from("newsletter_subscriber")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  return Boolean(data);
}
