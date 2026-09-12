"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCart, getCartId } from "@/lib/cart/cart";
import { localeCurrency } from "@/lib/i18n";
import { validateDiscount, type DiscountError } from "@/lib/checkout/discount";
import { createComgatePayment } from "@/lib/comgate/client";
import { sendOrderConfirmation } from "@/lib/orders/confirmation";
import { logOrderEvent } from "@/lib/orders/events";
import { routing, type Locale } from "@/i18n/routing";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function safeLocale(v: string): Locale {
  return (routing.locales as readonly string[]).includes(v)
    ? (v as Locale)
    : routing.defaultLocale;
}

/** Náhodné, těžko uhodnutelné číslo objednávky: RPyyMMdd-XXXX */
function genOrderNumber(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  const rnd = Array.from({ length: 4 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
  ).join("");
  return `RP${date}-${rnd}`;
}

/* ── Ověření slevového kódu (živý náhled v pokladně) ───────────────────── */
export type DiscountState =
  | { status: "idle" }
  | { status: "ok"; code: string; amount: number }
  | { status: "error"; error: DiscountError };

export async function applyDiscountAction(
  _prev: DiscountState,
  fd: FormData,
): Promise<DiscountState> {
  const locale = safeLocale(s(fd, "locale"));
  const code = s(fd, "discount_code");
  if (!code) return { status: "idle" };

  const currency = localeCurrency[locale];
  const cart = await getCart(locale);
  if (cart.lines.length === 0) return { status: "error", error: "NOT_FOUND" };

  const res = await validateDiscount(createServiceClient(), code, cart.subtotal, currency);
  return res.ok
    ? { status: "ok", code: res.code, amount: res.amount }
    : { status: "error", error: res.error };
}

/* ── Dohledání objednávky (host, přes číslo + e-mail) ──────────────────── */
export type LookupState = { error?: string } | undefined;

export async function lookupOrderAction(
  _prev: LookupState,
  fd: FormData,
): Promise<LookupState> {
  const locale = safeLocale(s(fd, "locale"));
  const number = s(fd, "number");
  const email = s(fd, "email");
  if (!number || !email) return { error: "MISSING" };

  const svc = createServiceClient();
  const { data } = await svc
    .from("order")
    .select("number, email")
    .eq("number", number)
    .maybeSingle();

  // Vyžadujeme shodu čísla i e-mailu → číslo samotné nestačí k dohledání.
  if (!data || data.email.toLowerCase() !== email.toLowerCase())
    return { error: "NOT_FOUND" };

  redirect(`/${locale}/objednavka/${data.number}`);
}

/* ── Vytvoření objednávky ──────────────────────────────────────────────── */
export type OrderState = { error?: string } | undefined;

export async function createOrderAction(
  _prev: OrderState,
  fd: FormData,
): Promise<OrderState> {
  const locale = safeLocale(s(fd, "locale"));
  const currency = localeCurrency[locale];

  // 1) Validace vstupů
  const email = s(fd, "email");
  if (!isEmail(email)) return { error: "EMAIL" };

  const ship = {
    full_name: s(fd, "shipping_full_name"),
    street: s(fd, "shipping_street"),
    city: s(fd, "shipping_city"),
    postal_code: s(fd, "shipping_postal_code"),
    country: s(fd, "shipping_country") || "CZ",
    phone: s(fd, "shipping_phone"),
  };
  if (!ship.full_name || !ship.street || !ship.city || !ship.postal_code)
    return { error: "ADDRESS" };

  const billingSame = fd.get("billing_same") !== "off";
  const bill = billingSame
    ? ship
    : {
        full_name: s(fd, "billing_full_name"),
        street: s(fd, "billing_street"),
        city: s(fd, "billing_city"),
        postal_code: s(fd, "billing_postal_code"),
        country: s(fd, "billing_country") || "CZ",
        phone: s(fd, "billing_phone"),
      };
  if (!billingSame && (!bill.full_name || !bill.street || !bill.city || !bill.postal_code))
    return { error: "BILLING" };

  const shippingCode = s(fd, "shipping_method");
  const paymentCode = s(fd, "payment_method");
  if (!shippingCode) return { error: "SHIPPING" };
  if (!paymentCode) return { error: "PAYMENT" };

  const svc = createServiceClient();

  // 2) Košík (autoritativní ceny ze serveru)
  const cart = await getCart(locale);
  if (cart.lines.length === 0) return { error: "EMPTY" };
  const cartId = await getCartId(false);

  // 3) Doprava + platba z DB (nikdy z klienta)
  const priceCol = currency === "CZK" ? "price_czk" : "price_eur";
  const feeCol = currency === "CZK" ? "fee_czk" : "fee_eur";

  const { data: shipRow } = await svc
    .from("shipping_method")
    .select(`code, pickup_point, ${priceCol}`)
    .eq("code", shippingCode)
    .eq("is_active", true)
    .maybeSingle();
  if (!shipRow) return { error: "SHIPPING" };
  const shippingFee =
    (shipRow as unknown as Record<string, number | null>)[priceCol] ?? 0;

  // Výdejní místo (Zásilkovna) — povinné, pokud metoda vyžaduje pickup.
  const requiresPickup =
    (shipRow as unknown as { pickup_point?: boolean }).pickup_point === true;
  const pickupId = s(fd, "pickup_point_id");
  if (requiresPickup && !pickupId) return { error: "PICKUP" };
  if (requiresPickup) {
    Object.assign(ship, {
      pickup_point_id: pickupId,
      pickup_point_name: s(fd, "pickup_point_name"),
      pickup_point_address: s(fd, "pickup_point_address"),
    });
  }

  const { data: payRow } = await svc
    .from("payment_method")
    .select(`code, provider, ${feeCol}`)
    .eq("code", paymentCode)
    .eq("is_active", true)
    .maybeSingle();
  if (!payRow) return { error: "PAYMENT" };
  const paymentFee =
    (payRow as unknown as Record<string, number | null>)[feeCol] ?? 0;
  const paymentProvider = String(
    (payRow as unknown as Record<string, unknown>).provider ?? "",
  );

  // 4) Sleva (znovu ověřená na serveru)
  let discountId: string | null = null;
  let discountAmount = 0;
  const discountCode = s(fd, "discount_code");
  if (discountCode) {
    const res = await validateDiscount(svc, discountCode, cart.subtotal, currency);
    if (!res.ok) return { error: "DISCOUNT" };
    discountId = res.discountId;
    discountAmount = res.amount;
  }

  // 5) Součty
  const subtotal = cart.subtotal;
  const total = Math.max(0, subtotal + shippingFee + paymentFee - discountAmount);

  // 6) Zákazník (pokud přihlášen)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = cart.lines.map((l) => ({
    product_id: l.productId,
    variant_id: l.variantId ?? "",
    // Název včetně varianty (např. „Arcadia T5 – 39 W") → e-maily, admin, faktura.
    name: l.variantName ? `${l.name} – ${l.variantName}` : l.name,
    sku: l.sku ?? "",
    unit_price: l.unitPrice,
    qty: l.qty,
    line_total: l.lineTotal,
  }));

  // 7) Atomické vytvoření (RPC place_order). Retry při kolizi čísla objednávky.
  let number = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    number = genOrderNumber();
    const { data, error } = await svc.rpc("place_order", {
      payload: {
        number,
        customer_id: user?.id ?? "",
        email,
        subtotal,
        shipping: shippingFee,
        discount: discountAmount,
        total,
        currency,
        payment_fee: paymentFee,
        discount_code_id: discountId ?? "",
        shipping_method: shippingCode,
        payment_method: paymentCode,
        billing_address: bill,
        shipping_address: ship,
        note: s(fd, "note"),
        cart_id: cartId ?? "",
        locale,
        items,
      },
    });

    if (!error) {
      const orderNumber = data ?? number;

      // Absolutní URL webu (doména, kde zákazník objednal — .cz / .eu / .shop;
      // env je jen fallback pro kontext bez requestu). Použije se pro e-maily
      // i pro návratové URL platební brány.
      const h = await headers();
      const host = h.get("host");
      const proto = h.get("x-forwarded-proto") ?? "https";
      const siteUrl = host
        ? `${proto}://${host}`
        : process.env.NEXT_PUBLIC_SITE_URL || "https://reptiplus.cz";

      // Potvrzovací e-maily (zákazník + obchod) a historie — selhání nesmí shodit objednávku.
      const { data: created } = await svc.from("order").select("id").eq("number", orderNumber).maybeSingle();
      if (created) {
        await logOrderEvent(created.id, "system", "Objednávka vytvořena v pokladně.", { source: "checkout", locale });
        await sendOrderConfirmation(created.id, { notifyShop: true });
      }

      revalidatePath("/", "layout");

      // Online platba přes Comgate → přesměruj zákazníka na platební bránu.
      // redirect() musí být MIMO try/catch — vyhazuje interní NEXT_REDIRECT,
      // který by se jinak chytil do catch a přesměrování by se zrušilo.
      if (paymentProvider === "comgate" && total > 0) {
        let gatewayUrl: string | null = null;
        try {
          const pay = await createComgatePayment({
            price: total,
            curr: currency,
            refId: orderNumber,
            label: orderNumber,
            email,
            fullName: ship.full_name,
            lang: locale,
            urlPaid: `${siteUrl}/${locale}/objednavka/${orderNumber}?platba=uspech`,
            urlPending: `${siteUrl}/${locale}/objednavka/${orderNumber}?platba=probiha`,
            urlCancelled: `${siteUrl}/${locale}/objednavka/${orderNumber}?platba=zruseno`,
          });
          await svc
            .from("order")
            .update({ comgate_ref: pay.transId })
            .eq("number", orderNumber);
          gatewayUrl = pay.redirect;
        } catch (e) {
          console.error("[checkout] Comgate se nepodařilo založit platbu:", e);
        }
        redirect(gatewayUrl ?? `/${locale}/objednavka/${orderNumber}?platba=chyba`);
      }

      redirect(`/${locale}/objednavka/${orderNumber}`);
    }

    const msg = error.message ?? "";
    if (msg.includes("INSUFFICIENT_STOCK")) return { error: "STOCK" };
    // 23505 = unique_violation (kolize čísla) → zkusit znovu
    if (!msg.includes("duplicate key") && error.code !== "23505") {
      return { error: "SERVER" };
    }
  }
  return { error: "SERVER" };
}
