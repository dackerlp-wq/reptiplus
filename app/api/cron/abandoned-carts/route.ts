import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail } from "@/lib/email/client";
import { abandonedCartEmail } from "@/lib/email/templates";
import { pickI18n, priceForLocale } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import type { Locale } from "@/i18n/routing";

/** Košík bez aktivity aspoň 24 h (a nejvýš 72 h — starší už nepřipomínáme). */
const MIN_HOURS = 24;
const MAX_HOURS = 72;

const safeLocale = (v: string | null | undefined): Locale => (v === "en" || v === "de" ? v : "cs");

type CartRow = {
  id: string;
  customer_id: string | null;
  created_at: string;
  cart_item: {
    added_at: string;
    qty: number;
    product: { name: string; name_i18n: unknown; price_czk: number; price_eur: number | null; is_published: boolean } | null;
    variant: { name: string; price_czk: number | null; price_eur: number | null } | null;
  }[];
};

/**
 * Denní připomínka opuštěného košíku: jen přihlášení zákazníci, jen jednou na
 * košík (`cart.reminder_sent_at`), bez slevového kódu. Přeskočí zákazníky,
 * kteří od poslední změny košíku už objednali. Vercel Cron, chráněno CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("cart")
    .select(
      "id, customer_id, created_at, cart_item(added_at, qty, product:product_id(name, name_i18n, price_czk, price_eur, is_published), variant:variant_id(name, price_czk, price_eur))",
    )
    .not("customer_id", "is", null)
    .is("reminder_sent_at", null)
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  let sent = 0;
  let skipped = 0;
  for (const cart of (data ?? []) as unknown as CartRow[]) {
    const items = cart.cart_item.filter((i) => i.product && i.product.is_published && i.qty > 0);
    if (items.length === 0 || !cart.customer_id) continue;

    // Poslední aktivita = nejnovější přidání položky (cart.updated_at aplikace neudržuje).
    const last = Math.max(new Date(cart.created_at).getTime(), ...items.map((i) => new Date(i.added_at).getTime()));
    const ageH = (now - last) / 3600_000;
    if (ageH < MIN_HOURS || ageH > MAX_HOURS) continue;

    const [{ data: customer }, { data: lastOrder }] = await Promise.all([
      svc.from("customer").select("email, full_name").eq("id", cart.customer_id).maybeSingle(),
      svc
        .from("order")
        .select("created_at, locale")
        .eq("customer_id", cart.customer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!customer?.email) continue;
    // Od poslední změny košíku už objednal → nepřipomínat (a víckrát nekontrolovat).
    if (lastOrder && new Date(lastOrder.created_at).getTime() >= last) {
      await svc.from("cart").update({ reminder_sent_at: new Date().toISOString() }).eq("id", cart.id);
      skipped++;
      continue;
    }

    const locale = safeLocale(lastOrder?.locale);
    const mail = abandonedCartEmail({
      locale,
      name: (customer.full_name ?? "").trim().split(/\s+/)[0] ?? "",
      items: items.map((i) => {
        const priceSource = i.variant && i.variant.price_czk != null ? i.variant : i.product!;
        const unit = priceForLocale(priceSource, locale);
        const base = pickI18n(i.product!.name_i18n as Record<string, string> | null, locale, i.product!.name);
        return { name: i.variant ? `${base} – ${i.variant.name}` : base, qty: i.qty, lineTotal: unit * i.qty };
      }),
      cartUrl: `${siteUrl()}/${locale}/kosik`,
    });
    const ok = await sendMail({ to: customer.email, ...mail });
    if (ok) {
      await svc.from("cart").update({ reminder_sent_at: new Date().toISOString() }).eq("id", cart.id);
      sent++;
    }
  }

  return NextResponse.json({ sent, skipped });
}
