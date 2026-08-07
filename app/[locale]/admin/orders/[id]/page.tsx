import { ArrowLeft, Printer, Truck, ExternalLink, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { updateOrderAction } from "@/lib/admin/actions";
import {
  createShipmentAction,
  resetShipmentAction,
} from "@/lib/admin/shipping-actions";
import { carrierForOrder } from "@/lib/shipping";
import { ToastForm } from "@/components/admin/toast";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

const STATUSES = [
  ["new", "Nová"],
  ["paid", "Zaplacená"],
  ["processing", "Zpracovává se"],
  ["shipped", "Odeslaná"],
  ["delivered", "Doručená"],
  ["cancelled", "Stornovaná"],
  ["refunded", "Vrácená"],
];
const PAYMENTS = [
  ["pending", "Čeká"],
  ["paid", "Zaplaceno"],
  ["failed", "Selhalo"],
  ["refunded", "Vráceno"],
];
const PAY_BADGE: Record<string, { label: string; cls: string }> = {
  paid: { label: "Zaplaceno", cls: "bg-success/15 text-success" },
  pending: { label: "Čeká na platbu", cls: "bg-amber/15 text-amber" },
  failed: { label: "Platba selhala", cls: "bg-error/15 text-error" },
  refunded: { label: "Vráceno", cls: "bg-gray-soft/20 text-gray-soft" },
};
const CARRIER_LABEL: Record<string, string> = {
  zasilkovna: "Zásilkovna",
  ppl: "PPL",
};

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "CZK" ? "cs-CZ" : "de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CZK" ? 0 : 2,
  }).format(minor / 100);

type Addr = {
  full_name?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
} | null;

