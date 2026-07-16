"use client";

import { useActionState, useState } from "react";
import { Loader2, Tag, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import {
  applyDiscountAction,
  createOrderAction,
  type DiscountState,
  type OrderState,
} from "@/lib/checkout/actions";

type Option = { code: string; name: string; fee: number };

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";
const label = "flex flex-col gap-1.5";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

export function CheckoutForm({
  locale,
  subtotal,
  shippingOptions,
  paymentOptions,
  defaultEmail,
}: {
  locale: Locale;
  subtotal: number;
  shippingOptions: Option[];
  paymentOptions: Option[];
  defaultEmail: string;
}) {
  const t = useTranslations("Checkout");

  const [shipping, setShipping] = useState(shippingOptions[0]?.code ?? "");
  const [payment, setPayment] = useState(paymentOptions[0]?.code ?? "");
  const [billingSame, setBillingSame] = useState(true);
  const [code, setCode] = useState("");

  const [discountState, applyDiscount, discountPending] = useActionState<
    DiscountState,
    FormData
  >(applyDiscountAction, { status: "idle" });
  const [orderState, submitOrder, orderPending] = useActionState<
    OrderState,
    FormData
  >(createOrderAction, undefined);

  const shippingFee = shippingOptions.find((o) => o.code === shipping)?.fee ?? 0;
  const paymentFee = paymentOptions.find((o) => o.code === payment)?.fee ?? 0;
  const discount = discountState.status === "ok" ? discountState.amount : 0;
  const total = Math.max(0, subtotal + shippingFee + paymentFee - discount);

  const fmt = (m: number) => formatPrice(m, locale);
  const feeLabel = (fee: number) => (fee > 0 ? `+ ${fmt(fee)}` : t("free"));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      {/* Formulář */}
      <form id="checkout-form" action={submitOrder} className="space-y-8">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="shipping_method" value={shipping} />
        <input type="hidden" name="payment_method" value={payment} />
        <input type="hidden" name="billing_same" value={billingSame ? "on" : "off"} />
        {discountState.status === "ok" && (
          <input type="hidden" name="discount_code" value={discountState.code} />
        )}

        {/* Kontakt */}
        <section className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">{t("contact")}</h2>
          <label className={label}>
            <span className={legend}>{t("email")}</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={defaultEmail}
              className={input}
            />
          </label>
        </section>

        {/* Dodací adresa */}
        <section className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">{t("shippingAddress")}</h2>
          <AddressFields prefix="shipping" t={t} required />
        </section>

        {/* Fakturační adresa */}
        <section className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={billingSame}
              onChange={(e) => setBillingSame(e.target.checked)}
              className="size-4 accent-forest"
            />
            {t("billingSame")}
          </label>
          {!billingSame && (
            <>
              <h2 className="font-display text-lg font-semibold">{t("billingAddress")}</h2>
              <AddressFields prefix="billing" t={t} required />
            </>
          )}
        </section>

        {/* Doprava */}
        <section className="space-y-3 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">{t("shippingMethod")}</h2>
          {shippingOptions.map((o) => (
            <OptionRow
              key={o.code}
              name="ship"
              checked={shipping === o.code}
              onSelect={() => setShipping(o.code)}
              title={o.name}
              price={feeLabel(o.fee)}
            />
          ))}
        </section>

        {/* Platba */}
        <section className="space-y-3 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">{t("paymentMethod")}</h2>
          {paymentOptions.map((o) => (
            <OptionRow
              key={o.code}
              name="pay"
              checked={payment === o.code}
              onSelect={() => setPayment(o.code)}
              title={o.name}
              price={feeLabel(o.fee)}
            />
          ))}
        </section>

        {/* Poznámka */}
        <section className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <label className={label}>
            <span className={legend}>{t("note")}</span>
            <textarea name="note" rows={3} className={input} />
          </label>
        </section>

        {orderState?.error && (
          <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {t.has(`errors.${orderState.error}`)
              ? t(`errors.${orderState.error}`)
              : t("errors.SERVER")}
          </p>
        )}
      </form>

      {/* Souhrn */}
      <aside className="h-fit space-y-4 rounded-xl border border-cream-dark bg-white p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">{t("summary")}</h2>

        {/* Slevový kód */}
        <form action={applyDiscount} className="space-y-2">
          <input type="hidden" name="locale" value={locale} />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
              <input
                name="discount_code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("discountPlaceholder")}
                className={`${input} pl-9`}
              />
            </div>
            <button
              type="submit"
              disabled={discountPending || !code}
              className="shrink-0 rounded-lg border border-forest px-4 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-40"
            >
              {discountPending ? <Loader2 className="size-4 animate-spin" /> : t("apply")}
            </button>
          </div>
          {discountState.status === "ok" && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-success">
              <Check className="size-3.5" /> {t("discountApplied", { code: discountState.code })}
            </p>
          )}
          {discountState.status === "error" && (
            <p className="text-xs text-error">
              {t.has(`discountErrors.${discountState.error}`)
                ? t(`discountErrors.${discountState.error}`)
                : t("discountErrors.NOT_FOUND")}
            </p>
          )}
        </form>

        <dl className="space-y-2 border-t border-cream-dark pt-4 text-sm">
          <Row label={t("subtotal")} value={fmt(subtotal)} />
          <Row label={t("shippingMethod")} value={shippingFee > 0 ? fmt(shippingFee) : t("free")} />
          {paymentFee > 0 && <Row label={t("paymentMethod")} value={fmt(paymentFee)} />}
          {discount > 0 && (
            <Row label={t("discount")} value={`− ${fmt(discount)}`} accent />
          )}
        </dl>

        <div className="flex items-baseline justify-between border-t border-cream-dark pt-4">
          <span className="font-semibold text-ink">{t("total")}</span>
          <span className="font-mono text-2xl font-bold text-forest">{fmt(total)}</span>
        </div>

        <button
          type="submit"
          form="checkout-form"
          disabled={orderPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {orderPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t("placing")}
            </>
          ) : (
            t("placeOrder")
          )}
        </button>
        <p className="text-center text-xs text-gray-soft">{t("terms")}</p>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-soft">{label}</dt>
      <dd className={`font-mono ${accent ? "text-success" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

function OptionRow({
  name,
  checked,
  onSelect,
  title,
  price,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  price: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
        checked ? "border-forest bg-forest/5" : "border-cream-dark hover:border-forest/40"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="size-4 accent-forest"
      />
      <span className="flex-1 font-medium text-ink">{title}</span>
      <span className="font-mono text-gray-soft">{price}</span>
    </label>
  );
}

function AddressFields({
  prefix,
  t,
  required,
}: {
  prefix: "shipping" | "billing";
  t: ReturnType<typeof useTranslations>;
  required?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        <span className={legend}>{t("fullName")}</span>
        <input name={`${prefix}_full_name`} required={required} className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        <span className={legend}>{t("street")}</span>
        <input name={`${prefix}_street`} required={required} className={input} />
      </label>
      <label className={label}>
        <span className={legend}>{t("city")}</span>
        <input name={`${prefix}_city`} required={required} className={input} />
      </label>
      <label className={label}>
        <span className={legend}>{t("postalCode")}</span>
        <input name={`${prefix}_postal_code`} required={required} className={input} />
      </label>
      <label className={label}>
        <span className={legend}>{t("country")}</span>
        <select name={`${prefix}_country`} defaultValue="CZ" className={input}>
          <option value="CZ">{t("countryCZ")}</option>
          <option value="SK">{t("countrySK")}</option>
        </select>
      </label>
      <label className={label}>
        <span className={legend}>{t("phone")}</span>
        <input name={`${prefix}_phone`} type="tel" className={input} />
      </label>
    </div>
  );
}
