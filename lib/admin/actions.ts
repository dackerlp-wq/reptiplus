"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("customer")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    throw new Error("Forbidden");
  }
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v ? String(v).trim() : "";
};
const money = (fd: FormData, k: string): number | null => {
  const raw = str(fd, k).replace(",", ".");
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
const i18n = (fd: FormData, base: string) => ({
  cs: str(fd, `${base}_cs`),
  en: str(fd, `${base}_en`),
  de: str(fd, `${base}_de`),
});

export async function saveProductAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();

  const id = str(formData, "id") || null;
  const locale = str(formData, "locale") || "cs";
  const name = i18n(formData, "name");
  const description = i18n(formData, "description");

  const payload = {
    slug: str(formData, "slug"),
    name: name.cs,
    name_i18n: name,
    description: description.cs || null,
    description_i18n: description,
    price_czk: money(formData, "price_czk") ?? 0,
    price_eur: money(formData, "price_eur"),
    compare_at_czk: money(formData, "compare_at_czk"),
    compare_at_eur: money(formData, "compare_at_eur"),
    brand_id: str(formData, "brand_id") || null,
    category_id: str(formData, "category_id") || null,
    sku: str(formData, "sku") || null,
    stock_qty: parseInt(str(formData, "stock_qty") || "0", 10),
    is_published: formData.get("is_published") === "on",
    is_featured: formData.get("is_featured") === "on",
  };

  const { error } = id
    ? await svc.from("product").update(payload).eq("id", id)
    : await svc.from("product").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/products`);
}

export async function togglePublishAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  const next = formData.get("publish") === "1";
  await svc.from("product").update({ is_published: next }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteProductAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  await svc.from("product").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/* ── Kategorie ─────────────────────────────────────────────────────────── */
export async function saveCategoryAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id") || null;
  const locale = str(formData, "locale") || "cs";
  const name = i18n(formData, "name");
  const payload = {
    slug: str(formData, "slug"),
    name: name.cs,
    name_i18n: name,
    parent_id: str(formData, "parent_id") || null,
    sort_order: parseInt(str(formData, "sort_order") || "0", 10),
    is_published: formData.get("is_published") === "on",
  };
  const { error } = id
    ? await svc.from("category").update(payload).eq("id", id)
    : await svc.from("category").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/categories`);
}

export async function deleteCategoryAction(formData: FormData) {
  await assertAdmin();
  await createServiceClient().from("category").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
}

/* ── Značky ────────────────────────────────────────────────────────────── */
export async function saveBrandAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id") || null;
  const locale = str(formData, "locale") || "cs";
  const payload = {
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    description_i18n: i18n(formData, "description"),
    sort_order: parseInt(str(formData, "sort_order") || "0", 10),
    is_published: formData.get("is_published") === "on",
  };
  const { error } = id
    ? await svc.from("brand").update(payload).eq("id", id)
    : await svc.from("brand").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/brands`);
}

export async function deleteBrandAction(formData: FormData) {
  await assertAdmin();
  await createServiceClient().from("brand").delete().eq("id", str(formData, "id"));
  revalidatePath("/", "layout");
}

/* ── Objednávky ────────────────────────────────────────────────────────── */
export async function updateOrderAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  await svc
    .from("order")
    .update({
      status: str(formData, "status") as never,
      payment_status: str(formData, "payment_status") as never,
      shipping_method: str(formData, "shipping_method") || null,
      tracking_number: str(formData, "tracking_number") || null,
      admin_note: str(formData, "admin_note") || null,
    })
    .eq("id", id);
  revalidatePath("/", "layout");
}

/* ── Nastavení / integrace ─────────────────────────────────────────────── */
async function upsertSetting(key: string, value: Record<string, unknown>) {
  await assertAdmin();
  const svc = createServiceClient();
  await svc
    .from("app_setting")
    .upsert({ key, value: value as never }, { onConflict: "key" });
  revalidatePath("/", "layout");
}

export async function saveGeneralAction(fd: FormData) {
  await upsertSetting("shop.general", {
    name: str(fd, "name"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
  });
}
export async function saveComgateAction(fd: FormData) {
  await upsertSetting("integrations.comgate", {
    merchant: str(fd, "merchant"),
    secret: str(fd, "secret"),
    test: fd.get("test") === "on",
  });
}
export async function savePplAction(fd: FormData) {
  await upsertSetting("integrations.ppl", {
    clientId: str(fd, "clientId"),
    clientSecret: str(fd, "clientSecret"),
  });
}
export async function saveZasilkovnaAction(fd: FormData) {
  await upsertSetting("integrations.zasilkovna", {
    apiKey: str(fd, "apiKey"),
    apiPassword: str(fd, "apiPassword"),
    eshopId: str(fd, "eshopId"),
  });
}
export async function saveAiAction(fd: FormData) {
  await upsertSetting("integrations.ai", { anthropicKey: str(fd, "anthropicKey") });
}

/* ── Doprava / platby ──────────────────────────────────────────────────── */
export async function saveShippingMethodAction(fd: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(fd, "id") || null;
  const payload = {
    code: str(fd, "code"),
    name_i18n: i18n(fd, "name"),
    carrier: (str(fd, "carrier") || "other") as never,
    price_czk: money(fd, "price_czk") ?? 0,
    price_eur: money(fd, "price_eur"),
    is_active: fd.get("is_active") === "on",
    sort_order: parseInt(str(fd, "sort_order") || "0", 10),
  };
  if (id) await svc.from("shipping_method").update(payload).eq("id", id);
  else await svc.from("shipping_method").insert(payload);
  revalidatePath("/", "layout");
}
export async function deleteShippingMethodAction(fd: FormData) {
  await assertAdmin();
  await createServiceClient().from("shipping_method").delete().eq("id", str(fd, "id"));
  revalidatePath("/", "layout");
}
export async function savePaymentMethodAction(fd: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(fd, "id") || null;
  const payload = {
    code: str(fd, "code"),
    name_i18n: i18n(fd, "name"),
    provider: (str(fd, "provider") || "comgate") as never,
    fee_czk: money(fd, "fee_czk") ?? 0,
    fee_eur: money(fd, "fee_eur"),
    is_active: fd.get("is_active") === "on",
    sort_order: parseInt(str(fd, "sort_order") || "0", 10),
  };
  if (id) await svc.from("payment_method").update(payload).eq("id", id);
  else await svc.from("payment_method").insert(payload);
  revalidatePath("/", "layout");
}
export async function deletePaymentMethodAction(fd: FormData) {
  await assertAdmin();
  await createServiceClient().from("payment_method").delete().eq("id", str(fd, "id"));
  revalidatePath("/", "layout");
}
