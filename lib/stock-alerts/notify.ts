import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import { stockAlertEmail } from "@/lib/email/templates";
import { pickI18n } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

function safeLocale(v: string | null | undefined): Locale {
  return v === "en" || v === "de" ? v : "cs";
}

/**
 * Po změně skladu: pošle e-mail všem, kdo hlídají produkt (nebo variantu),
 * pokud je znovu skladem, a označí je jako obeslané. Volat po uložení
 * produktu / inline změně skladu v adminu. Nikdy nevyhazuje.
 */
export async function notifyStockAlerts(productId: string): Promise<number> {
  try {
    const svc = createServiceClient();
    const { data: alerts } = await svc
      .from("stock_alert")
      .select("id, variant_id, email, locale")
      .eq("product_id", productId)
      .is("notified_at", null);
    if (!alerts || alerts.length === 0) return 0;

    const { data: product } = await svc
      .from("product")
      .select("id, slug, name, name_i18n, stock_qty, is_published, product_variant(id, name, name_i18n, stock_qty)")
      .eq("id", productId)
      .maybeSingle();
    if (!product || !product.is_published) return 0;

    const variants = (product.product_variant ?? []) as { id: string; name: string; name_i18n: unknown; stock_qty: number }[];
    const productInStock = variants.length > 0 ? variants.some((v) => v.stock_qty > 0) : product.stock_qty > 0;

    let sent = 0;
    for (const a of alerts) {
      const variant = a.variant_id ? variants.find((v) => v.id === a.variant_id) : null;
      const inStock = a.variant_id ? (variant?.stock_qty ?? 0) > 0 : productInStock;
      if (!inStock) continue;

      const locale = safeLocale(a.locale);
      const name = pickI18n(product.name_i18n as Record<string, string>, locale, product.name);
      const variantName = variant ? pickI18n(variant.name_i18n as Record<string, string>, locale, variant.name) : null;
      const mail = stockAlertEmail({
        locale,
        productName: variantName ? `${name} – ${variantName}` : name,
        productUrl: `${siteUrl()}/${locale}/produkt/${product.slug}`,
      });
      const ok = await sendMail({ to: a.email, ...mail });
      if (ok) {
        await svc.from("stock_alert").update({ notified_at: new Date().toISOString() }).eq("id", a.id);
        sent++;
      }
    }
    return sent;
  } catch (e) {
    console.error("[stock-alert] odeslání selhalo:", e);
    return 0;
  }
}
