import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { requireAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getShopContact } from "@/lib/settings";
import { PrintButton } from "@/components/admin/print-button";

export const metadata: Metadata = { title: "Doklad" };

type Addr = {
  full_name?: string;
  company?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
} | null;

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdmin(locale);

  const svc = createServiceClient();
  const [{ data: order }, seller] = await Promise.all([
    svc.from("order").select("*, order_item(*)").eq("id", id).maybeSingle(),
    getShopContact(),
  ]);
  if (!order) notFound();

  const currency = order.currency as string;
  const money = (m: number) =>
    new Intl.NumberFormat(currency === "CZK" ? "cs-CZ" : "de-DE", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "CZK" ? 0 : 2,
    }).format((m ?? 0) / 100);
  const date = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("cs-CZ") : "";

  const items = (order.order_item ?? []) as {
    id: string;
    name: string;
    sku: string | null;
    unit_price: number;
    qty: number;
    line_total: number;
  }[];
  const billing = (order.billing_address ?? order.shipping_address) as Addr;

  const vatPayer = !!seller.dic;
  const total = order.total ?? 0;
  const vatBase = vatPayer ? Math.round(total / 1.21) : 0;
  const vat = vatPayer ? total - vatBase : 0;

  const docTitle = vatPayer ? "Faktura – daňový doklad" : "Doklad o prodeji";

  return (
    <div className="invoice mx-auto max-w-3xl bg-white p-8 text-[13px] text-black">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Reptiplus" className="mb-2 h-12 w-auto" />
          <p className="text-lg font-bold">{seller.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{docTitle}</p>
          <p className="mt-1 font-mono">č. {order.number}</p>
          <p className="mt-1 text-gray-600">Datum vystavení: {date(order.created_at)}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Dodavatel</p>
          <p className="font-medium">{seller.name}</p>
          {seller.address && <p>{seller.address}</p>}
          {seller.ico && <p>IČO: {seller.ico}</p>}
          {seller.dic ? <p>DIČ: {seller.dic}</p> : <p>Neplátce DPH</p>}
          <p>{seller.email}</p>
          {seller.phone && <p>{seller.phone}</p>}
          {seller.registration && (
            <p className="mt-1 text-xs text-gray-500">{seller.registration}</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Odběratel</p>
          {billing ? (
            <>
              <p className="font-medium">{billing.full_name}</p>
              {billing.company && <p>{billing.company}</p>}
              {billing.street && <p>{billing.street}</p>}
              <p>
                {billing.postal_code} {billing.city}
                {billing.country ? `, ${billing.country}` : ""}
              </p>
            </>
          ) : (
            <p>{order.email}</p>
          )}
          <p className="mt-1">{order.email}</p>
        </div>
      </div>

      <table className="mb-4 w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-gray-300 text-xs uppercase text-gray-500">
            <th className="py-2">Položka</th>
            <th className="py-2 text-center">Ks</th>
            <th className="py-2 text-right">Cena/ks</th>
            <th className="py-2 text-right">Celkem</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-gray-200">
              <td className="py-2">
                {it.name}
                {it.sku && (
                  <span className="ml-2 font-mono text-xs text-gray-500">{it.sku}</span>
                )}
              </td>
              <td className="py-2 text-center">{it.qty}</td>
              <td className="py-2 text-right">{money(it.unit_price)}</td>
              <td className="py-2 text-right">{money(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-64 space-y-1">
        <Row label="Doprava" value={money(order.shipping ?? 0)} />
        {(order.payment_fee ?? 0) > 0 && (
          <Row label="Poplatek za platbu" value={money(order.payment_fee ?? 0)} />
        )}
        {(order.discount ?? 0) > 0 && (
          <Row label="Sleva" value={`− ${money(order.discount ?? 0)}`} />
        )}
        {vatPayer && (
          <>
            <Row label="Základ DPH" value={money(vatBase)} muted />
            <Row label="DPH 21 %" value={money(vat)} muted />
          </>
        )}
        <div className="mt-1 flex justify-between border-t-2 border-gray-300 pt-1 text-base font-bold">
          <span>Celkem</span>
          <span>{money(total)}</span>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-600">
        <p>Způsob platby: {order.payment_method ?? "—"}</p>
        {!vatPayer && <p className="mt-1">Dodavatel není plátcem DPH.</p>}
      </div>

      <div className="mt-8">
        <PrintButton label="Vytisknout / uložit PDF" />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between ${muted ? "text-gray-500" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
