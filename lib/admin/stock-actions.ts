"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { applyStockChange } from "@/lib/admin/stock-rpc";
import { assertAdminUser } from "@/lib/admin/auth";
import { notifyStockAlerts } from "@/lib/stock-alerts/notify";
import { checkLowStock } from "@/lib/stock-alerts/low-stock";
import { MANUAL_MOVEMENT_TYPES, isMovementType, type MovementType } from "@/lib/admin/stock-stats";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v ? String(v).trim() : "";
};

function flashRedirect(path: string, flash: "saved" | "error", msg?: string): never {
  const p = new URLSearchParams({ flash, t: Date.now().toString() });
  if (msg) p.set("msg", msg);
  redirect(`${path}?${p.toString()}`);
}

/**
 * Ruční pohyb skladu z detailu produktu v sekci Sklad: příjem zboží (+),
 * vrácení (+), odpis (−) nebo oprava na nový stav. Jde přes RPC
 * `apply_stock_change`, které zapíše pohyb i s autorem.
 */
export async function recordStockMovementAction(fd: FormData): Promise<void> {
  const admin = await assertAdminUser();
  const locale = str(fd, "locale") || "cs";
  const productId = str(fd, "product_id");
  const variantId = str(fd, "variant_id") || null;
  const type = str(fd, "type");
  const qty = parseInt(str(fd, "qty"), 10);
  const note = str(fd, "note") || null;
  const source = str(fd, "source") || null;
  const back = `/${locale}/admin/stock/${productId}`;

  if (!productId || !isMovementType(type) || !MANUAL_MOVEMENT_TYPES.includes(type)) {
    flashRedirect(back, "error", "Neplatný typ pohybu.");
  }
  if (!Number.isFinite(qty) || qty < 0 || (type !== "adj" && qty === 0)) {
    flashRedirect(back, "error", "Zadejte množství.");
  }

  const t: MovementType = type;
  const args =
    t === "adj"
      ? { p_delta: 0, p_set_qty: qty }
      : { p_delta: t === "writeoff" ? -qty : qty, p_set_qty: null };

  const svc = createServiceClient();
  const { data: after, error } = await applyStockChange(svc, {
    p_product_id: productId,
    p_variant_id: variantId,
    ...args,
    p_type: t,
    p_note: note,
    p_author: admin.email,
    p_source: source,
  });
  if (error) {
    flashRedirect(back, "error", error.message.includes("NOT_FOUND") ? "Produkt nebo varianta nenalezena." : error.message);
  }

  if ((after ?? 0) > 0) await notifyStockAlerts(productId);
  await checkLowStock([productId]);
  revalidatePath("/", "layout");
  flashRedirect(back, "saved", `Pohyb zapsán, skladem ${after} ks`);
}