function Address({ title, a }: { title: string; a: Addr }) {
  if (!a) return null;
  return (
    <div>
      <p className={legend}>{title}</p>
      <p className="mt-1 text-sm text-ink">
        {a.full_name}
        <br />
        {a.street}
        <br />
        {a.postal_code} {a.city}, {a.country}
        <br />
        {a.phone}
      </p>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const svc = createServiceClient();
  const { data: order } = await svc
    .from("order")
    .select("*, order_item(*)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const items = (order.order_item ?? []) as {
    id: string;
    name: string;
    sku: string | null;
    unit_price: number;
    qty: number;
    line_total: number;
  }[];

  const carrier = await carrierForOrder(order.shipping_method);
  const payBadge = PAY_BADGE[order.payment_status] ?? PAY_BADGE.pending;

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Objednávky
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold">
            Objednávka {order.number}
          </h1>
          <p className="text-sm text-gray-soft">{order.email}</p>
        </div>
        <a
          href={`/${locale}/faktura/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-forest px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
        >
          <FileText className="size-4" /> Faktura / doklad
        </a>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Položky + adresy */}
        <div className="space-y-8">
          <div className="overflow-hidden rounded-xl border border-cream-dark bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
                <tr>
                  <th className="px-4 py-3">Produkt</th>
                  <th className="px-4 py-3">Ks</th>
                  <th className="px-4 py-3 text-right">Cena</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-cream last:border-0">
                    <td className="px-4 py-3">
                      {it.name}
                      {it.sku && (
                        <span className="ml-2 font-mono text-xs text-gray-soft">
                          {it.sku}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">{it.qty}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {money(it.line_total, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 border-t border-cream-dark px-4 py-3 text-sm">
              <div className="flex justify-between text-gray-soft">
                <span>Doprava</span>
                <span className="font-mono">
                  {money(order.shipping ?? 0, order.currency)}
                </span>
              </div>
              {(order.payment_fee ?? 0) > 0 && (
                <div className="flex justify-between text-gray-soft">
                  <span>Poplatek za platbu</span>
                  <span className="font-mono">
                    {money(order.payment_fee ?? 0, order.currency)}
                  </span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-gray-soft">
                  <span>Sleva</span>
                  <span className="font-mono">
                    − {money(order.discount, order.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-soft">
                <span>Platba</span>
                <span className="font-medium text-ink">
                  {order.payment_method ?? "—"}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-ink">
                <span>Celkem</span>
                <span className="font-mono">
                  {money(order.total ?? 0, order.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Address title="Fakturační adresa" a={order.billing_address as Addr} />
            <Address title="Dodací adresa" a={order.shipping_address as Addr} />
          </div>
        </div>

        {/* Pravý sloupec: doprava & platba + správa */}
        <div className="h-fit space-y-6">
        {/* ── Doprava & platba ─────────────────────────────────── */}
        <div className="space-y-4 rounded-xl border border-cream-dark bg-white p-5">
          <p className="font-display text-lg font-semibold">Doprava & platba</p>

          {/* Platba */}
          <div className="space-y-1.5">
            <p className={legend}>Platba</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${payBadge.cls}`}>
                {payBadge.label}
              </span>
              <span className="text-sm text-ink">{order.payment_method ?? "—"}</span>
            </div>
            {order.comgate_ref && (
              <p className="font-mono text-xs text-gray-soft">Comgate: {order.comgate_ref}</p>
            )}
          </div>

          {/* Doprava */}
          <div className="space-y-2 border-t border-cream pt-4">
            <p className={legend}>Doprava</p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <Truck className="size-4 text-forest" />
              {order.shipping_method ?? "—"}
              {carrier && (
                <span className="text-xs text-gray-soft">({CARRIER_LABEL[carrier]})</span>
              )}
            </p>

            {order.carrier_shipment_id ? (
              <div className="space-y-2.5">
                {order.tracking_number && (
                  <p className="text-sm">
                    <span className="text-gray-soft">Sledovací číslo: </span>
                    {order.tracking_url ? (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-forest hover:underline"
                      >
                        {order.tracking_number} <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="font-mono">{order.tracking_number}</span>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/admin/orders/${order.id}/label`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest-light"
                  >
                    <Printer className="size-4" /> Tisk štítku
                  </a>
                  <form action={resetShipmentAction}>
                    <input type="hidden" name="id" value={order.id} />
                    <button className="rounded-lg border border-cream-dark px-3 py-2 text-sm text-gray-soft hover:border-error hover:text-error">
                      Zrušit zásilku
                    </button>
                  </form>
                </div>
              </div>
            ) : carrier ? (
              <form action={createShipmentAction}>
                <input type="hidden" name="id" value={order.id} />
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-2 text-sm font-semibold text-white hover:bg-forest-light">
                  <Truck className="size-4" /> Vytvořit zásilku u dopravce
                </button>
              </form>
            ) : (
              <p className="text-xs text-gray-soft">
                Tento způsob dopravy nemá API napojení (jen Zásilkovna a PPL).
                Sledovací číslo můžeš zadat ručně níže.
              </p>
            )}

            {order.tracking_status && (
              <p
                className={`text-xs ${
                  order.tracking_status.startsWith("Chyba")
                    ? "text-error"
                    : "text-gray-soft"
                }`}
              >
                {order.tracking_status}
              </p>
            )}
          </div>
        </div>

        {/* Úpravy */}
        <ToastForm
          action={updateOrderAction}
          success="Objednávka uložena"
          className="space-y-4 rounded-xl border border-cream-dark bg-white p-5"
        >
          <input type="hidden" name="id" value={order.id} />
          <p className="font-display text-lg font-semibold">Správa</p>

          <label className="flex flex-col gap-1.5">
            <span className={legend}>Stav objednávky</span>
            <select name="status" defaultValue={order.status} className={input}>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legend}>Stav platby</span>
            <select
              name="payment_status"
              defaultValue={order.payment_status}
              className={input}
            >
              {PAYMENTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legend}>Doprava</span>
            <input
              name="shipping_method"
              defaultValue={order.shipping_method ?? ""}
              className={input}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legend}>Sledovací číslo</span>
            <input
              name="tracking_number"
              defaultValue={order.tracking_number ?? ""}
              className={input}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={legend}>Interní poznámka</span>
            <textarea
              name="admin_note"
              rows={3}
              defaultValue={order.admin_note ?? ""}
              className={input}
            />
          </label>

          <label className="flex items-start gap-2 rounded-lg bg-cream px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              name="notify"
              defaultChecked
              className="mt-0.5 size-4 accent-forest"
            />
            <span className="text-charcoal">
              Poslat zákazníkovi e-mail o změně stavu
              <span className="mt-0.5 block text-xs text-gray-soft">
                Odešle se jen při změně na: zpracovává se, odesláno, doručeno,
                stornováno.
              </span>
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-light"
          >
            Uložit změny
          </button>
        </ToastForm>
        </div>
      </div>
    </div>
  );
}
