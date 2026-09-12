"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { addToCartAction } from "@/lib/cart/actions";
import { routing } from "@/i18n/routing";

export type AccountState = { ok?: boolean; error?: string; message?: string } | undefined;

const s = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function localeOf(fd: FormData): string {
  const l = s(fd, "locale", 5);
  return (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
}

/* ── Profil ─────────────────────────────────────────────────────────────── */

export async function updateProfileAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "AUTH" };
  const fullName = s(fd, "full_name", 120);
  const phone = s(fd, "phone", 40);
  if (!fullName) return { error: "NAME" };
  const { error } = await supabase
    .from("customer")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", user.id);
  if (error) return { error: "SERVER" };
  await supabase.auth.updateUser({ data: { full_name: fullName } });
  revalidatePath("/", "layout");
  return { ok: true, message: "SAVED" };
}

export async function changePasswordAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "AUTH" };
  const pw = String(fd.get("password") ?? "");
  const pw2 = String(fd.get("password2") ?? "");
  if (pw.length < 8) return { error: "PASSWORD_SHORT" };
  if (pw !== pw2) return { error: "PASSWORD_MISMATCH" };
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: "SERVER", message: error.message };
  return { ok: true, message: "PASSWORD_CHANGED" };
}

export async function changeEmailAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "AUTH" };
  const email = s(fd, "email", 200).toLowerCase();
  if (!isEmail(email)) return { error: "EMAIL" };
  if (email === user.email?.toLowerCase()) return { error: "EMAIL_SAME" };
  // Supabase pošle potvrzovací odkaz na novou adresu; e-mail se změní až po potvrzení.
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: "SERVER", message: error.message };
  return { ok: true, message: "EMAIL_PENDING" };
}

/* ── Adresy ─────────────────────────────────────────────────────────────── */

export async function saveAddressAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "AUTH" };
  const id = s(fd, "id", 40) || null;
  const type = s(fd, "type", 10) === "billing" ? "billing" : "shipping";
  const row = {
    customer_id: user.id,
    type: type as "billing" | "shipping",
    label: s(fd, "label", 60) || null,
    full_name: s(fd, "full_name", 120),
    company: s(fd, "company", 120) || null,
    ico: s(fd, "ico", 20) || null,
    dic: s(fd, "dic", 20) || null,
    street: s(fd, "street", 200),
    city: s(fd, "city", 120),
    postal_code: s(fd, "postal_code", 20),
    country: s(fd, "country", 2) || "CZ",
    phone: s(fd, "phone", 40) || null,
    is_default: fd.get("is_default") === "on",
  };
  if (!row.full_name || !row.street || !row.city || !row.postal_code) return { error: "ADDRESS" };

  if (row.is_default) {
    await supabase.from("address").update({ is_default: false }).eq("customer_id", user.id).eq("type", row.type);
  }
  const { error } = id
    ? await supabase.from("address").update(row).eq("id", id).eq("customer_id", user.id)
    : await supabase.from("address").insert(row);
  if (error) return { error: "SERVER" };
  revalidatePath("/", "layout");
  return { ok: true, message: "SAVED" };
}

export async function deleteAddressAction(fd: FormData): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;
  await supabase.from("address").delete().eq("id", s(fd, "id", 40)).eq("customer_id", user.id);
  revalidatePath("/", "layout");
}

export async function setDefaultAddressAction(fd: FormData): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;
  const id = s(fd, "id", 40);
  const { data: addr } = await supabase.from("address").select("type").eq("id", id).eq("customer_id", user.id).maybeSingle();
  if (!addr) return;
  await supabase.from("address").update({ is_default: false }).eq("customer_id", user.id).eq("type", addr.type);
  await supabase.from("address").update({ is_default: true }).eq("id", id);
  revalidatePath("/", "layout");
}

/* ── Oblíbené ───────────────────────────────────────────────────────────── */

export type WishlistResult = { wished: boolean } | { error: "AUTH" | "SERVER" };

export async function toggleWishlistAction(productId: string): Promise<WishlistResult> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "AUTH" };
  if (!productId) return { error: "SERVER" };
  const { data: existing } = await supabase
    .from("wishlist_item")
    .select("id")
    .eq("customer_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();
  if (existing) {
    await supabase.from("wishlist_item").delete().eq("id", existing.id);
    revalidatePath("/", "layout");
    return { wished: false };
  }
  const { error } = await supabase.from("wishlist_item").insert({ customer_id: user.id, product_id: productId });
  if (error) return { error: "SERVER" };
  revalidatePath("/", "layout");
  return { wished: true };
}

export async function removeFromWishlistAction(fd: FormData): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;
  await supabase.from("wishlist_item").delete().eq("customer_id", user.id).eq("product_id", s(fd, "product_id", 40));
  revalidatePath("/", "layout");
}

/* ── Objednat znovu ─────────────────────────────────────────────────────── */

export type ReorderResult = { added: number; skipped: number } | { error: "NOT_FOUND" };

