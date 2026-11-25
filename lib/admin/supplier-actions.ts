"use server";

import { revalidatePath } from "next/cache";
import { assertAdminUser } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { syncSupplierFeed, type SyncResult } from "@/lib/suppliers/sync";
import { importFeedItems, type ImportResult } from "@/lib/suppliers/import";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Načte feed hned (jinak denně ve 4:00 UTC cronem). */
export async function syncFeedAction(fd: FormData): Promise<SyncResult> {
  await assertAdminUser();
  const res = await syncSupplierFeed(str(fd, "id"));
  revalidatePath("/", "layout");
  return res;
}

/** Přidání / úprava feedu dodavatele. */
export async function saveFeedAction(fd: FormData) {
  await assertAdminUser();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const url = str(fd, "url");
  if (!name || !/^https?:\/\//.test(url)) throw new Error("Vyplň název a adresu feedu (https://…).");
  const payload = {
    name,
    url,
    sku_prefix: str(fd, "sku_prefix").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
    is_active: fd.get("is_active") === "on",
  };
  const svc = createServiceClient();
  const { error } = id
    ? await svc.from("supplier_feed").update(payload).eq("id", id)
    : await svc.from("supplier_feed").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Import vybraných položek jako produkty (max. 40 najednou). */
export async function importFeedItemsAction(fd: FormData): Promise<ImportResult> {
  await assertAdminUser();
  const ids = String(fd.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const pct = parseFloat(str(fd, "markup").replace(",", "."));
  const res = await importFeedItems(ids, {
    categoryId: str(fd, "category_id") || null,
    rule: str(fd, "rule") === "markup" ? { mode: "markup", pct: Number.isFinite(pct) ? pct : 0 } : { mode: "recommended" },
    publish: fd.get("publish") === "on",
    copyImages: fd.get("copy_images") === "on",
  });
  revalidatePath("/", "layout");
  return res;
}

/** Zrušit napojení položky na produkt (produkt zůstává, jen se přestane aktualizovat z feedu). */
export async function unlinkFeedItemAction(fd: FormData) {
  await assertAdminUser();
  await createServiceClient().from("supplier_feed_item").update({ product_id: null }).eq("id", str(fd, "id"));
  revalidatePath("/", "layout");
}
