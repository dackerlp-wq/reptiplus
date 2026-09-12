import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Package, FileText, Truck, ExternalLink } from "lucide-react";
import { ReorderButton } from "@/components/reptiplus/reorder-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/i18n";
import { PurchaseTracker } from "@/components/reptiplus/track";
import { getShopContact } from "@/lib/settings";
import { getInvoicesForOrder } from "@/lib/invoices/issue";
import { variableSymbolForOrder } from "@/lib/orders/vs";

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
  const [t, tAcc, tAuth] = await Promise.all([
    getTranslations("OrderConfirm"),
    getTranslations("Account"),
    getTranslations("Auth"),
  ]);

  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select(
      "id, number, email, status, payment_status, comgate_ref, subtotal, shipping, discount, voucher_amount, total, currency, payment_method, payment_fee, shipping_method, shipping_address, note, created_at, tracking_number, tracking_url, order_item(id,product_id,name,sku,unit_price,qty,line_total)",
    )
    .eq("number", number)
    .maybeSingle();

  if (!order) notFound();

  const isBank = order.payment_method === "bank" || order.payment_method === "bank_transfer";
  const [shop, invoices] = await Promise.all([
    isBank && order.payment_status !== "paid" ? getShopContact().catch(() => null) : Promise.resolve(null),
    getInvoicesForOrder(order.id),
  ]);
  const bankRows: [string, string][] = shop
    ? ([
        [t("bankAccount"), shop.bankAccount],
        [t("iban"), shop.iban],
        [t("bic"), shop.bic],
        [t("variableSymbol"), variableSymbolForOrder(order.number)],
        [t("amount"), formatPrice(order.total ?? 0, order.currency === "CZK" ? "cs" : locale)],
        [t("paymentMessage"), order.number],
      ] as [string, string][]).filter(([, v]) => Boolean(v))
    : [];

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
            : isBank
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
        {payTone === "info" && bankRows.length > 0 && (
          <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
            {bankRows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-gray-soft">{k}</dt>
                <dd className="font-mono font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Průběh objednávky + sledování zásilky */}
      {(() => {
        const STEPS = ["new", "paid", "processing", "shipped", "delivered"] as const;
        const KEY: Record<string, string> = { new: "statusNew", paid: "statusPaid", processing: "statusProcessing", shipped: "statusShipped", delivered: "statusDelivered", cancelled: "statusCancelled", refunded: "statusRefunded" };
        const terminal = order.status === "cancelled" || order.status === "refunded";
        const idx = STEPS.indexOf(order.status as (typeof STEPS)[number]);
        return (
          <div className="mb-6 rounded-xl border border-cream-dark bg-white p-5 text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-soft">{tAcc("orderTimeline")}</p>
            {terminal ? (
              <p className="inline-flex rounded-md bg-error/10 px-2 py-1 text-xs font-semibold text-error">{tAuth(KEY[order.status])}</p>
            ) : (
              <ol className="flex flex-wrap gap-2">
                {STEPS.map((st, i) => {
                  const done = i <= idx;
                  return (
                    <li key={st} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${done ? "bg-forest text-white" : "bg-cream text-gray-soft"}`}>
                      {done && <CheckCircle2 className="size-3.5" />} {tAuth(KEY[st])}
                    </li>
                  );
                })}
              </ol>
            )}
            {(order.tracking_number || order.tracking_url) && (
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-gray-soft">
                  <Truck className="size-4 text-forest" /> {tAcc("trackingNumber")}:{" "}
                  <span className="font-mono font-semibold text-ink">{order.tracking_number}</span>
                </span>
                {order.tracking_url && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-forest hover:underline">
                    {tAcc("trackParcel")} <ExternalLink className="size-3.5" />
                  </a>
                )}
              </p>
            )}
          </div>
        );
      })()}

      {invoices.length > 0 && (
        <div className="mb-6 rounded-xl border border-cream-dark bg-white p-5 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-soft">{t("documents")}</p>
          <ul className="space-y-1.5">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <a
                  href={`/api/invoices/${inv.id}?o=${encodeURIComponent(order.number)}&dl=1`}
                  className="inline-flex items-center gap-2 text-forest hover:underline"
                >
                  <FileText className="size-4" />
                  {inv.type === "credit_note" ? t("creditNote") : t("invoice")} {inv.number} (PDF)
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          {order.voucher_amount > 0 && (
            <div className="flex justify-between text-success">
              <dt>{t("voucher")}</dt>
              <dd className="font-mono">− {fmt(order.voucher_amount)}</dd>
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

      <p className="mt-8 text-center text-xs text-gray-soft">
        <Link href={`/reklamace?o=${encodeURIComponent(order.number)}`} className="underline hover:text-forest">
          {t("claimLink")}
        </Link>
        {" · "}
        <Link href={`/odstoupeni-od-smlouvy?o=${encodeURIComponent(order.number)}`} className="underline hover:text-forest">
          {t("withdrawalLink")}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <ReorderButton orderNumber={order.number} />
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
