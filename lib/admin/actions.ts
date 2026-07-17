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
  const shortDescription = i18n(formData, "short_description");
  const description = i18n(formData, "description");

  const payload = {
    slug: str(formData, "slug"),
    name: name.cs,
    name_i18n: name,
    short_description: shortDescription.cs || null,
    short_description_i18n: shortDescription,
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

  let productId = id;
  if (id) {
    const { error } = await svc.from("product").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await svc
      .from("product")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    productId = data.id;
  }

  // Specifikace (product_attribute) — nahradit dle formuláře
  if (productId && formData.has("attributes")) {
    await syncProductAttributes(svc, productId, str(formData, "attributes"));
  }
  // Varianty (product_variant) — sync se zachováním ID existujících
  if (productId && formData.has("variants")) {
    await syncProductVariants(svc, productId, str(formData, "variants"));
  }
  // Upsell (product_upsell) — nahradit dle výběru
  if (productId && formData.has("upsell_present")) {
    const ids = formData.getAll("upsell").map((v) => String(v));
    await syncUpsell(svc, productId, ids);
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/products`);
}

async function syncUpsell(
  svc: ReturnType<typeof createServiceClient>,
  productId: string,
  ids: string[],
) {
  const clean = [...new Set(ids.filter((id) => id && id !== productId))];
  await svc.from("product_upsell").delete().eq("product_id", productId);
  if (clean.length > 0) {
    await svc.from("product_upsell").insert(
      clean.map((id, i) => ({
        product_id: productId,
        upsell_product_id: id,
        sort_order: i,
      })),
    );
  }
}

async function syncProductVariants(
  svc: ReturnType<typeof createServiceClient>,
  productId: string,
  raw: string,
) {
  type V = {
    id?: string;
    name?: string;
    sku?: string;
    price_czk?: string;
    price_eur?: string;
    stock_qty?: string;
  };
  let variants: V[] = [];
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) {
      variants = parsed.filter(
        (v) => v && typeof v.name === "string" && v.name.trim(),
      );
    }
  } catch {
    variants = [];
  }

  const toMinor = (s?: string): number | null => {
    const r = (s ?? "").replace(",", ".").trim();
    if (!r) return null;
    const n = parseFloat(r);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  };
  const toStock = (s?: string): number => {
    const n = parseInt((s ?? "").trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const { data: existing } = await svc
    .from("product_variant")
    .select("id")
    .eq("product_id", productId);
  const existingIds = new Set((existing ?? []).map((e) => e.id));
  const keepIds = new Set<string>();

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const payload = {
      product_id: productId,
      name: (v.name ?? "").trim(),
      sku: v.sku?.trim() || null,
      price_czk: toMinor(v.price_czk),
      price_eur: toMinor(v.price_eur),
      stock_qty: toStock(v.stock_qty),
      sort_order: i,
    };
    if (v.id && existingIds.has(v.id)) {
      await svc.from("product_variant").update(payload).eq("id", v.id);
      keepIds.add(v.id);
    } else {
      await svc.from("product_variant").insert(payload);
    }
  }

  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    await svc.from("product_variant").delete().in("id", toDelete);
  }
}

async function syncProductAttributes(
  svc: ReturnType<typeof createServiceClient>,
  productId: string,
  raw: string,
) {
  type I18n = { cs?: string; en?: string; de?: string };
  type Item = {
    key: string;
    value: string;
    key_i18n?: I18n;
    value_i18n?: I18n;
  };
  let specs: Item[] = [];
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) {
      specs = parsed
        .filter(
          (s) =>
            s &&
            typeof s.key === "string" &&
            typeof s.value === "string" &&
            s.key.trim() &&
            s.value.trim(),
        )
        .map((s) => ({
          key: s.key.trim(),
          value: s.value.trim(),
          key_i18n: (s.key_i18n ?? {}) as I18n,
          value_i18n: (s.value_i18n ?? {}) as I18n,
        }));
    }
  } catch {
    specs = [];
  }

  await svc.from("product_attribute").delete().eq("product_id", productId);
  if (specs.length > 0) {
    await svc.from("product_attribute").insert(
      specs.map((s, i) => ({
        product_id: productId,
        key: s.key,
        value: s.value,
        key_i18n: (s.key_i18n ?? {}) as never,
        value_i18n: (s.value_i18n ?? {}) as never,
        sort_order: i,
      })),
    );
  }
}

export async function togglePublishAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  const next = formData.get("publish") === "1";
  await svc.from("product").update({ is_published: next }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function toggleFeaturedAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  const next = formData.get("featured") === "1";
  await svc.from("product").update({ is_featured: next }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteProductAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  await svc.from("product").delete().eq("id", id);
  revalidatePath("/", "layout");
}

/** Rychlá inline úprava skladu z tabulky. */
export async function setProductStockAction(id: string, stock: number) {
  await assertAdmin();
  if (!id) return;
  const v = Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0;
  await createServiceClient().from("product").update({ stock_qty: v }).eq("id", id);
  revalidatePath("/", "layout");
}

/** Rychlá inline úprava ceny (v haléřích) z tabulky. */
export async function setProductPriceAction(id: string, priceCzkMinor: number) {
  await assertAdmin();
  if (!id) return;
  const v =
    Number.isFinite(priceCzkMinor) && priceCzkMinor >= 0
      ? Math.round(priceCzkMinor)
      : 0;
  await createServiceClient().from("product").update({ price_czk: v }).eq("id", id);
  revalidatePath("/", "layout");
}

/** Hromadné akce nad vybranými produkty. `ids` = čárkou oddělené UUID. */
export async function bulkProductAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const op = str(formData, "op");
  const ids = str(formData, "ids")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  switch (op) {
    case "publish":
      await svc.from("product").update({ is_published: true }).in("id", ids);
      break;
    case "hide":
      await svc.from("product").update({ is_published: false }).in("id", ids);
      break;
    case "feature":
      await svc.from("product").update({ is_featured: true }).in("id", ids);
      break;
    case "unfeature":
      await svc.from("product").update({ is_featured: false }).in("id", ids);
      break;
    case "delete":
      await svc.from("product").delete().in("id", ids);
      break;
    default:
      return;
  }
  revalidatePath("/", "layout");
}

/* ── Obrázky produktu (Supabase Storage bucket „products") ─────────────── */
const STORAGE_BUCKET = "products";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB (po kompresi v prohlížeči bývá výrazně méně)

export type ImageActionResult = { ok: boolean; error?: string };

export async function uploadProductImagesAction(
  formData: FormData,
): Promise<ImageActionResult> {
  await assertAdmin();
  const productId = str(formData, "id");
  if (!productId) return { ok: false, error: "MISSING_PRODUCT" };

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "NO_FILES" };

  const svc = createServiceClient();

  // Navázat na aktuální nejvyšší sort_order
  const { data: existing } = await svc
    .from("product_image")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1);
  let sort = (existing?.[0]?.sort_order ?? -1) + 1;

  for (const file of files) {
    if (!file.type.startsWith("image/")) return { ok: false, error: "NOT_IMAGE" };
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "TOO_LARGE" };

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await svc.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return { ok: false, error: "UPLOAD" };

    const { data: pub } = svc.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const { error: insErr } = await svc
      .from("product_image")
      .insert({ product_id: productId, url: pub.publicUrl, sort_order: sort++ });
    if (insErr) return { ok: false, error: "DB" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Cesta v bucketu z veřejné URL (…/object/public/products/<path>). */
function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export async function deleteProductImageAction(
  formData: FormData,
): Promise<ImageActionResult> {
  await assertAdmin();
  const id = str(formData, "imageId");
  if (!id) return { ok: false, error: "MISSING" };
  const svc = createServiceClient();

  const { data: img } = await svc
    .from("product_image")
    .select("url")
    .eq("id", id)
    .maybeSingle();
  if (img?.url) {
    const path = storagePathFromUrl(img.url);
    if (path) await svc.storage.from(STORAGE_BUCKET).remove([path]);
  }
  await svc.from("product_image").delete().eq("id", id);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Nastaví obrázek jako hlavní (nejnižší sort_order). */
export async function setPrimaryImageAction(
  formData: FormData,
): Promise<ImageActionResult> {
  await assertAdmin();
  const id = str(formData, "imageId");
  const productId = str(formData, "id");
  if (!id || !productId) return { ok: false, error: "MISSING" };
  const svc = createServiceClient();

  const { data: rows } = await svc
    .from("product_image")
    .select("id, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (!rows || rows.length === 0) return { ok: false, error: "MISSING" };

  // Přeindexovat: vybraný na 0, ostatní 1..n v původním pořadí
  const reordered = [
    ...rows.filter((r) => r.id === id),
    ...rows.filter((r) => r.id !== id),
  ];
  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i].sort_order !== i) {
      await svc.from("product_image").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ── Logo značky ───────────────────────────────────────────────────────── */
export async function uploadBrandLogoAction(
  fd: FormData,
): Promise<ImageActionResult> {
  await assertAdmin();
  const brandId = str(fd, "id");
  if (!brandId) return { ok: false, error: "MISSING" };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "NO_FILES" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "NOT_IMAGE" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "TOO_LARGE" };

  const svc = createServiceClient();
  // Staré logo smazat z úložiště
  const { data: brand } = await svc
    .from("brand")
    .select("logo_url")
    .eq("id", brandId)
    .maybeSingle();
  if (brand?.logo_url) {
    const p = storagePathFromUrl(brand.logo_url);
    if (p) await svc.storage.from(STORAGE_BUCKET).remove([p]);
  }

  const ext = (file.name.split(".").pop() || "webp").toLowerCase();
  const path = `brand-logos/${brandId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await svc.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: "UPLOAD" };

  const { data: pub } = svc.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const { error } = await svc
    .from("brand")
    .update({ logo_url: pub.publicUrl })
    .eq("id", brandId);
  if (error) return { ok: false, error: "DB" };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeBrandLogoAction(
  fd: FormData,
): Promise<ImageActionResult> {
  await assertAdmin();
  const brandId = str(fd, "id");
  if (!brandId) return { ok: false, error: "MISSING" };
  const svc = createServiceClient();
  const { data: brand } = await svc
    .from("brand")
    .select("logo_url")
    .eq("id", brandId)
    .maybeSingle();
  if (brand?.logo_url) {
    const p = storagePathFromUrl(brand.logo_url);
    if (p) await svc.storage.from(STORAGE_BUCKET).remove([p]);
  }
  await svc.from("brand").update({ logo_url: null }).eq("id", brandId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ── Kategorie ─────────────────────────────────────────────────────────── */
export async function saveCategoryAction(formData: FormData) {
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

/* ── Recenze ───────────────────────────────────────────────────────────── */
export async function approveReviewAction(fd: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  await svc
    .from("review")
    .update({ is_approved: fd.get("approved") === "1" })
    .eq("id", str(fd, "id"));
  revalidatePath("/", "layout");
}

export async function deleteReviewAction(fd: FormData) {
  await assertAdmin();
  await createServiceClient().from("review").delete().eq("id", str(fd, "id"));
  revalidatePath("/", "layout");
}

/* ── Právní stránky (obchodní podmínky, GDPR) ──────────────────────────── */
export async function saveLegalAction(fd: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const key = str(fd, "doc") === "privacy" ? "legal.privacy" : "legal.terms";
  const content = i18n(fd, "content");
  await svc
    .from("app_setting")
    .upsert({ key, value: content as never }, { onConflict: "key" });
  revalidatePath("/", "layout");
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
