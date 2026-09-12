import { ChevronRight, FileText, Truck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const ORDER_STATUS_KEY: Record<string, string> = {
  new: "statusNew",
  paid: "statusPaid",
  processing: "statusProcessing",
  shipped: "statusShipped",
  delivered: "statusDelivered",
  cancelled: "statusCancelled",
  refunded: "statusRefunded",
};

const STATUS_CLS: Record<string, string> = {
  new: "bg-amber/15 text-amber",
  paid: "bg-forest/10 text-forest",
  processing: "bg-forest/10 text-forest",
  shipped: "bg-gold/15 text-earth",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-error/10 text-error",
  refunded: "bg-gray-soft/20 text-gray-soft",
};

export type OrderListRow = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  tracking_url?: string | null;
};

export function OrderStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", STATUS_CLS[status] ?? "bg-cream text-gray-soft")}>
      {label}
    </span>
  );
}

/** Seznam objednávek zákazníka (přehled i plný seznam). */
export function OrderList({
  orders,
  invoices,
  locale,
  statusLabel,
  trackLabel,
  empty,
}: {
  orders: OrderListRow[];
  invoices: Map<string, { id: string; number: string; type: string }[]>;
  locale: Locale;
  statusLabel: (status: string) => string;
  trackLabel: string;
  empty: string;
}) {
  const dateFmt = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (orders.length === 0) {
    return <p className="rounded-xl border border-cream-dark bg-white p-6 text-sm text-gray-soft">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-cream-dark overflow-hidden rounded-xl border border-cream-dark bg-white">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/objednavka/${o.number}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-cream">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ink">{o.number}</span>
                <OrderStatusBadge status={o.status} label={statusLabel(o.status)} />
              </p>
              <p className="mt-0.5 text-xs text-gray-soft">{dateFmt.format(new Date(o.created_at))}</p>
            </div>
            <span className="font-mono text-sm font-semibold text-forest">
              {formatPrice(o.total, o.currency === "CZK" ? "cs" : locale)}
            </span>
            <ChevronRight className="size-4 text-gray-soft" />
          </Link>
          {((invoices.get(o.id) ?? []).length > 0 || o.tracking_url) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-3 text-xs">
              {o.tracking_url && (
                <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-forest hover:underline">
                  <Truck className="size-3.5" /> {trackLabel}
                </a>
              )}
              {(invoices.get(o.id) ?? []).map((inv) => (
                <a
                  key={inv.id}
                  href={`/api/invoices/${inv.id}?o=${encodeURIComponent(o.number)}&dl=1`}
                  className="inline-flex items-center gap-1 text-forest hover:underline"
                >
                  <FileText className="size-3.5" /> {inv.number}
                </a>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
