import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { getCart } from "@/lib/cart/cart";
import { getShippingMethods, getPaymentMethods } from "@/lib/queries";
import { freeShippingThreshold, getPacketaApiKey, getShippingSettings } from "@/lib/settings";
import { localeCurrency, pickI18n } from "@/lib/i18n";
import { CheckoutForm } from "@/components/reptiplus/checkout-form";
import { BeginCheckoutTracker } from "@/components/reptiplus/track";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Checkout" });
  return { title: t("title") };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Checkout");

  const cart = await getCart(locale);
  // Prázdný košík → zpět do košíku (nedává smysl objednávat nic)
  if (cart.lines.length === 0) redirect(`/${locale}/kosik`);

  const [shipping, payment, packetaApiKey, shippingSettings, supabase] = await Promise.all([
    getShippingMethods(),
    getPaymentMethods(),
    getPacketaApiKey(),
    getShippingSettings(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Uložené adresy přihlášeného zákazníka (RLS owner) → výběr v pokladně.
  const { data: savedAddresses } = user
    ? await supabase
        .from("address")
        .select("id, type, label, full_name, company, ico, dic, street, city, postal_code, country, phone, is_default")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
    : { data: [] };

  const currency = localeCurrency[locale];
  // Doprava zdarma od částky (nastavení obchodu) — platí pro mezisoučet zboží.
  const freeShippingFrom = freeShippingThreshold(shippingSettings, currency);
  const freeShipping = freeShippingFrom != null && cart.subtotal >= freeShippingFrom;
  const shippingOptions = shipping.map((m) => ({
    code: m.code,
    name: pickI18n(m.name_i18n, locale),
    fee: freeShipping ? 0 : ((currency === "CZK" ? m.price_czk : m.price_eur) ?? 0),
    pickup: m.pickup_point,
  }));
  const paymentOptions = payment.map((m) => ({
    code: m.code,
    name: pickI18n(m.name_i18n, locale),
    fee: (currency === "CZK" ? m.fee_czk : m.fee_eur) ?? 0,
  }));

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <BeginCheckoutTracker
        items={cart.lines.map((l) => ({
          id: l.productId,
          name: l.name,
          price: l.unitPrice,
          qty: l.qty,
        }))}
        value={cart.subtotal}
        currency={currency}
      />
      <h1 className="mb-8 font-display text-4xl font-bold">{t("title")}</h1>
      <CheckoutForm
        locale={locale}
        subtotal={cart.subtotal}
        shippingOptions={shippingOptions}
        paymentOptions={paymentOptions}
        freeShippingFrom={freeShippingFrom}
        defaultEmail={user?.email ?? ""}
        packetaApiKey={packetaApiKey}
        loggedIn={Boolean(user)}
        savedAddresses={savedAddresses ?? []}
      />
    </section>
  );
}
