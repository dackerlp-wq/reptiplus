"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getCnbEurRate } from "@/lib/exchange-rate";
import { sendOrderStatusEmail } from "@/lib/orders/notify";
import { markOrderPaid } from "@/lib/orders/payment";
import { afterRefund } from "@/lib/orders/refund";
import { logOrderEvent } from "@/lib/orders/events";
import { sendOrderConfirmation } from "@/lib/orders/confirmation";
import { assertAdminUser } from "@/lib/admin/auth";
import { notifyStockAlerts } from "@/lib/stock-alerts/notify";
import { refundComgatePayment } from "@/lib/comgate/client";
import { pickI18n } from "@/lib/i18n";
import { DEFAULT_THEME, isThemeKey } from "@/lib/themes";
import { LEDX_PAGE_SETTING, normalizeLedxPage } from "@/lib/ledx/content";

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

/** Zaznamená cenu do historie, jen pokud se liší od poslední (pro „cena za 30 dní"). */
async function recordPriceIfChanged(
  svc: ReturnType<typeof createServiceClient>,
  productId: string,
  priceCzk: number,
  priceEur: number | null,
) {
  const { data: last } = await svc
    .from("product_price_history")
    .select("price_czk")
    .eq("product_id", productId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last || last.price_czk !== priceCzk) {
    await svc
      .from("product_price_history")
      .insert({ product_id: productId, price_czk: priceCzk, price_eur: priceEur });
  }
}

