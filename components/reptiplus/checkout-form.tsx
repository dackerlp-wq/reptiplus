"use client";

import { useActionState, useState } from "react";
import { Loader2, Tag, Check, MapPin, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "@/lib/i18n";
import type { Locale } from "@/i18n/routing";
import {
  applyDiscountAction,
  createOrderAction,
  type DiscountState,
  type OrderState,
} from "@/lib/checkout/actions";

type Option = { code: string; name: string; fee: number; pickup?: boolean };

export type SavedAddress = {
  id: string;
  type: "billing" | "shipping";
  label: string | null;
  full_name: string | null;
  company: string | null;
  ico: string | null;
  dic: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  is_default: boolean;
};

type AddressDefaults = Partial<Record<"full_name" | "street" | "city" | "postal_code" | "country" | "phone", string | null>>;

type PickupPoint = { id: string; name: string; address: string };

/** URL Packeta widgetu v6 (výdejní místa Zásilkovny). */
const PACKETA_WIDGET_URL = "https://widget.packeta.com/v6/www/js/library.js";

type PacketaPoint = {
  id: number | string;
  name?: string;
  place?: string;
  street?: string;
  city?: string;
  zip?: string;
  formatedValue?: string;
};

declare global {
  interface Window {
    Packeta?: {
      Widget: {
        pick: (
          apiKey: string,
          callback: (point: PacketaPoint | null) => void,
          opts?: Record<string, unknown>,
        ) => void;
      };
    };
  }
}

/** Načte Packeta widget skript (jen jednou) a vyřeší se, až je připraven. */
function loadPacketaWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    if (window.Packeta?.Widget) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PACKETA_WIDGET_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const s = document.createElement("script");
    s.src = PACKETA_WIDGET_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";
const label = "flex flex-col gap-1.5";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

export function CheckoutForm({
  locale,
  subtotal,
  shippingOptions,
  paymentOptions,
  freeShippingFrom = null,
  defaultEmail,
  packetaApiKey,
  loggedIn = false,
  savedAddresses = [],
}: {
  locale: Locale;
  subtotal: number;
  shippingOptions: Option[];
  paymentOptions: Option[];
  /** Limit dopravy zdarma v minor units (null = vypnuto); ceny dopravy už jsou přepočtené ze serveru. */
  freeShippingFrom?: number | null;
  defaultEmail: string;
  packetaApiKey: string;
  loggedIn?: boolean;
  savedAddresses?: SavedAddress[];
}) {
  const t = useTranslations("Checkout");

  const [shipping, setShipping] = useState(shippingOptions[0]?.code ?? "");
  const [payment, setPayment] = useState(paymentOptions[0]?.code ?? "");
  const [billingSame, setBillingSame] = useState(true);

  // Uložené adresy z účtu: výchozí dodací / fakturační předvybraná.
  const defaultShip = savedAddresses.find((a) => a.type === "shipping" && a.is_default) ?? savedAddresses.find((a) => a.type === "shipping") ?? savedAddresses[0];
  const defaultBill = savedAddresses.find((a) => a.type === "billing" && a.is_default) ?? savedAddresses.find((a) => a.type === "billing");
  const [shipSel, setShipSel] = useState<string>(defaultShip?.id ?? "new");
  const [billSel, setBillSel] = useState<string>(defaultBill?.id ?? "new");
  const shipAddr = savedAddresses.find((a) => a.id === shipSel) ?? null;
  const billAddr = savedAddresses.find((a) => a.id === billSel) ?? null;
  const [company, setCompany] = useState(Boolean(defaultBill?.company || defaultBill?.ico || defaultShip?.company));
  const companySource = billingSame ? shipAddr : billAddr;
  const [code, setCode] = useState("");
  const [pickupPoint, setPickupPoint] = useState<PickupPoint | null>(null);
  const [pickupOpening, setPickupOpening] = useState(false);

  const selectedShipping = shippingOptions.find((o) => o.code === shipping);
  const needsPickup = selectedShipping?.pickup === true;

  const openPacketaWidget = async () => {
    if (!packetaApiKey) return;
    setPickupOpening(true);
    try {
      await loadPacketaWidget();
      window.Packeta?.Widget.pick(
        packetaApiKey,
        (point) => {
          if (point) {
            const address =
              point.formatedValue ??
              [point.street, point.zip, point.city]
                .filter(Boolean)
                .join(", ");
            setPickupPoint({
              id: String(point.id),
              name: point.name ?? point.place ?? `#${point.id}`,
              address,
            });
          }
        },
        { language: locale, country: "cz,sk" },
      );
    } catch {
      /* skript se nenačetl — tlačítko zůstane k dispozici pro další pokus */
    } finally {
      setPickupOpening(false);
    }
  };

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
  const freeShippingActive = freeShippingFrom != null && subtotal >= freeShippingFrom;

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
          {savedAddresses.length > 0 && (
            <SavedAddressPicker name="ship_saved" addresses={savedAddresses} value={shipSel} onChange={setShipSel} t={t} />
          )}
          <AddressFields key={`ship-${shipSel}`} prefix="shipping" t={t} required defaults={shipAddr ?? undefined} />
          {loggedIn && shipSel === "new" && (
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" name="save_shipping" className="size-4 accent-forest" />
              {t("saveAddress")}
            </label>
          )}
        </section>

        {/* Fakturační adresa + firma */}
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
              {savedAddresses.length > 0 && (
                <SavedAddressPicker name="bill_saved" addresses={savedAddresses} value={billSel} onChange={setBillSel} t={t} />
              )}
              <AddressFields key={`bill-${billSel}`} prefix="billing" t={t} required defaults={billAddr ?? undefined} />
              {loggedIn && billSel === "new" && (
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" name="save_billing" className="size-4 accent-forest" />
                  {t("saveAddress")}
                </label>
              )}
            </>
          )}
          <label className="flex items-center gap-2.5 border-t border-cream pt-4 text-sm font-medium text-ink">
            <input type="checkbox" checked={company} onChange={(e) => setCompany(e.target.checked)} className="size-4 accent-forest" />
            <Building2 className="size-4 text-gray-soft" /> {t("companyToggle")}
          </label>
          {company && (
            <div key={`company-${companySource?.id ?? "new"}`} className="grid gap-4 sm:grid-cols-3">
              <label className={label}>
                <span className={legend}>{t("company")}</span>
                <input name="billing_company" defaultValue={companySource?.company ?? ""} className={input} />
              </label>
              <label className={label}>
                <span className={legend}>{t("ico")}</span>
                <input name="billing_ico" defaultValue={companySource?.ico ?? ""} className={input} />
              </label>
              <label className={label}>
                <span className={legend}>{t("dic")}</span>
                <input name="billing_dic" defaultValue={companySource?.dic ?? ""} className={input} />
              </label>
            </div>
          )}
        </section>

        {/* Doprava */}
        <section className="space-y-3 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">{t("shippingMethod")}</h2>
          {freeShippingFrom != null && (
            <p className={`text-sm ${freeShippingActive ? "font-medium text-success" : "text-gray-soft"}`}>
              {freeShippingActive ? t("freeShipping") : t("freeShippingFrom", { amount: fmt(freeShippingFrom) })}
            </p>
          )}
          {shippingOptions.map((o) => (
            <OptionRow
              key={o.code}
              name="ship"
              checked={shipping === o.code}
              onSelect={() => {
                setShipping(o.code);
                if (!o.pickup) setPickupPoint(null);
              }}
              title={o.name}
              price={feeLabel(o.fee)}
            />
          ))}

          {/* Výběr výdejního místa (Zásilkovna) */}
          {needsPickup && (
            <div className="rounded-lg border border-forest/30 bg-forest/5 p-4">
              {pickupPoint ? (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-forest" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{pickupPoint.name}</p>
                    {pickupPoint.address && (
                      <p className="text-xs text-gray-soft">{pickupPoint.address}</p>
                    )}
                    <button
                      type="button"
                      onClick={openPacketaWidget}
                      className="mt-1.5 text-xs font-semibold text-forest underline underline-offset-2 hover:text-forest-light"
                    >
                      {t("pickupChange")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openPacketaWidget}
                  disabled={pickupOpening || !packetaApiKey}
                  className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pickupOpening ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MapPin className="size-4" />
                  )}
                  {t("pickupSelect")}
                </button>
              )}
            </div>
          )}

          {needsPickup && pickupPoint && (
            <>
              <input type="hidden" name="pickup_point_id" value={pickupPoint.id} />
              <input type="hidden" name="pickup_point_name" value={pickupPoint.name} />
              <input
                type="hidden"
                name="pickup_point_address"
                value={pickupPoint.address}
              />
            </>
          )}
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
          disabled={orderPending || (needsPickup && !pickupPoint)}
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
        {needsPickup && !pickupPoint && (
          <p className="text-center text-xs text-error">{t("pickupRequired")}</p>
        )}
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