/** Přidá položky objednávky do košíku (jen ty, které ještě existují a jsou skladem). */
export async function reorderAction(orderNumber: string): Promise<ReorderResult> {
  const { user } = await currentUser();
  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select("id, customer_id, email, order_item(product_id, variant_id, qty)")
    .eq("number", orderNumber)
    .maybeSingle();
  if (!order) return { error: "NOT_FOUND" };
  // Stránka objednávky je dostupná přes číslo, ale znovu objednat smí jen vlastník (nebo host bez účtu).
  if (order.customer_id && order.customer_id !== user?.id) return { error: "NOT_FOUND" };

  let added = 0;
  let skipped = 0;
  for (const it of order.order_item ?? []) {
    if (!it.product_id) {
      skipped++;
      continue;
    }
    const res = await addToCartAction(it.product_id, it.qty, it.variant_id);
    if (res.ok) added++;
    else skipped++;
  }
  revalidatePath("/", "layout");
  return { added, skipped };
}

/* ── Recenze ────────────────────────────────────────────────────────────── */

export async function deleteReviewAction(fd: FormData): Promise<void> {
  const { supabase, user } = await currentUser();
  if (!user) return;
  await supabase.from("review").delete().eq("id", s(fd, "id", 40)).eq("customer_id", user.id);
  revalidatePath("/", "layout");
}

/* ── Newsletter ─────────────────────────────────────────────────────────── */

export async function setNewsletterAction(fd: FormData): Promise<void> {
  const { user } = await currentUser();
  if (!user?.email) return;
  const svc = createServiceClient();
  if (fd.get("subscribed") === "on") {
    await svc
      .from("newsletter_subscriber")
      .upsert({ email: user.email.toLowerCase(), is_confirmed: Boolean(user.email_confirmed_at), source: "account" }, { onConflict: "email" });
  } else {
    await svc.from("newsletter_subscriber").delete().ilike("email", user.email);
  }
  revalidatePath("/", "layout");
}

/* ── Smazání účtu (GDPR) ────────────────────────────────────────────────── */

export async function deleteAccountAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const { supabase, user } = await currentUser();
  if (!user) return { error: "AUTH" };
  if (fd.get("confirm") !== "on") return { error: "CONFIRM" };
  const locale = localeOf(fd);
  const svc = createServiceClient();

  // Objednávky a doklady musí zůstat (účetnictví), ale bez osobních údajů v objednávce.
  const { data: orders } = await svc.from("order").select("id, billing_address, shipping_address").eq("customer_id", user.id);
  for (const o of orders ?? []) {
    const strip = (a: unknown) => {
      if (!a || typeof a !== "object") return a;
      const x = { ...(a as Record<string, unknown>) };
      for (const k of ["full_name", "street", "phone", "company", "ico", "dic"]) x[k] = k === "full_name" ? "Anonymizováno" : null;
      return x;
    };
    await svc
      .from("order")
      .update({
        customer_id: null,
        email: `deleted-${user.id.slice(0, 8)}@invalid.local`,
        note: null,
        billing_address: strip(o.billing_address) as never,
        shipping_address: strip(o.shipping_address) as never,
      })
      .eq("id", o.id);
  }
  if (user.email) {
    await svc.from("newsletter_subscriber").delete().ilike("email", user.email);
    await svc.from("stock_alert").delete().ilike("email", user.email);
  }
  await svc.from("review").update({ customer_id: null }).eq("customer_id", user.id);
  // Adresy, oblíbené a profil se smažou kaskádou přes customer → auth.users.
  const { error } = await svc.auth.admin.deleteUser(user.id);
  if (error) return { error: "SERVER", message: error.message };
  await supabase.auth.signOut();
  redirect(`/${locale}?ucet=smazan`);
}

/* ── Hlídání skladu (veřejné, i bez účtu) ──────────────────────────────── */

export type StockAlertState = { status: "idle" } | { status: "ok" } | { status: "error"; error: "EMAIL" | "SERVER" };

export async function subscribeStockAlertAction(_prev: StockAlertState, fd: FormData): Promise<StockAlertState> {
  const productId = s(fd, "product_id", 40);
  const variantId = s(fd, "variant_id", 40) || null;
  const email = s(fd, "email", 200).toLowerCase();
  const locale = localeOf(fd);
  if (!productId) return { status: "error", error: "SERVER" };
  if (!isEmail(email)) return { status: "error", error: "EMAIL" };
  if (s(fd, "company_website")) return { status: "ok" }; // honeypot

  const { user } = await currentUser();
  const { error } = await createServiceClient()
    .from("stock_alert")
    .upsert(
      { product_id: productId, variant_id: variantId, email, customer_id: user?.id ?? null, locale, notified_at: null },
      { onConflict: "product_id,variant_id,email" },
    );
  if (error) {
    console.error("[stock-alert] uložení selhalo:", error.message);
    return { status: "error", error: "SERVER" };
  }
  return { status: "ok" };
}
