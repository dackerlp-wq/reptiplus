import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/i18n";
import { PurchaseTracker } from "@/components/reptiplus/track";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; number: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OrderConfirm" });
  return { title: t("title"), robots: { index: false } };
}

type OrderItem = {
  id: string;
  product_id: string | null;
  name: string;
  sku: string | null;
  unit_price: number;
  qty: number;
  line_total: number;
};

export default async function OrderConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; number: string }>;
  searchParams: Promise<{ platba?: string }>;
}) {
  const { locale, number } = await params;
  const { platba } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("OrderConfirm");

  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select(
      "number, email, status, payment_status, comgate_ref, subtotal, shipping, discount, total, currency, payment_method, payment_fee, shipping_method, shipping_address, note, order_item(id,product_id,name,sku,unit_price,qty,line_total)",
    )
    .eq("number", number)
    .maybeSingle();

  if (!order) notFound();

  // Stav platby → hláška a barva banneru.
  const online = Boolean(order.comgate_ref);
  const payTone: "ok" | "warn" | "err" | "info" =
    order.payment_status === "paid"
      ? "ok"
      : order.payment_status === "failed" || platba === "zruseno" || platba === "chyba"
        ? "err"
        : online || platba === "probiha"
          ? "warn"
          : "info";
  const payMsg =
    payTone === "ok"
      ? t("payStatusPaid")
      : payTone === "err"
        ? t("payStatusFailed")
        : payTone === "warn"
          ? t("payStatusPending")
          : order.payment_method === "cod"
            ? t("payCod")
            : order.payment_method === "bank_transfer"
              ? t("payBank")
              : t("payOther");
  const payToneCls: Record<typeof payTone, string> = {
    ok: "border-success/30 bg-success/10",
    warn: "border-amber/40 bg-amber/10",
    err: "border-error/30 bg-error/10",
    info: "border-forest/20 bg-forest/5",
  };

  const items = (order.order_item ?? []) as OrderItem[];
  const fmt = (m: number) => formatPrice(m, order.currency === "CZK" ? "cs" : locale);
  const addr = order.shipping_address as {
    full_name?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <PurchaseTracker
        order={{
          number: order.number,
          total: order.total ?? 0,
          shipping: (order.shipping ?? 0) + (order.payment_fee ?? 0),
          currency: order.currency,
          items: items.map((it) => ({
            id: it.product_id ?? it.id,
            name: it.name,
            price: it.unit_price,
            qty: it.qty,
          })),
        }}
      />
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-gray-soft">{t("subtitle")}</p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-paper px-4 py-2 font-mono text-sm font-semibold text-ink">
          <Package className="size-4 text-forest" /> {order.number}
        </p>
      </div>

      {/* Stav / instrukce k platbě */}
      <div className={`mb-6 rounded-xl border p-5 text-sm text-charcoal ${payToneCls[payTone]}`}>
        {payMsg}
      </div>

      {/* Položky */}
      <div className="overflow-hidden rounded-xl border border-cream-dark bg-white">
        <ul className="divide-y divide-cream-dark">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-ink">
                {it.name}
                <span className="ml-2 text-gray-soft">×{it.qty}</span>
              </span>
              <span className="font-mono text-ink">{fmt(it.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-cream-dark px-5 py-4 text-sm">
          <div className="flex justify-between text-gray-soft">
            <dt>{t("subtotal")}</dt>
            <dd className="font-mono">{fmt(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-soft">
            <dt>{t("shipping")}</dt>
            <dd className="font-mono">{fmt((order.shipping ?? 0) + (order.payment_fee ?? 0))}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>{t("discount")}</dt>
              <dd className="font-mono">− {fmt(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-cream-dark pt-2 text-base font-semibold text-ink">
            <dt>{t("total")}</dt>
            <dd className="font-mono">{fmt(order.total)}</dd>
          </div>
        </dl>
      </div>

      {/* Doručení */}
      {addr && (
        <div className="mt-6 rounded-xl border border-cream-dark bg-white p-5 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-soft">
            {t("deliveryTo")}
          </p>
          <p className="text-ink">
            {addr.full_name}
            <br />
            {addr.street}
            <br />
            {addr.postal_code} {addr.city}, {addr.country}
          </p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/produkty"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
        >
          {t("continueShopping")}
        </Link>
      </div>
    </section>
  );
}
