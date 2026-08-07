"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Minus, Trash2, Loader2 } from "lucide-react";
import {
  createManualOrderAction,
  searchProductsForOrderAction,
  type OrderProductOption,
} from "@/lib/admin/actions";

type MethodOption = {
  code: string;
  name: string;
  feeCzk: number;
  feeEur: number;
};

type Item = {
  product_id: string;
  variant_id: string | null;
  name: string;
  sku: string | null;
  unit_price: number;
  qty: number;
};

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

const fmt = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "CZK" ? "cs-CZ" : "de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CZK" ? 0 : 2,
  }).format(minor / 100);

export function ManualOrderForm({
  locale,
  shippingOptions,
  paymentOptions,
}: {
  locale: string;
  shippingOptions: MethodOption[];
  paymentOptions: MethodOption[];
}) {
  const [currency, setCurrency] = useState<"CZK" | "EUR">("CZK");
  const [items, setItems] = useState<Item[]>([]);
  const [shippingCode, setShippingCode] = useState(shippingOptions[0]?.code ?? "");
  const [paymentCode, setPaymentCode] = useState(paymentOptions[0]?.code ?? "");
  const [discount, setDiscount] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Vyhledávání produktů
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrderProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchProductsForOrderAction(q, currency));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, currency]);

  const fee = (m?: MethodOption) =>
    m ? (currency === "CZK" ? m.feeCzk : m.feeEur) : 0;
  const shippingFee = fee(shippingOptions.find((o) => o.code === shippingCode));
  const paymentFee = fee(paymentOptions.find((o) => o.code === paymentCode));
  const discountMinor = Math.max(
    0,
    Math.round(parseFloat(discount.replace(",", ".") || "0") * 100),
  );
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0);
  const total = Math.max(0, subtotal + shippingFee + paymentFee - discountMinor);

  const setQty = (i: number, qty: number) =>
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, qty: Math.max(1, qty) } : it)),
    );
  const setPrice = (i: number, minor: number) =>
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? { ...it, unit_price: Math.max(0, minor) } : it,
      ),
    );
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addProduct = (o: OrderProductOption) => {
    setItems((prev) => {
      const found = prev.findIndex(
        (it) =>
          it.product_id === o.productId &&
          (it.variant_id ?? "") === (o.variantId ?? ""),
      );
      if (found >= 0)
        return prev.map((it, idx) =>
          idx === found ? { ...it, qty: it.qty + 1 } : it,
        );
      return [
        ...prev,
        {
          product_id: o.productId,
          variant_id: o.variantId,
          name: o.name,
          sku: o.sku,
          unit_price: o.unitPrice,
          qty: 1,
        },
      ];
    });
    setQuery("");
    setResults([]);
  };

  return (
    <form
      action={createManualOrderAction}
      onSubmit={() => setSubmitting(true)}
      className="grid gap-6 lg:grid-cols-[1fr_20rem]"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="billing_same" value={billingSame ? "on" : "off"} />
      <input type="hidden" name="currency" value={currency} />

      <div className="space-y-6">
        {/* Zákazník */}
        <section className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Zákazník</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={legend}>E-mail *</span>
              <input name="email" type="email" required className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={legend}>Měna</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "CZK" | "EUR")}
                className={input}
              >
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>
        </section>

        {/* Položky */}
        <section className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Položky</h2>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-cream-dark px-3 py-2"
              >
                <div className="min-w-[10rem] flex-1">
                  <p className="text-sm font-medium text-ink">{it.name}</p>
                  {it.sku && (
                    <p className="font-mono text-xs text-gray-soft">{it.sku}</p>
                  )}
                </div>
                <label className="flex items-center gap-1 text-xs text-gray-soft">
                  á
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(it.unit_price / 100).toFixed(2)}
                    onChange={(e) =>
                      setPrice(
                        i,
                        Math.round(parseFloat(e.target.value || "0") * 100),
                      )
                    }
                    className="w-20 rounded-md border border-cream-dark px-2 py-1 text-right font-mono text-sm outline-none focus:border-forest"
                  />
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQty(i, it.qty - 1)}
                    className="rounded-md border border-cream-dark p-1 text-gray-soft hover:border-forest hover:text-forest"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={(e) =>
                      setQty(i, parseInt(e.target.value || "1", 10))
                    }
                    className="w-12 rounded-md border border-cream-dark px-1 py-1 text-center font-mono text-sm outline-none focus:border-forest"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(i, it.qty + 1)}
                    className="rounded-md border border-cream-dark p-1 text-gray-soft hover:border-forest hover:text-forest"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="w-24 text-right font-mono text-sm font-medium text-ink">
                  {fmt(it.unit_price * it.qty, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="rounded-md p-1 text-gray-soft hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="rounded-lg border border-dashed border-cream-dark px-3 py-4 text-center text-sm text-gray-soft">
                Zatím žádné položky — přidejte je hledáním níže.
              </p>
            )}
          </div>

          <div ref={boxRef} className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hledat produkt podle názvu nebo SKU…"
                className="w-full rounded-lg border border-cream-dark bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-forest"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-soft" />
              )}
            </div>
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-cream-dark bg-white shadow-lg">
                {results.map((o) => (
                  <button
                    key={`${o.productId}:${o.variantId ?? ""}`}
                    type="button"
                    onClick={() => addProduct(o)}
                    className="flex w-full items-center gap-2 border-b border-cream px-3 py-2 text-left last:border-0 hover:bg-forest/5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {o.name}
                      </span>
                      <span className="block text-xs text-gray-soft">
                        {o.sku ? `${o.sku} · ` : ""}skladem {o.stock}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-sm text-forest">
                      {fmt(o.unitPrice, currency)}
                    </span>
                    <Plus className="size-4 shrink-0 text-forest" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Dodací adresa */}
        <section className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Dodací adresa</h2>
          <AddressFields prefix="shipping" required />
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
            Fakturační adresa je stejná
          </label>
          {!billingSame && <AddressFields prefix="billing" required />}
        </section>

        {/* Poznámka */}
        <section className="space-y-2 rounded-xl border border-cream-dark bg-white p-5">
          <label className="flex flex-col gap-1.5">
            <span className={legend}>Poznámka</span>
            <textarea name="note" rows={3} className={input} />
          </label>
        </section>
      </div>

      {/* Souhrn */}
      <aside className="h-fit space-y-4 rounded-xl border border-cream-dark bg-white p-5 lg:sticky lg:top-6">
        <h2 className="font-display text-lg font-semibold">Souhrn</h2>

        <label className="flex flex-col gap-1.5">
          <span className={legend}>Doprava</span>
          <select
            name="shipping_method"
            value={shippingCode}
            onChange={(e) => setShippingCode(e.target.value)}
            className={input}
          >
            <option value="">— bez dopravy —</option>
            {shippingOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name} ({fmt(fee(o), currency)})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={legend}>Platba</span>
          <select
            name="payment_method"
            value={paymentCode}
            onChange={(e) => setPaymentCode(e.target.value)}
            className={input}
          >
            <option value="">— bez platby —</option>
            {paymentOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
                {fee(o) > 0 ? ` (${fmt(fee(o), currency)})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={legend}>Sleva ({currency})</span>
          <input
            name="discount"
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
            className={input}
          />
        </label>

        <dl className="space-y-1.5 border-t border-cream-dark pt-3 text-sm">
          <div className="flex justify-between text-gray-soft">
            <dt>Mezisoučet</dt>
            <dd className="font-mono">{fmt(subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between text-gray-soft">
            <dt>Doprava</dt>
            <dd className="font-mono">{fmt(shippingFee, currency)}</dd>
          </div>
          {paymentFee > 0 && (
            <div className="flex justify-between text-gray-soft">
              <dt>Poplatek za platbu</dt>
              <dd className="font-mono">{fmt(paymentFee, currency)}</dd>
            </div>
          )}
          {discountMinor > 0 && (
            <div className="flex justify-between text-success">
              <dt>Sleva</dt>
              <dd className="font-mono">− {fmt(discountMinor, currency)}</dd>
            </div>
          )}
        </dl>
        <div className="flex items-baseline justify-between border-t border-cream-dark pt-3">
          <span className="font-semibold text-ink">Celkem</span>
          <span className="font-mono text-xl font-bold text-forest">
            {fmt(total, currency)}
          </span>
        </div>

        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input type="checkbox" name="mark_paid" className="size-4 accent-forest" />
          Označit jako zaplacenou
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input type="checkbox" name="notify" className="size-4 accent-forest" />
          Poslat zákazníkovi potvrzení e-mailem
        </label>

        <button
          type="submit"
          disabled={submitting || items.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Vytvořit objednávku
        </button>
        {items.length === 0 && (
          <p className="text-center text-xs text-gray-soft">
            Přidejte alespoň jednu položku.
          </p>
        )}
      </aside>
    </form>
  );
}

function AddressFields({
  prefix,
  required,
}: {
  prefix: "shipping" | "billing";
  required?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className={legend}>Jméno a příjmení</span>
        <input name={`${prefix}_full_name`} required={required} className={input} />
      </label>
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className={legend}>Ulice a č.p.</span>
        <input name={`${prefix}_street`} required={required} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={legend}>Město</span>
        <input name={`${prefix}_city`} required={required} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={legend}>PSČ</span>
        <input name={`${prefix}_postal_code`} required={required} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={legend}>Země</span>
        <select name={`${prefix}_country`} defaultValue="CZ" className={input}>
          <option value="CZ">Česko</option>
          <option value="SK">Slovensko</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={legend}>Telefon</span>
        <input name={`${prefix}_phone`} type="tel" className={input} />
      </label>
    </div>
  );
}
