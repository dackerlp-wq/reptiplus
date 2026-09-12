import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import { lowStockEmail } from "@/lib/email/templates";
import { getShopContact } from "@/lib/settings";
import { siteUrl } from "@/lib/seo";

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  stock_qty: number;
  low_stock_threshold: number | null;
  low_stock_notified_at: string | null;
  product_variant: { stock_qty: number }[] | null;
};

/** Efektivní sklad: součet variant, jinak sklad produktu. */
export function effectiveStock(p: { stock_qty: number; product_variant?: { stock_qty: number }[] | null }): number {
  const v = p.product_variant ?? [];
  return v.length > 0 ? v.reduce((s, x) => s + x.stock_qty, 0) : p.stock_qty;
}

/**
 * Po změně skladu (objednávka, editace položek, uložení produktu, CSV import):
 * produkty s nastaveným limitem, které klesly na limit nebo pod něj, ohlásí
 * obchodu jedním e-mailem — jen jednou (`low_stock_notified_at`), znovu až po
 * naskladnění nad limit. Nikdy nevyhazuje.
 */
export async function checkLowStock(productIds: string[]): Promise<number> {
  const ids = Array.from(new Set(productIds.filter(Boolean)));
  if (ids.length === 0) return 0;
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("product")
      .select("id, name, sku, stock_qty, low_stock_threshold, low_stock_notified_at, product_variant(stock_qty)")
      .in("id", ids)
      .not("low_stock_threshold", "is", null);
    const rows = (data ?? []) as ProductRow[];

    const toNotify: { id: string; name: string; sku: string | null; stock: number; threshold: number }[] = [];
    const toReset: string[] = [];
    for (const p of rows) {
      const threshold = p.low_stock_threshold ?? 0;
      const stock = effectiveStock(p);
      if (stock <= threshold) {
        if (!p.low_stock_notified_at) toNotify.push({ id: p.id, name: p.name, sku: p.sku, stock, threshold });
      } else if (p.low_stock_notified_at) {
        toReset.push(p.id);
      }
    }
    if (toReset.length) await svc.from("product").update({ low_stock_notified_at: null }).in("id", toReset);
    if (toNotify.length === 0) return 0;

    const contact = await getShopContact().catch(() => null);
    const to = contact?.email || process.env.SHOP_NOTIFY_EMAIL || "";
    if (!to) return 0;
    const mail = lowStockEmail({
      products: toNotify.map((p) => ({ ...p, adminUrl: `${siteUrl()}/cs/admin/products/${p.id}` })),
    });
    const ok = await sendMail({ to, ...mail });
    if (ok) {
      await svc
        .from("product")
        .update({ low_stock_notified_at: new Date().toISOString() })
        .in("id", toNotify.map((p) => p.id));
    }
    return ok ? toNotify.length : 0;
  } catch (e) {
    console.error("[stock] kontrola limitu skladu selhala:", e);
    return 0;
  }
}
