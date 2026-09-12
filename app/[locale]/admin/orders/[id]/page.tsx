import {
  ArrowLeft,
  Printer,
  Truck,
  ExternalLink,
  FileText,
  History,
  StickyNote,
  Send,
  ArrowRightLeft,
  Banknote,
  Package,
  Receipt,
  RotateCcw,
  Mail,
} from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { updateOrderAction, refundOrderAction } from "@/lib/admin/actions";
import {
  createShipmentAction,
  resetShipmentAction,
} from "@/lib/admin/shipping-actions";
import { carrierForOrder } from "@/lib/shipping";
import { ToastForm } from "@/components/admin/toast";
import { OrderItemsEditor } from "@/components/admin/order-items-editor";
import { OrderEmailComposer } from "@/components/admin/order-email-composer";
import { getInvoicesForOrder } from "@/lib/invoices/issue";
import { formatMoney } from "@/lib/invoices/calc";
import { issueInvoiceAction, issueCreditNoteAction, sendInvoiceEmailAction } from "@/lib/admin/invoice-actions";
import { addOrderNoteAction } from "@/lib/admin/order-actions";
import { buildAllOrderMessageDrafts } from "@/lib/orders/message-drafts";
import { orderLocale } from "@/lib/orders/notify";
import { getShopContact } from "@/lib/settings";

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
  company?: string;
  ico?: string;
  dic?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
} | null;

type EventMeta = Record<string, string | number | boolean | null | undefined>;
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUSES);
const PAY_LABEL: Record<string, string> = Object.fromEntries(PAYMENTS);

function orderEventTitle(
  type: string,
  meta: EventMeta,
  currency: string,
  dayFmt: Intl.DateTimeFormat,
): { icon: typeof History; title: string } {
  const src = meta.source ? ` (${String(meta.source)})` : "";
  switch (type) {
    case "status":
      return {
        icon: ArrowRightLeft,
        title: `Stav: ${STATUS_LABEL[String(meta.from)] ?? meta.from ?? "—"} → ${STATUS_LABEL[String(meta.to)] ?? meta.to ?? "—"}${src}`,
      };
    case "payment":
      return {
        icon: Banknote,
        title: `Platba: ${PAY_LABEL[String(meta.status)] ?? meta.status}${typeof meta.amount === "number" ? ` · ${formatMoney(meta.amount, currency)}` : ""}${src}`,
      };
    case "email": {
      const kind = String(meta.kind ?? "");
      const label = kind === "confirmation" ? "Potvrzení objednávky"
        : kind === "invoice" ? "Faktura e-mailem"
        : kind === "credit_note" ? "Dobropis e-mailem"
        : kind === "refund" ? "E-mail o vrácení peněz"
        : kind.startsWith("status:") ? `E-mail o stavu: ${STATUS_LABEL[kind.slice(7)] ?? kind.slice(7)}`
        : kind.startsWith("message:") ? "Zpráva z adminu"
        : "E-mail";
      return { icon: Send, title: `${label} → ${meta.to ?? "?"}` };
    }
    case "shipment":
      return {
        icon: Truck,
        title: `Zásilka vytvořena${meta.carrier ? ` (${String(meta.carrier)})` : ""}${meta.tracking_number ? ` · ${String(meta.tracking_number)}` : ""}`,
      };
    case "invoice":
      return {
        icon: Receipt,
        title: `${meta.kind === "credit_note" ? "Dobropis" : "Faktura"} ${meta.number ?? ""} vystaven${meta.kind === "credit_note" ? "" : "a"}${typeof meta.total === "number" ? ` · ${formatMoney(meta.total, String(meta.currency ?? currency))}` : ""}`,
      };
    case "refund":
      return {
        icon: RotateCcw,
        title: `Vráceno ${typeof meta.amount === "number" ? formatMoney(meta.amount, currency) : ""}${meta.fully ? " (celá platba)" : " (částečně)"}`,
      };
    case "note":
      return { icon: StickyNote, title: "Interní poznámka" };
    default:
      return { icon: History, title: String(meta.title ?? "Systém") + (meta.source ? "" : "") };
  }
  void dayFmt;
}