/** Přesměrování s flash zprávou pro toast (token `t` kvůli opakovaným uložením). */
function flashRedirect(
  path: string,
  flash: "saved" | "error",
  msg?: string,
): never {
  const p = new URLSearchParams({ flash, t: Date.now().toString() });
  if (msg) p.set("msg", msg);
  redirect(`${path}?${p.toString()}`);
}

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
    vat_rate: [0, 12, 21].includes(parseInt(str(formData, "vat_rate") || "21", 10))
      ? parseInt(str(formData, "vat_rate") || "21", 10)
      : 21,
  };

  let productId = id;
  if (id) {
    const { error } = await svc.from("product").update(payload).eq("id", id);
    if (error) flashRedirect(`/${locale}/admin/products/${id}`, "error", error.message);
  } else {
    const { data, error } = await svc
      .from("product")
      .insert(payload)
      .select("id")
      .single();
    if (error) flashRedirect(`/${locale}/admin/products/new`, "error", error.message);
    productId = data.id;
  }

  // Historie ceny (pro „nejnižší cena za 30 dní")
  if (productId) {
    await recordPriceIfChanged(svc, productId, payload.price_czk, payload.price_eur);
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
  // Zůstaň v editaci produktu (u nového ať jde hned nahrát fotky/varianty,
  // u úpravy ať můžeš plynule pokračovat). Zpět na seznam je přes odkaz nahoře.
  flashRedirect(
    `/${locale}/admin/products/${productId}`,
    "saved",
    id ? "Uloženo" : "Produkt vytvořen — teď můžeš přidat fotky a varianty",
  );
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
  type I18nObj = { cs?: string; en?: string; de?: string };
  type VAttr = {
    key?: string;
    value?: string;
    key_i18n?: I18nObj;
    value_i18n?: I18nObj;
  };
  type V = {
    id?: string;
    name?: string;
    name_i18n?: I18nObj;
    sku?: string;
    price_czk?: string;
    price_eur?: string;
    stock_qty?: string;
    image_url?: string | null;
    attributes?: VAttr[];
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
    const nameCs = (v.name ?? "").trim();
    const nameI18n = {
      cs: nameCs,
      en: (v.name_i18n?.en ?? "").trim(),
      de: (v.name_i18n?.de ?? "").trim(),
    };
    const attrs = Array.isArray(v.attributes)
      ? v.attributes
          .filter(
            (a) =>
              a &&
              typeof a.key === "string" &&
              typeof a.value === "string" &&
              a.key.trim() &&
              a.value.trim(),
          )
          .map((a) => ({
            key: a.key!.trim(),
            value: a.value!.trim(),
            key_i18n: a.key_i18n ?? {},
            value_i18n: a.value_i18n ?? {},
          }))
      : [];
    const payload = {
      product_id: productId,
      name: nameCs,
      name_i18n: nameI18n as never,
      sku: v.sku?.trim() || null,
      price_czk: toMinor(v.price_czk),
      price_eur: toMinor(v.price_eur),
      stock_qty: toStock(v.stock_qty),
      image_url: typeof v.image_url === "string" && v.image_url ? v.image_url : null,
      attributes: attrs as never,
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

  // Hlídání skladu: kdo čekal na naskladnění, dostane e-mail.
  if (productId) await notifyStockAlerts(productId);
}

export async function togglePublishAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  const next = formData.get("publish") === "1";
  const { error } = await svc
    .from("product")
    .update({ is_published: next })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function toggleFeaturedAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  const next = formData.get("featured") === "1";
  const { error } = await svc
    .from("product")
    .update({ is_featured: next })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteProductAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id");
  const { error } = await svc.from("product").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Rychlá inline úprava skladu z tabulky. */
export async function setProductStockAction(id: string, stock: number) {
  await assertAdmin();
  if (!id) return;
  const v = Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0;
  const { error } = await createServiceClient()
    .from("product")
    .update({ stock_qty: v })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (v > 0) await notifyStockAlerts(id);
  revalidatePath("/", "layout");
}

/**
 * Rychlá inline úprava ceny (v haléřích) z tabulky. Pokud produkt má nastavenou
 * EUR cenu, přepočítá ji aktuálním kurzem ČNB, aby ceny nezůstaly rozejité.
 */
export async function setProductPriceAction(id: string, priceCzkMinor: number) {
  await assertAdmin();
  if (!id) return;
  const svc = createServiceClient();
  const v =
    Number.isFinite(priceCzkMinor) && priceCzkMinor >= 0
      ? Math.round(priceCzkMinor)
      : 0;

  const update: { price_czk: number; price_eur?: number } = { price_czk: v };

  // EUR přepočítat jen když ho produkt už má (null = neprodává se v EUR)
  const { data: cur } = await svc
    .from("product")
    .select("price_eur")
    .eq("id", id)
    .maybeSingle();
  if (cur?.price_eur != null) {
    const cnb = await getCnbEurRate();
    if (cnb) update.price_eur = Math.max(0, Math.round(v / cnb.rate));
  }

  const { error } = await svc.from("product").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  await recordPriceIfChanged(svc, id, v, update.price_eur ?? null);
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

  const patch: { is_published?: boolean; is_featured?: boolean } | null =
    op === "publish"
      ? { is_published: true }
      : op === "hide"
        ? { is_published: false }
        : op === "feature"
          ? { is_featured: true }
          : op === "unfeature"
            ? { is_featured: false }
            : null;

  if (patch) {
    const { error } = await svc.from("product").update(patch).in("id", ids);
    if (error) throw new Error(error.message);
  } else if (op === "delete") {
    const { error } = await svc.from("product").delete().in("id", ids);
    if (error) throw new Error(error.message);
  } else {
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

/** Nahraje obrázek pro WYSIWYG editor (popisy, stránky) a vrátí veřejnou URL. */
export async function uploadEditorImageAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  await assertAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "NO_FILES" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "NOT_IMAGE" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "TOO_LARGE" };

  const svc = createServiceClient();
  const ext = (file.name.split(".").pop() || "webp").toLowerCase();
  const path = `content/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await svc.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: "UPLOAD" };

  const { data: pub } = svc.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl };
}

/** Nahraje obrázek varianty a vrátí veřejnou URL (bez zápisu do DB). */
export async function uploadVariantImageAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  await assertAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "NO_FILES" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "NOT_IMAGE" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "TOO_LARGE" };

  const svc = createServiceClient();
  const ext = (file.name.split(".").pop() || "webp").toLowerCase();
  const path = `variants/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await svc.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { ok: false, error: "UPLOAD" };

  const { data: pub } = svc.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: pub.publicUrl };
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
  if (error)
    flashRedirect(
      `/${locale}/admin/categories/${id ?? "new"}`,
      "error",
      error.message,
    );
  revalidatePath("/", "layout");
  flashRedirect(`/${locale}/admin/categories`, "saved");
}

export async function deleteCategoryAction(formData: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("category")
    .delete()
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
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
  if (error)
    flashRedirect(`/${locale}/admin/brands/${id ?? "new"}`, "error", error.message);
  revalidatePath("/", "layout");
  flashRedirect(`/${locale}/admin/brands`, "saved");
}

export async function deleteBrandAction(formData: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("brand")
    .delete()
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/* ── Objednávky ────────────────────────────────────────────────────────── */
export async function updateOrderAction(formData: FormData) {
  const admin = await assertAdminUser();
  const svc = createServiceClient();
  const id = str(formData, "id");
  const status = str(formData, "status");
  const paymentStatus = str(formData, "payment_status");
  const shippingMethod = str(formData, "shipping_method") || null;
  const trackingNumber = str(formData, "tracking_number") || null;
  const notify = formData.get("notify") === "on";

  const { data: prev } = await svc
    .from("order")
    .select("id,status,payment_status,number,email,currency,locale,tracking_url,shipping_method,tracking_number,admin_note")
    .eq("id", id)
    .maybeSingle();
  if (!prev) throw new Error("Objednávka nenalezena");

  // Přijetí platby řeší markOrderPaid (faktura + e-mail) — stav platby tu neměníme na paid přímo.
  const becomesPaid = paymentStatus === "paid" && prev.payment_status !== "paid";
  const { error } = await svc
    .from("order")
    .update({
      status: status as never,
      payment_status: (becomesPaid ? prev.payment_status : paymentStatus) as never,
      shipping_method: shippingMethod,
      tracking_number: trackingNumber,
      admin_note: str(formData, "admin_note") || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (prev.status !== status) {
    await logOrderEvent(id, "status", null, { from: prev.status, to: status, source: "admin" }, admin.email);
  }
  if (!becomesPaid && prev.payment_status !== paymentStatus) {
    await logOrderEvent(id, "payment", null, { status: paymentStatus, source: "admin" }, admin.email);
  }
  if (becomesPaid) {
    await markOrderPaid(id, { source: "admin", author: admin.email, notify });
  }

  // E-mail zákazníkovi jen když je zaškrtnuto a stav se skutečně změnil
  // (stav „paid" už poslal markOrderPaid včetně faktury).
  if (notify && prev.status !== status && status !== "paid") {
    await sendOrderStatusEmail(
      {
        id,
        number: prev.number,
        email: prev.email,
        currency: prev.currency,
        locale: prev.locale,
        tracking_number: trackingNumber,
        tracking_url: prev.tracking_url,
        shipping_method: shippingMethod,
      },
      status,
      { author: admin.email },
    );
  }
  revalidatePath("/", "layout");
}

const ORDER_STATUSES = [
  "new",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

/** Rychlá inline změna stavu objednávky z výpisu (+ e-mail zákazníkovi). */
export async function setOrderStatusAction(id: string, status: string) {
  const admin = await assertAdminUser();
  if (!id || !ORDER_STATUSES.includes(status)) return;
  const svc = createServiceClient();
  const { data: prev } = await svc
    .from("order")
    .select("id,number,email,currency,locale,tracking_number,tracking_url,shipping_method,status,payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!prev || prev.status === status) return;

  if (status === "paid" && prev.payment_status !== "paid") {
    // „Zaplacená" = přijetí platby → faktura + e-mail přes markOrderPaid.
    await markOrderPaid(id, { source: "admin", author: admin.email });
    if (prev.status !== "new") {
      await svc.from("order").update({ status: "paid" as never }).eq("id", id);
      await logOrderEvent(id, "status", null, { from: prev.status, to: status, source: "admin" }, admin.email);
    }
    revalidatePath("/", "layout");
    return;
  }

  const { error } = await svc
    .from("order")
    .update({ status: status as never })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logOrderEvent(id, "status", null, { from: prev.status, to: status, source: "admin" }, admin.email);
  await sendOrderStatusEmail(prev, status, { author: admin.email });
  revalidatePath("/", "layout");
}

/** Rychlá inline změna stavu platby z výpisu. */
export async function setOrderPaymentAction(id: string, payment: string) {
  const admin = await assertAdminUser();
  if (!id || !PAYMENT_STATUSES.includes(payment)) return;
  if (payment === "paid") {
    await markOrderPaid(id, { source: "admin", author: admin.email });
    revalidatePath("/", "layout");
    return;
  }
  const { error } = await createServiceClient()
    .from("order")
    .update({ payment_status: payment as never })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logOrderEvent(id, "payment", null, { status: payment, source: "admin" }, admin.email);
  revalidatePath("/", "layout");
}

export type OrderProductOption = {
  productId: string;
  variantId: string | null;
  name: string;
  sku: string | null;
  unitPrice: number;
  stock: number;
};

type VariantLite = {
  id: string;
  name_i18n: unknown;
  sku: string | null;
  price_czk: number | null;
  price_eur: number | null;
  stock_qty: number;
};

/** Vyhledá produkty/varianty pro ruční přidání do objednávky (admin). */
export async function searchProductsForOrderAction(
  query: string,
  currency: string,
): Promise<OrderProductOption[]> {
  await assertAdmin();
  // Očisti dotaz od znaků, které rozbíjejí PostgREST `or` filtr.
  const q = query.replace(/[,()*%]/g, "").trim();
  if (q.length < 2) return [];

  const svc = createServiceClient();
  const { data } = await svc
    .from("product")
    .select(
      "id, name_i18n, sku, price_czk, price_eur, stock_qty, product_variant(id, name_i18n, sku, price_czk, price_eur, stock_qty)",
    )
    .eq("is_published", true)
    .or(`name_i18n->>cs.ilike.*${q}*,sku.ilike.*${q}*`)
    .limit(25);

  const eur = currency !== "CZK";
  const price = (czk: number | null, e: number | null) =>
    (eur ? (e ?? czk) : czk) ?? 0;

  const out: OrderProductOption[] = [];
  for (const p of data ?? []) {
    const variants = (p.product_variant as VariantLite[] | null) ?? [];
    const baseName = pickI18n(p.name_i18n as never, "cs") || p.sku || "Produkt";
    if (variants.length > 0) {
      for (const v of variants) {
        const vName = pickI18n(v.name_i18n as never, "cs");
        out.push({
          productId: p.id,
          variantId: v.id,
          name: vName ? `${baseName} — ${vName}` : baseName,
          sku: v.sku ?? p.sku,
          unitPrice: price(v.price_czk ?? p.price_czk, v.price_eur ?? p.price_eur),
          stock: v.stock_qty,
        });
      }
    } else {
      out.push({
        productId: p.id,
        variantId: null,
        name: baseName,
        sku: p.sku,
        unitPrice: price(p.price_czk, p.price_eur),
        stock: p.stock_qty,
      });
    }
  }
  return out;
}

type EditItem = {
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string | null;
  unit_price: number;
  qty: number;
};

/** Uloží upravené položky objednávky (atomicky přes RPC, s korekcí skladu). */
export async function editOrderItemsAction(fd: FormData) {
  await assertAdmin();
  const id = str(fd, "id");
  if (!id) throw new Error("Chybí objednávka.");

  let items: EditItem[];
  try {
    items = JSON.parse(str(fd, "items")) as EditItem[];
  } catch {
    throw new Error("Neplatná data položek.");
  }
  if (!Array.isArray(items) || items.length === 0)
    throw new Error("Objednávka musí mít alespoň jednu položku.");

  for (const it of items) {
    if (!it.product_id) throw new Error("Položka bez produktu.");
    if (!Number.isInteger(it.qty) || it.qty <= 0)
      throw new Error("Neplatné množství.");
    if (!Number.isInteger(it.unit_price) || it.unit_price < 0)
      throw new Error("Neplatná cena.");
  }

  const svc = createServiceClient();
  const { error } = await svc.rpc("admin_edit_order_items", {
    p_order_id: id,
    p_items: items as never,
  });
  if (error) {
    if (error.message?.includes("INSUFFICIENT_STOCK"))
      throw new Error("Nedostatek skladu u některé položky.");
    throw new Error(error.message);
  }
  revalidatePath("/", "layout");
}

/** Náhodné číslo objednávky RPyyMMdd-XXXX (shodné s pokladnou). */
function genOrderNumber(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const rnd = Array.from({ length: 4 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
  ).join("");
  return `RP${date}-${rnd}`;
}

/**
 * Ruční vytvoření objednávky z adminu (telefonická / na prodejně).
 * Používá stejný atomický RPC place_order jako pokladna (odečte sklad).
 * Dopravné/poplatek se dopočítají z ceníku metod, sleva se zadává ručně.
 */
export async function createManualOrderAction(fd: FormData) {
  const admin = await assertAdminUser();
  const svc = createServiceClient();
  const locale = str(fd, "locale") || "cs";
  const currency = str(fd, "currency") === "EUR" ? "EUR" : "CZK";
  const customerLocaleRaw = str(fd, "customer_locale");
  const customerLocale = ["cs", "en", "de"].includes(customerLocaleRaw)
    ? customerLocaleRaw
    : currency === "CZK"
      ? "cs"
      : "en";

  const email = str(fd, "email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Zadejte platný e-mail.");

  let items: EditItem[];
  try {
    items = JSON.parse(str(fd, "items")) as EditItem[];
  } catch {
    throw new Error("Neplatné položky.");
  }
  if (!Array.isArray(items) || items.length === 0)
    throw new Error("Přidejte alespoň jednu položku.");
  for (const it of items) {
    if (
      !it.product_id ||
      !Number.isInteger(it.qty) ||
      it.qty <= 0 ||
      !Number.isInteger(it.unit_price) ||
      it.unit_price < 0
    )
      throw new Error("Neplatná položka.");
  }

  const ship = {
    full_name: str(fd, "shipping_full_name"),
    street: str(fd, "shipping_street"),
    city: str(fd, "shipping_city"),
    postal_code: str(fd, "shipping_postal_code"),
    country: str(fd, "shipping_country") || "CZ",
    phone: str(fd, "shipping_phone"),
  };
  if (!ship.full_name || !ship.street || !ship.city || !ship.postal_code)
    throw new Error("Vyplňte dodací adresu.");

  const billingSame = fd.get("billing_same") !== "off";
  const bill = billingSame
    ? ship
    : {
        full_name: str(fd, "billing_full_name"),
        street: str(fd, "billing_street"),
        city: str(fd, "billing_city"),
        postal_code: str(fd, "billing_postal_code"),
        country: str(fd, "billing_country") || "CZ",
        phone: str(fd, "billing_phone"),
      };

  // Ceny dopravy/platby z ceníku metod (dle měny).
  const priceCol = currency === "CZK" ? "price_czk" : "price_eur";
  const feeCol = currency === "CZK" ? "fee_czk" : "fee_eur";
  const shippingCode = str(fd, "shipping_method");
  const paymentCode = str(fd, "payment_method");

  let shippingFee = 0;
  if (shippingCode) {
    const { data } = await svc
      .from("shipping_method")
      .select(priceCol)
      .eq("code", shippingCode)
      .maybeSingle();
    shippingFee = (data as Record<string, number | null> | null)?.[priceCol] ?? 0;
  }
  let paymentFee = 0;
  if (paymentCode) {
    const { data } = await svc
      .from("payment_method")
      .select(feeCol)
      .eq("code", paymentCode)
      .maybeSingle();
    paymentFee = (data as Record<string, number | null> | null)?.[feeCol] ?? 0;
  }

  const discount = money(fd, "discount") ?? 0;
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0);
  const total = Math.max(0, subtotal + shippingFee + paymentFee - discount);

  const payloadItems = items.map((it) => ({
    product_id: it.product_id,
    variant_id: it.variant_id ?? "",
    name: it.name,
    sku: it.sku ?? "",
    unit_price: it.unit_price,
    qty: it.qty,
    line_total: it.unit_price * it.qty,
  }));

  let number = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    number = genOrderNumber();
    const { error } = await svc.rpc("place_order", {
      payload: {
        number,
        customer_id: str(fd, "customer_id"),
        email,
        subtotal,
        shipping: shippingFee,
        discount,
        total,
        currency,
        payment_fee: paymentFee,
        discount_code_id: "",
        shipping_method: shippingCode,
        payment_method: paymentCode,
        billing_address: bill,
        shipping_address: ship,
        note: str(fd, "note"),
        cart_id: "",
        locale: customerLocale,
        items: payloadItems,
      } as never,
    });
    if (!error) break;
    if (error.message?.includes("INSUFFICIENT_STOCK"))
      throw new Error("Nedostatek skladu u některé položky.");
    if (!error.message?.includes("duplicate") && error.code !== "23505")
      throw new Error(error.message);
    number = "";
  }
  if (!number) throw new Error("Objednávku se nepodařilo vytvořit.");

  const { data: ord } = await svc
    .from("order")
    .select("id")
    .eq("number", number)
    .maybeSingle();

  if (ord) {
    await logOrderEvent(ord.id, "system", "Objednávka vytvořena ručně v adminu.", { source: "manual" }, admin.email);
  }

  // Volitelně poslat zákazníkovi potvrzení (s platebními údaji u převodu).
  if (fd.get("notify") === "on" && ord) {
    await sendOrderConfirmation(ord.id, { notifyShop: false, author: admin.email });
  }

  // Volitelně rovnou označit jako zaplacenou (platba na prodejně / převodem)
  // → faktura + e-mail „platba přijata" (jen když je zapnuté upozornění).
  if (fd.get("mark_paid") === "on" && ord) {
    await markOrderPaid(ord.id, { source: "manual", author: admin.email, notify: fd.get("notify") === "on" });
  }

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin/orders/${ord?.id ?? ""}`);
}

/**
 * Refundace / dobropis. Částka v korunách/eurech (dle měny objednávky).
 * U plateb přes Comgate zavolá refund API; u dobírky/převodu jen zaeviduje
 * vratku (peníze vrací obchodník ručně). Při plné vratce nastaví stav
 * „Vrácená" + platbu „Vráceno".
 */
export async function refundOrderAction(fd: FormData) {
  const admin = await assertAdminUser();
  const svc = createServiceClient();
  const id = str(fd, "id");
  const amount = money(fd, "amount");
  if (!id || !amount || amount <= 0) throw new Error("Zadejte částku k vrácení.");

  const { data: order } = await svc
    .from("order")
    .select(
      "id, total, currency, refunded_amount, comgate_ref, payment_status",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) throw new Error("Objednávka nenalezena.");

  const already = order.refunded_amount ?? 0;
  const remaining = (order.total ?? 0) - already;
  if (amount > remaining) {
    throw new Error(
      `Nelze vrátit více než zbývá (${(remaining / 100).toFixed(2)} ${order.currency}).`,
    );
  }

  // Online platba přes Comgate → skutečná refundace přes bránu.
  if (order.comgate_ref) {
    const res = await refundComgatePayment(
      order.comgate_ref,
      amount,
      order.currency,
    );
    if (!res.ok) throw new Error(res.error);
  }

  const newRefunded = already + amount;
  const fullyRefunded = newRefunded >= (order.total ?? 0);
  const { error } = await svc
    .from("order")
    .update({
      refunded_amount: newRefunded,
      refunded_at: new Date().toISOString(),
      payment_status: (fullyRefunded ? "refunded" : order.payment_status) as never,
      ...(fullyRefunded ? { status: "refunded" as never } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Dobropis + e-mail zákazníkovi o vrácení peněz.
  await afterRefund(id, amount, { author: admin.email, fully: fullyRefunded, reason: str(fd, "reason") || null });
  revalidatePath("/", "layout");
}

/**
 * Hromadná akce nad objednávkami. `op` = "status:<hodnota>" nebo "payment:<hodnota>".
 * U změny stavu pošle e-mail jen těm, kterým se stav reálně změnil.
 */
export async function bulkOrderAction(formData: FormData) {
  const admin = await assertAdminUser();
  const svc = createServiceClient();
  const [kind, value] = str(formData, "op").split(":");
  const ids = str(formData, "ids")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 || !kind || !value) return;

  if (kind === "status" && ORDER_STATUSES.includes(value)) {
    if (value === "paid") {
      for (const id of ids) await setOrderStatusAction(id, "paid");
      return;
    }
    const { data: rows } = await svc
      .from("order")
      .select("id,number,email,currency,locale,tracking_number,tracking_url,shipping_method,status")
      .in("id", ids);
    const { error } = await svc
      .from("order")
      .update({ status: value as never })
      .in("id", ids);
    if (error) throw new Error(error.message);
    const changed = (rows ?? []).filter((r) => r.status !== value);
    await Promise.all(
      changed.map(async (r) => {
        await logOrderEvent(r.id, "status", null, { from: r.status, to: value, source: "admin-bulk" }, admin.email);
        await sendOrderStatusEmail(r, value, { author: admin.email });
      }),
    );
  } else if (kind === "payment" && PAYMENT_STATUSES.includes(value)) {
    if (value === "paid") {
      for (const id of ids) await markOrderPaid(id, { source: "admin", author: admin.email });
    } else {
      const { error } = await svc
        .from("order")
        .update({ payment_status: value as never })
        .in("id", ids);
      if (error) throw new Error(error.message);
      await Promise.all(ids.map((id) => logOrderEvent(id, "payment", null, { status: value, source: "admin-bulk" }, admin.email)));
    }
  } else {
    return;
  }
  revalidatePath("/", "layout");
}

/* ── Zákazníci ─────────────────────────────────────────────────────────── */
export async function setCustomerRoleAction(formData: FormData) {
  await assertAdmin();
  const id = str(formData, "id");
  const role = str(formData, "role");
  if (!id || !["customer", "staff", "admin"].includes(role)) return;
  const { error } = await createServiceClient()
    .from("customer")
    .update({ role: role as never })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/* ── Slevové kódy ──────────────────────────────────────────────────────── */
export async function saveDiscountAction(formData: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(formData, "id") || null;
  const locale = str(formData, "locale") || "cs";

  const code = str(formData, "code").toUpperCase().replace(/\s+/g, "");
  if (!code) {
    flashRedirect(
      `/${locale}/admin/discounts/${id ?? "new"}`,
      "error",
      "Zadej kód slevy.",
    );
  }

  const type = str(formData, "type") === "fixed" ? "fixed" : "percent";
  const value =
    type === "percent"
      ? Math.min(100, Math.max(1, parseInt(str(formData, "value") || "0", 10) || 0))
      : (money(formData, "value") ?? 0);

  const toDate = (s: string, endOfDay = false): string | null =>
    s ? new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString() : null;
  const usageLimit = parseInt(str(formData, "usage_limit"), 10);

  const payload = {
    code,
    type: type as never,
    value,
    min_order: money(formData, "min_order"),
    valid_from: toDate(str(formData, "valid_from")),
    valid_to: toDate(str(formData, "valid_to"), true),
    usage_limit:
      Number.isFinite(usageLimit) && usageLimit > 0 ? usageLimit : null,
    is_active: formData.get("is_active") === "on",
  };

  const { error } = id
    ? await svc.from("discount_code").update(payload).eq("id", id)
    : await svc.from("discount_code").insert(payload);
  if (error)
    flashRedirect(
      `/${locale}/admin/discounts/${id ?? "new"}`,
      "error",
      error.message.includes("duplicate") ? "Tento kód už existuje." : error.message,
    );

  revalidatePath("/", "layout");
  flashRedirect(`/${locale}/admin/discounts`, "saved");
}

export async function deleteDiscountAction(formData: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("discount_code")
    .delete()
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function toggleDiscountActiveAction(formData: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("discount_code")
    .update({ is_active: formData.get("active") === "1" })
    .eq("id", str(formData, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/* ── Nastavení / integrace ─────────────────────────────────────────────── */
async function upsertSetting(key: string, value: Record<string, unknown>) {
  await assertAdmin();
  const svc = createServiceClient();
  const { error } = await svc
    .from("app_setting")
    .upsert({ key, value: value as never }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function saveGeneralAction(fd: FormData) {
  await upsertSetting("shop.general", {
    name: str(fd, "name"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    ico: str(fd, "ico"),
    dic: str(fd, "dic"),
    address: str(fd, "address"),
    registration: str(fd, "registration"),
    bankAccount: str(fd, "bankAccount"),
    iban: str(fd, "iban"),
    bic: str(fd, "bic"),
    openingHours: str(fd, "openingHours").slice(0, 500),
  });
}

/** Doprava zdarma od částky (Kč / €), prázdné = vypnuto. */
export async function saveShippingSettingsAction(fd: FormData) {
  await upsertSetting("shipping.settings", {
    freeFromCzk: money(fd, "freeFromCzk"),
    freeFromEur: money(fd, "freeFromEur"),
  });
}

/** Newsletter: sleva za potvrzení odběru (Kč, EUR se přepočítá kurzem ČNB). */
export async function saveNewsletterSettingsAction(fd: FormData) {
  const days = parseInt(str(fd, "validDays"), 10);
  await upsertSetting("newsletter.settings", {
    discountCzk: money(fd, "discountCzk") ?? 0,
    minOrderCzk: money(fd, "minOrderCzk") ?? 0,
    validDays: Number.isFinite(days) && days > 0 ? days : 30,
  });
}

export async function saveThemeAction(fd: FormData) {
  const theme = str(fd, "theme");
  await upsertSetting("appearance.theme", {
    theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
  });
}

export async function saveHeroStyleAction(fd: FormData) {
  const style = str(fd, "hero");
  await upsertSetting("appearance.hero", {
    style: style === "logo" || style === "logo-dark" ? style : "light",
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
    productType: str(fd, "productType"),
    senderName: str(fd, "senderName"),
    senderStreet: str(fd, "senderStreet"),
    senderCity: str(fd, "senderCity"),
    senderZip: str(fd, "senderZip"),
  });
}
export async function saveZasilkovnaAction(fd: FormData) {
  await upsertSetting("integrations.zasilkovna", {
    apiKey: str(fd, "apiKey"),
    apiPassword: str(fd, "apiPassword"),
    eshopId: str(fd, "eshopId"),
    homeCarrierId: str(fd, "homeCarrierId"),
  });
}
export async function saveAiAction(fd: FormData) {
  await upsertSetting("integrations.ai", { anthropicKey: str(fd, "anthropicKey") });
}
export async function saveAnalyticsAction(fd: FormData) {
  await upsertSetting("integrations.analytics", {
    ga4: str(fd, "ga4"),
    sklik: str(fd, "sklik"),
    metaPixel: str(fd, "metaPixel"),
  });
}

/* ── LEDX řady (Profi osvětlení) ───────────────────────────────────────── */
const linesArr = (fd: FormData, k: string) =>
  str(fd, k)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const tableArr = (fd: FormData, k: string) =>
  str(fd, k)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((row) => row.split("|").map((c) => c.trim()));

/** Pole řady, která mají EN/DE překlad (čeština = základní sloupce). */
const LEDX_TR_TEXT = ["subtitle", "tagline", "landing_desc", "detail_lead", "models_note", "uses_title", "form_cct_fixed"] as const;
const LEDX_TR_LIST = ["landing_pills", "detail_pills", "uses", "form_models", "form_cct", "form_uhel"] as const;
const LEDX_TR_TABLE = ["models", "params"] as const;

/** Sestaví {en:{…}, de:{…}} z polí `<sloupec>__en` / `<sloupec>__de` (prázdné vynechá → fallback na CS). */
function ledxTranslations(fd: FormData) {
  const out: Record<string, Record<string, unknown>> = {};
  for (const loc of ["en", "de"]) {
    const t: Record<string, unknown> = {};
    for (const col of LEDX_TR_TEXT) {
      const v = str(fd, `${col}__${loc}`);
      if (v) t[col] = v;
    }
    for (const col of LEDX_TR_LIST) {
      const v = linesArr(fd, `${col}__${loc}`);
      if (v.length) t[col] = v;
    }
    for (const col of LEDX_TR_TABLE) {
      const v = tableArr(fd, `${col}__${loc}`);
      if (v.length) t[col] = v;
    }
    out[loc] = t;
  }
  return out;
}

export async function saveLedxLineAction(fd: FormData): Promise<void> {
  await assertAdmin();
  const svc = createServiceClient();
  const id = str(fd, "id");
  const locale = str(fd, "locale") || "cs";
  const slug = str(fd, "slug")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const name = str(fd, "name");
  if (!slug || !name) flashRedirect(`/${locale}/admin/ledx`, "error", "Vyplňte název a slug.");

  let images: unknown = [];
  try {
    images = JSON.parse(str(fd, "images") || "[]");
  } catch {
    images = [];
  }

  const payload = {
    slug,
    sort_order: parseInt(str(fd, "sort_order") || "0", 10) || 0,
    is_published: fd.get("is_published") === "on",
    name,
    subtitle: str(fd, "subtitle") || null,
    tagline: str(fd, "tagline") || null,
    landing_desc: str(fd, "landing_desc") || null,
    landing_pills: linesArr(fd, "landing_pills") as never,
    detail_lead: str(fd, "detail_lead") || null,
    detail_pills: linesArr(fd, "detail_pills") as never,
    models_note: str(fd, "models_note") || null,
    models: tableArr(fd, "models") as never,
    params: tableArr(fd, "params") as never,
    uses_title: str(fd, "uses_title") || null,
    uses: linesArr(fd, "uses") as never,
    images: images as never,
    form_models: linesArr(fd, "form_models") as never,
    form_cct: linesArr(fd, "form_cct") as never,
    form_cct_fixed: str(fd, "form_cct_fixed") || null,
    form_uhel: linesArr(fd, "form_uhel") as never,
    translations: ledxTranslations(fd) as never,
  };

  const { error } = id
    ? await svc.from("ledx_line").update(payload).eq("id", id)
    : await svc.from("ledx_line").insert(payload);
  if (error) flashRedirect(`/${locale}/admin/ledx`, "error", error.message);
  revalidatePath("/", "layout");
  flashRedirect(`/${locale}/admin/ledx`, "saved", "Řada uložena");
}

export async function deleteLedxLineAction(fd: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("ledx_line")
    .delete()
    .eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function toggleLedxLinePublishedAction(fd: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("ledx_line")
    .update({ is_published: fd.get("published") === "1" })
    .eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Statistiky + reference na stránce Profi osvětlení (app_setting ledx.page). */
export async function saveLedxPageContentAction(fd: FormData): Promise<void> {
  const locale = str(fd, "locale") || "cs";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(str(fd, "payload") || "null");
  } catch {
    parsed = null;
  }
  const value = normalizeLedxPage(parsed);
  if (!value) flashRedirect(`/${locale}/admin/ledx/content`, "error", "Neplatná data formuláře.");
  try {
    await upsertSetting(LEDX_PAGE_SETTING, value as unknown as Record<string, unknown>);
  } catch (e) {
    flashRedirect(`/${locale}/admin/ledx/content`, "error", e instanceof Error ? e.message : "Uložení selhalo");
  }
  flashRedirect(`/${locale}/admin/ledx/content`, "saved", "Obsah uložen");
}

/* ── Recenze ───────────────────────────────────────────────────────────── */
export async function approveReviewAction(fd: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("review")
    .update({ is_approved: fd.get("approved") === "1" })
    .eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteReviewAction(fd: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("review")
    .delete()
    .eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/* ── Právní stránky (obchodní podmínky, GDPR) ──────────────────────────── */
export async function saveLegalAction(fd: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const doc = str(fd, "doc");
  const key =
    doc === "privacy"
      ? "legal.privacy"
      : doc === "claims"
        ? "legal.claims"
        : "legal.terms";
  const content = i18n(fd, "content");
  const { error } = await svc
    .from("app_setting")
    .upsert({ key, value: content as never }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Obsah stránky „O nás" (i18n, HTML z WYSIWYG). */
export async function saveAboutAction(fd: FormData) {
  await assertAdmin();
  const svc = createServiceClient();
  const content = i18n(fd, "content");
  const { error } = await svc
    .from("app_setting")
    .upsert({ key: "content.about", value: content as never }, { onConflict: "key" });
  if (error) throw new Error(error.message);
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
    pickup_point: fd.get("pickup_point") === "on",
    sort_order: parseInt(str(fd, "sort_order") || "0", 10),
  };
  const { error } = id
    ? await svc.from("shipping_method").update(payload).eq("id", id)
    : await svc.from("shipping_method").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
export async function deleteShippingMethodAction(fd: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("shipping_method")
    .delete()
    .eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
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
  const { error } = id
    ? await svc.from("payment_method").update(payload).eq("id", id)
    : await svc.from("payment_method").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
export async function deletePaymentMethodAction(fd: FormData) {
  await assertAdmin();
  const { error } = await createServiceClient()
    .from("payment_method")
    .delete()
    .eq("id", str(fd, "id"));
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
