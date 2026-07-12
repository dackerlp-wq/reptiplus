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