/** Výběr uložené adresy z účtu (nebo „nová adresa"). */
function SavedAddressPicker({
  name,
  addresses,
  value,
  onChange,
  t,
}: {
  name: string;
  addresses: SavedAddress[];
  value: string;
  onChange: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-2">
      <p className={legend}>{t("savedAddresses")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {addresses.map((a) => (
          <label
            key={a.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              value === a.id ? "border-forest bg-forest/5" : "border-cream-dark hover:border-forest/40"
            }`}
          >
            <input type="radio" name={name} checked={value === a.id} onChange={() => onChange(a.id)} className="mt-1 size-4 accent-forest" />
            <span className="min-w-0">
              <span className="block font-medium text-ink">
                {a.label || a.full_name}
                {a.company ? ` · ${a.company}` : ""}
              </span>
              <span className="block text-xs text-gray-soft">
                {a.street}, {a.postal_code} {a.city}
              </span>
            </span>
          </label>
        ))}
        <label
          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
            value === "new" ? "border-forest bg-forest/5" : "border-cream-dark hover:border-forest/40"
          }`}
        >
          <input type="radio" name={name} checked={value === "new"} onChange={() => onChange("new")} className="size-4 accent-forest" />
          <span className="font-medium text-ink">{t("newAddress")}</span>
        </label>
      </div>
    </div>
  );
}

function AddressFields({
  prefix,
  t,
  required,
  defaults,
}: {
  prefix: "shipping" | "billing";
  t: ReturnType<typeof useTranslations>;
  required?: boolean;
  defaults?: AddressDefaults;
}) {
  const d = defaults ?? {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={`${label} sm:col-span-2`}>
        <span className={legend}>{t("fullName")}</span>
        <input name={`${prefix}_full_name`} required={required} defaultValue={d.full_name ?? ""} autoComplete="name" className={input} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        <span className={legend}>{t("street")}</span>
        <input name={`${prefix}_street`} required={required} defaultValue={d.street ?? ""} autoComplete="street-address" className={input} />
      </label>
      <label className={label}>
        <span className={legend}>{t("city")}</span>
        <input name={`${prefix}_city`} required={required} defaultValue={d.city ?? ""} autoComplete="address-level2" className={input} />
      </label>
      <label className={label}>
        <span className={legend}>{t("postalCode")}</span>
        <input name={`${prefix}_postal_code`} required={required} defaultValue={d.postal_code ?? ""} autoComplete="postal-code" className={input} />
      </label>
      <label className={label}>
        <span className={legend}>{t("country")}</span>
        <select name={`${prefix}_country`} defaultValue={d.country ?? "CZ"} className={input}>
          <option value="CZ">{t("countryCZ")}</option>
          <option value="SK">{t("countrySK")}</option>
        </select>
      </label>
      <label className={label}>
        <span className={legend}>{t("phone")}</span>
        <input name={`${prefix}_phone`} type="tel" defaultValue={d.phone ?? ""} autoComplete="tel" className={input} />
      </label>
    </div>
  );
}