function Address({ title, a }: { title: string; a: Addr }) {
  if (!a) return null;
  return (
    <div>
      <p className={legend}>{title}</p>
      <p className="mt-1 text-sm text-ink">
        {a.full_name}
        {a.company && (
          <>
            <br />
            {a.company}
            {a.ico ? ` · IČO ${a.ico}` : ""}
            {a.dic ? ` · DIČ ${a.dic}` : ""}
          </>
        )}
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
    product_id: string | null;
    variant_id: string | null;
    name: string;
    sku: string | null;
    unit_price: number;
    qty: number;
    line_total: number;
  }[];
  const editableItems = items.map((it) => ({
    product_id: it.product_id ?? "",
    variant_id: it.variant_id,
    name: it.name,
    sku: it.sku,
    unit_price: it.unit_price,
    qty: it.qty,
  }));

  const [carrier, invoices, { data: events }, shop] = await Promise.all([
    carrierForOrder(order.shipping_method),
    getInvoicesForOrder(order.id),
    svc.from("order_event").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
    getShopContact(),
  ]);
  const customerLocale = orderLocale(order);
  const drafts = buildAllOrderMessageDrafts({
    number: order.number,
    locale: customerLocale,
    customerName: (order.billing_address as Addr)?.full_name ?? (order.shipping_address as Addr)?.full_name ?? null,
    shopName: shop.name,
    shopPhone: shop.phone,
    shopEmail: shop.email,
    shopAddress: shop.address,
  });
  const mainInvoice = invoices.find((i) => i.type === "invoice");
  const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" });
  const dayFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium" });
  const payBadge = PAY_BADGE[order.payment_status] ?? PAY_BADGE.pending;
  const refunded = order.refunded_amount ?? 0;
  const refundable = (order.total ?? 0) - refunded;
  const isOnlinePayment = Boolean(order.comgate_ref);

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
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-gold/15 px-2 py-1 font-mono text-xs font-semibold uppercase text-earth" title="Jazyk zákazníka">
            {customerLocale}
          </span>
          {mainInvoice && (
            <a
              href={`/api/invoices/${mainInvoice.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-forest px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
            >
              <FileText className="size-4" /> Faktura {mainInvoice.number}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Položky + adresy */}
        <div className="space-y-8">
          <OrderItemsEditor
            orderId={order.id}
            currency={order.currency}
            initialItems={editableItems}
          />

          <div className="overflow-hidden rounded-xl border border-cream-dark bg-white">
            <div className="space-y-1 px-4 py-3 text-sm">
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
          {order.note && (
            <div>
              <p className={legend}>Poznámka zákazníka</p>
              <p className="mt-1 whitespace-pre-line rounded-lg bg-paper p-3 text-sm text-charcoal">{order.note}</p>
            </div>
          )}

          <OrderEmailComposer orderId={order.id} customerEmail={order.email} locale={customerLocale} drafts={drafts} />

          {/* ── Historie ─────────────────────────────────────────── */}
          <section className="rounded-xl border border-cream-dark bg-white p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <History className="size-5 text-forest" /> Historie
            </h2>
            <ToastForm action={addOrderNoteAction} success="Poznámka přidána" className="mb-5 flex gap-2">
              <input type="hidden" name="id" value={order.id} />
              <input name="body" required maxLength={5000} placeholder="Interní poznámka do historie (zákazník nevidí)…" className={input} />
              <button className="shrink-0 rounded-lg border border-cream-dark px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
                Přidat
              </button>
            </ToastForm>
            {!events || events.length === 0 ? (
              <p className="text-sm text-gray-soft">Zatím žádná aktivita.</p>
            ) : (
              <ol className="space-y-4">
                {events.map((ev) => {
                  const meta = (ev.meta ?? {}) as Record<string, string | number | boolean | null | undefined>;
                  const { icon: Icon, title } = orderEventTitle(ev.type, meta, order.currency, dayFmt);
                  return (
                    <li key={ev.id} className="flex gap-3">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">{title}</p>
                        <p className="text-xs text-gray-soft">
                          {dateFmt.format(new Date(ev.created_at))}
                          {ev.author_email ? ` · ${ev.author_email}` : ""}
                        </p>
                        {ev.type === "email" && ev.body ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-xs text-forest hover:underline">
                              {meta.subject ? String(meta.subject) : "Zobrazit text e-mailu"}
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-paper p-3 font-sans text-sm text-charcoal">{ev.body}</pre>
                          </details>
                        ) : ev.body ? (
                          <p className="mt-1 whitespace-pre-line rounded-lg bg-paper p-3 text-sm text-charcoal">{ev.body}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-cream text-forest">
                    <Package className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">Objednávka přijata</p>
                    <p className="text-xs text-gray-soft">{dateFmt.format(new Date(order.created_at))}</p>
                  </div>
                </li>
              </ol>
            )}
          </section>
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

        {/* ── Doklady ───────────────────────────────────────────── */}
        <div className="space-y-3 rounded-xl border border-cream-dark bg-white p-5">
          <p className="flex items-center gap-2 font-display text-lg font-semibold">
            <Receipt className="size-5 text-forest" /> Doklady
          </p>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-soft">
              Faktura zatím nebyla vystavena. Vystaví se automaticky po přijetí platby (u dobírky při odeslání).
            </p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li key={inv.id} className="rounded-lg border border-cream px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-mono font-semibold ${inv.type === "credit_note" ? "text-error" : "text-ink"}`}>
                      {inv.type === "credit_note" ? "Dobropis " : "Faktura "}
                      {inv.number}
                    </span>
                    <span className="font-mono text-xs">{formatMoney(inv.total, inv.currency)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-soft">
                    <span>{dayFmt.format(new Date(inv.issued_at))}</span>
                    <span>{inv.paid_at ? `uhrazeno ${dayFmt.format(new Date(inv.paid_at))}` : inv.due_date ? `splatnost ${dayFmt.format(new Date(inv.due_date))}` : ""}</span>
                    <a href={`/api/invoices/${inv.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-forest hover:underline">
                      <FileText className="size-3" /> PDF
                    </a>
                    <ToastForm action={sendInvoiceEmailAction} success="Doklad odeslán zákazníkovi" className="inline">
                      <input type="hidden" name="invoice_id" value={inv.id} />
                      <button className="inline-flex items-center gap-1 text-forest hover:underline">
                        <Mail className="size-3" /> Poslat e-mailem
                      </button>
                    </ToastForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!mainInvoice && (
            <ToastForm action={issueInvoiceAction} success="Faktura vystavena">
              <input type="hidden" name="order_id" value={order.id} />
              <button className="w-full rounded-lg border border-forest px-4 py-2 text-sm font-semibold text-forest hover:bg-forest hover:text-white">
                Vystavit fakturu teď
              </button>
            </ToastForm>
          )}
          {mainInvoice && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-gray-soft hover:text-forest">Ruční dobropis (bez vrácení peněz přes bránu)</summary>
              <ToastForm action={issueCreditNoteAction} success="Dobropis vystaven" className="mt-2 space-y-2">
                <input type="hidden" name="order_id" value={order.id} />
                <input name="amount" inputMode="decimal" placeholder={`Částka (${order.currency})`} className={input} />
                <input name="reason" placeholder="Důvod (na dokladu)" className={input} />
                <button className="w-full rounded-lg border border-cream-dark px-3 py-2 text-sm text-charcoal hover:border-forest hover:text-forest">
                  Vystavit dobropis
                </button>
              </ToastForm>
            </details>
          )}
        </div>

        {/* ── Refundace / dobropis ─────────────────────────────── */}
        <div className="space-y-3 rounded-xl border border-cream-dark bg-white p-5">
          <p className="font-display text-lg font-semibold">Refundace</p>
          {refunded > 0 && (
            <p className="text-sm text-gray-soft">
              Již vráceno:{" "}
              <span className="font-mono font-semibold text-ink">
                {money(refunded, order.currency)}
              </span>
            </p>
          )}
          {refundable > 0 ? (
            <ToastForm
              action={refundOrderAction}
              success="Vratka zpracována"
              confirm="Opravdu vrátit tuto částku zákazníkovi?"
              className="space-y-3"
            >
              <input type="hidden" name="id" value={order.id} />
              <label className="flex flex-col gap-1.5">
                <span className={legend}>
                  Částka k vrácení ({order.currency})
                </span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(refundable / 100).toFixed(2)}
                  defaultValue={(refundable / 100).toFixed(2)}
                  className={input}
                />
                <span className="text-xs text-gray-soft">
                  Max. {money(refundable, order.currency)}
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={legend}>Důvod (na dobropisu, nepovinné)</span>
                <input name="reason" maxLength={300} placeholder="např. vrácení zboží ve 14 dnech" className={input} />
              </label>
              <button
                type="submit"
                className="w-full rounded-lg border border-error px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error hover:text-white"
              >
                Vrátit peníze
              </button>
              <p className="text-xs text-gray-soft">
                {isOnlinePayment
                  ? "Platba proběhla přes Comgate — částka se vrátí automaticky přes platební bránu."
                  : "Dobírka/převod — vratku pošlete zákazníkovi ručně, zde ji jen zaevidujete."}{" "}
                Zákazníkovi odejde e-mail a k faktuře se vystaví dobropis.
              </p>
            </ToastForm>
          ) : (
            <p className="text-sm text-gray-soft">
              Celá částka objednávky již byla vrácena.
            </p>
          )}
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
                Odešle se při změně na: zpracovává se, odesláno (se sledováním),
                doručeno, stornováno. Stav platby „zaplaceno" vystaví fakturu a
                pošle ji zákazníkovi.
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
