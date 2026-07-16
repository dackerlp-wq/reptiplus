import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { localeCurrency, pickI18n, priceForLocale, compareForLocale } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import type { I18n } from "@/lib/queries";

export const CART_COOKIE = "rp_cart";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dní

/** Řádek košíku připravený k zobrazení (ceny v měně dle locale). */
export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  sku: string | null;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number; // minor units, měna dle locale
  compareAt: number | null;
  qty: number;
  stock: number;
  lineTotal: number;
};

export type CartView = {
  lines: CartLine[];
  itemCount: number; // součet množství
  subtotal: number; // minor units
  currency: "CZK" | "EUR";
};

const EMPTY = (currency: "CZK" | "EUR"): CartView => ({
  lines: [],
  itemCount: 0,
  subtotal: 0,
  currency,
});

type CartRow = { product_id: string; qty: number; variant_id: string | null };

/** Ověřený uživatel (nebo null) — identitu bereme jen z auth, nikdy z klienta. */
async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Vrátí ID aktuálního košíku. `create=true` (jen v Server Actions) košík i cookie
 * v případě potřeby vytvoří. Při čtení v render fázi `create=false` — cookie se nesahá.
 */
export async function getCartId(create: boolean): Promise<string | null> {
  const svc = createServiceClient();
  const userId = await getUserId();
  const cookieStore = await cookies();

  if (userId) {
    const { data } = await svc
      .from("cart")
      .select("id")
      .eq("customer_id", userId)
      .maybeSingle();
    if (data) return data.id;
    if (!create) return null;
    const { data: created } = await svc
      .from("cart")
      .insert({ customer_id: userId })
      .select("id")
      .single();
    return created?.id ?? null;
  }

  // Host — identita přes httpOnly cookie
  let sid = cookieStore.get(CART_COOKIE)?.value ?? null;
  if (!sid) {
    if (!create) return null;
    sid = crypto.randomUUID();
    cookieStore.set(CART_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
  }
  const { data } = await svc
    .from("cart")
    .select("id")
    .eq("session_id", sid)
    .is("customer_id", null)
    .maybeSingle();
  if (data) return data.id;
  if (!create) return null;
  const { data: created } = await svc
    .from("cart")
    .insert({ session_id: sid })
    .select("id")
    .single();
  return created?.id ?? null;
}

/** Kompletní košík k zobrazení (stránka /kosik). Ceny živě z produktu. */
export async function getCart(locale: Locale): Promise<CartView> {
  const currency = localeCurrency[locale];
  const cartId = await getCartId(false);
  if (!cartId) return EMPTY(currency);

  const svc = createServiceClient();
  const { data } = await svc
    .from("cart_item")
    .select(
      "id, qty, variant_id, product:product_id(id,slug,name,name_i18n,sku,price_czk,price_eur,compare_at_czk,compare_at_eur,stock_qty,is_published,product_image(url,sort_order)), variant:variant_id(id,name,sku,price_czk,price_eur,stock_qty)",
    )
    .eq("cart_id", cartId)
    .order("added_at");

  type Row = {
    id: string;
    qty: number;
    variant_id: string | null;
    product: {
      id: string;
      slug: string;
      name: string;
      name_i18n: I18n;
      sku: string | null;
      price_czk: number;
      price_eur: number | null;
      compare_at_czk: number | null;
      compare_at_eur: number | null;
      stock_qty: number;
      is_published: boolean;
      product_image: { url: string; sort_order: number }[] | null;
    } | null;
    variant: {
      id: string;
      name: string;
      sku: string | null;
      price_czk: number | null;
      price_eur: number | null;
      stock_qty: number;
    } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const lines: CartLine[] = [];
  let subtotal = 0;
  let itemCount = 0;

  for (const r of rows) {
    // Nepublikovaný / smazaný produkt do košíku nepatří.
    if (!r.product || !r.product.is_published) continue;

    // Cena z varianty, pokud ji v dané měně má; jinak z produktu.
    const variantHasPrice =
      r.variant &&
      (currency === "CZK"
        ? r.variant.price_czk != null
        : r.variant.price_eur != null);
    const priceSource = variantHasPrice ? r.variant! : r.product;
    const unitPrice = priceForLocale(priceSource, locale);
    const compareAt = compareForLocale(r.product, locale);

    // Sklad podle varianty (má-li ji), jinak podle produktu.
    const effectiveStock = r.variant ? r.variant.stock_qty : r.product.stock_qty;
    const qty = Math.min(r.qty, effectiveStock);
    if (qty <= 0) continue;

    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    itemCount += qty;

    const imgs = r.product.product_image ?? [];
    const primaryImg =
      imgs.length > 0
        ? [...imgs].sort((a, b) => a.sort_order - b.sort_order)[0].url
        : null;

    lines.push({
      id: r.id,
      productId: r.product.id,
      slug: r.product.slug,
      name: pickI18n(r.product.name_i18n, locale, r.product.name),
      imageUrl: primaryImg,
      sku: r.variant?.sku ?? r.product.sku,
      variantId: r.variant_id,
      variantName: variantHasPrice ? r.variant!.name : (r.variant?.name ?? null),
      unitPrice,
      compareAt: compareAt && compareAt > unitPrice ? compareAt : null,
      qty,
      stock: effectiveStock,
      lineTotal,
    });
  }

  return { lines, itemCount, subtotal, currency };
}

/** Rychlý součet množství pro odznak v navbaru (bez těžkého joinu). */
export async function getCartCount(): Promise<number> {
  const cartId = await getCartId(false);
  if (!cartId) return 0;
  const svc = createServiceClient();
  const { data } = await svc
    .from("cart_item")
    .select("qty")
    .eq("cart_id", cartId);
  return (data ?? []).reduce((sum, r) => sum + (r.qty ?? 0), 0);
}

/**
 * Sloučí hostův košík (z cookie) do košíku přihlášeného zákazníka.
 * Volá se po úspěšném přihlášení/registraci. Množství se sčítá a ořeže na sklad.
 */
export async function mergeGuestCartOnLogin(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(CART_COOKIE)?.value;
  if (!sid) return;

  const svc = createServiceClient();
  const { data: guest } = await svc
    .from("cart")
    .select("id")
    .eq("session_id", sid)
    .is("customer_id", null)
    .maybeSingle();

  // Cookie po přihlášení už nepotřebujeme.
  cookieStore.delete(CART_COOKIE);
  if (!guest) return;

  const { data: guestItems } = await svc
    .from("cart_item")
    .select("product_id, qty, variant_id")
    .eq("cart_id", guest.id);

  if (guestItems && guestItems.length > 0) {
    // Cílový (zákaznický) košík
    let { data: target } = await svc
      .from("cart")
      .select("id")
      .eq("customer_id", userId)
      .maybeSingle();
    if (!target) {
      const { data: created } = await svc
        .from("cart")
        .insert({ customer_id: userId })
        .select("id")
        .single();
      target = created;
    }

    if (target) {
      const { data: existing } = await svc
        .from("cart_item")
        .select("id, product_id, qty, variant_id")
        .eq("cart_id", target.id);
      const existingRows = (existing ?? []) as (CartRow & { id: string })[];

      for (const gi of guestItems as CartRow[]) {
        const { data: prod } = await svc
          .from("product")
          .select("stock_qty")
          .eq("id", gi.product_id)
          .maybeSingle();
        const stock = prod?.stock_qty ?? 0;
        if (stock <= 0) continue;

        const match = existingRows.find(
          (e) => e.product_id === gi.product_id && e.variant_id === gi.variant_id,
        );
        if (match) {
          const qty = Math.min(match.qty + gi.qty, stock);
          await svc.from("cart_item").update({ qty }).eq("id", match.id);
        } else {
          await svc.from("cart_item").insert({
            cart_id: target.id,
            product_id: gi.product_id,
            variant_id: gi.variant_id,
            qty: Math.min(gi.qty, stock),
          });
        }
      }
    }
  }

  // Hostův košík zrušíme (cascade smaže i položky).
  await svc.from("cart").delete().eq("id", guest.id);
}
