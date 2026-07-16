import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import Image from "next/image";
import { ShoppingCart, ArrowRight, Leaf } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCart } from "@/lib/cart/cart";
import { formatPrice } from "@/lib/i18n";
import { CartItemControls } from "@/components/reptiplus/cart-item-controls";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cart" });
  return { title: t("title") };
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Cart");

  const cart = await getCart(locale);

  if (cart.lines.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-paper">
          <ShoppingCart className="size-7 text-forest-light/50" />
        </div>
        <h1 className="mb-3 font-display text-3xl font-bold">{t("title")}</h1>
        <p className="mb-8 text-gray-soft">{t("empty")}</p>
        <Link
          href="/produkty"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
        >
          {t("continueShopping")} <ArrowRight className="size-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 font-display text-4xl font-bold">{t("title")}</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Položky */}
        <ul className="divide-y divide-cream-dark rounded-xl border border-cream-dark bg-white">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex gap-4 p-4">
              <Link
                href={`/produkt/${line.slug}`}
                className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper"
              >
                {line.imageUrl ? (
                  <Image
                    src={line.imageUrl}
                    alt={line.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <Leaf className="size-8 text-forest-light/30" />
                )}
              </Link>

              <div className="flex flex-1 flex-col gap-1">
                <Link
                  href={`/produkt/${line.slug}`}
                  className="font-display font-semibold leading-snug text-ink transition-colors hover:text-forest"
                >
                  {line.name}
                </Link>
                {line.variantName && (
                  <span className="text-xs text-gray-soft">{line.variantName}</span>
                )}
                <span className="text-sm text-gray-soft">
                  {formatPrice(line.unitPrice, locale)}
                  {line.compareAt && (
                    <s className="ml-2 text-gray-soft/70">
                      {formatPrice(line.compareAt, locale)}
                    </s>
                  )}
                </span>
                <div className="mt-2">
                  <CartItemControls
                    itemId={line.id}
                    qty={line.qty}
                    stock={line.stock}
                    removeLabel={t("remove")}
                  />
                </div>
              </div>

              <div className="shrink-0 text-right font-mono font-semibold text-forest">
                {formatPrice(line.lineTotal, locale)}
              </div>
            </li>
          ))}
        </ul>

        {/* Souhrn */}
        <aside className="h-fit rounded-xl border border-cream-dark bg-white p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-charcoal">{t("subtotal")}</span>
            <span className="font-mono text-xl font-semibold text-ink">
              {formatPrice(cart.subtotal, locale)}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-soft">{t("shippingNote")}</p>

          <Link
            href="/pokladna"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
          >
            {t("checkout")} <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/produkty"
            className="mt-3 block text-center text-sm font-medium text-gray-soft transition-colors hover:text-forest"
          >
            {t("continueShopping")}
          </Link>
        </aside>
      </div>
    </section>
  );
}
