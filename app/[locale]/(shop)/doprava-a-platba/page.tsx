import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Truck, CreditCard, Store, Package } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getShippingMethods, getPaymentMethods } from "@/lib/queries";
import { freeShippingThreshold, getContentI18n, getShippingSettings } from "@/lib/settings";
import { formatPrice, localeCurrency, pickI18n } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Shipping" });
  return { title: t("title"), description: t("metaDescription"), alternates: localizedAlternates(locale, "doprava-a-platba") };
}

/**
 * Doprava a platba — generováno z metod dopravy a platby v adminu (ceny v měně jazyka),
 * doprava zdarma z nastavení, doplňující text z `content.shipping` (Nastavení → Doprava).
 */
export default async function ShippingPaymentPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, shipping, payment, settings, content] = await Promise.all([
    getTranslations("Shipping"),
    getShippingMethods(),
    getPaymentMethods(),
    getShippingSettings(),
    getContentI18n("content.shipping"),
  ]);
  const currency = localeCurrency[locale];
  const freeFrom = freeShippingThreshold(settings, currency);
  const fmt = (m: number | null | undefined) => ((m ?? 0) > 0 ? formatPrice(m ?? 0, locale) : t("free"));
  const text = pickI18n(content, locale, "");

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-gray-soft">{t("intro")}</p>
      {freeFrom != null && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest/10 px-4 py-2 text-sm font-semibold text-forest">
          <Truck className="size-4" /> {t("freeFrom", { amount: formatPrice(freeFrom, locale) })}
        </p>
      )}

      <h2 className="mt-10 flex items-center gap-2 font-display text-2xl font-semibold">
        <Package className="size-6 text-forest" /> {t("shippingTitle")}
      </h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-cream-dark">
            {shipping.map((m) => (
              <tr key={m.code}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    {m.carrier === "personal" ? <Store className="size-4 text-forest" /> : <Truck className="size-4 text-forest" />}
                    {pickI18n(m.name_i18n, locale)}
                  </span>
                  {t.has(`carrier.${m.carrier}`) && <span className="mt-0.5 block text-xs text-gray-soft">{t(`carrier.${m.carrier}`)}</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{fmt(currency === "CZK" ? m.price_czk : m.price_eur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gray-soft">{t("shippingNote")}</p>

      <h2 className="mt-10 flex items-center gap-2 font-display text-2xl font-semibold">
        <CreditCard className="size-6 text-forest" /> {t("paymentTitle")}
      </h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-cream-dark">
            {payment.map((m) => (
              <tr key={m.code}>
                <td className="px-4 py-3">
                  <span className="font-medium text-ink">{pickI18n(m.name_i18n, locale)}</span>
                  <span className="mt-0.5 block text-xs text-gray-soft">{t(`provider.${m.provider === "comgate" ? "comgate" : m.provider === "cod" ? "cod" : "bank"}`)}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono whitespace-nowrap">{fmt(currency === "CZK" ? m.fee_czk : m.fee_eur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gray-soft">{t("paymentNote")}</p>

      {text && <div className="rich-content mt-10 text-[15px] leading-relaxed text-charcoal/90" dangerouslySetInnerHTML={{ __html: text }} />}

      <p className="mt-10 text-sm text-gray-soft">
        {t.rich("legalLinks", {
          terms: (c) => <Link href="/obchodni-podminky" className="text-forest underline hover:text-forest-light">{c}</Link>,
          claims: (c) => <Link href="/reklamace" className="text-forest underline hover:text-forest-light">{c}</Link>,
          withdrawal: (c) => <Link href="/odstoupeni-od-smlouvy" className="text-forest underline hover:text-forest-light">{c}</Link>,
        })}
      </p>
    </section>
  );
}
