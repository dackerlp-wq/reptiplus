import { getTranslations, setRequestLocale } from "next-intl/server";
import { MapPin, Package, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireCustomer, getAddresses, getMyOrders, getMyInvoices } from "@/lib/account/queries";
import { OrderList, ORDER_STATUS_KEY } from "@/components/reptiplus/account/order-list";

const OPEN = ["new", "paid", "processing", "shipped"];

export default async function AccountOverviewPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tAuth] = await Promise.all([getTranslations("Account"), getTranslations("Auth")]);
  const { supabase, user, profile } = await requireCustomer(locale);
  const [orders, invoices, addresses] = await Promise.all([getMyOrders(supabase), getMyInvoices(supabase), getAddresses(supabase)]);
  const open = orders.filter((o) => OPEN.includes(o.status)).length;
  const defaultAddress = addresses.find((a) => a.type === "shipping" && a.is_default) ?? addresses.find((a) => a.type === "shipping") ?? addresses[0];
  const name = profile?.full_name || user.email || "";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cream-dark bg-white p-6">
        <p className="font-display text-xl font-semibold">{t("hello", { name })}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg bg-paper p-4">
            <Package className="size-8 text-forest" />
            <div>
              <p className="font-semibold text-ink">{t("ordersCount", { count: orders.length })}</p>
              <p className="text-xs text-gray-soft">
                {t("openOrders")}: {open}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-paper p-4">
            <MapPin className="mt-0.5 size-8 shrink-0 text-forest" />
            <div className="min-w-0 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-soft">{t("defaultAddress")}</p>
              {defaultAddress ? (
                <p className="mt-1 text-ink">
                  {defaultAddress.full_name}
                  <br />
                  {defaultAddress.street}, {defaultAddress.postal_code} {defaultAddress.city}
                </p>
              ) : (
                <p className="mt-1 text-gray-soft">{t("noDefaultAddress")}</p>
              )}
              <Link href="/ucet/adresy" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline">
                {t("manageAddresses")} <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{t("recentOrders")}</h2>
          {orders.length > 3 && (
            <Link href="/ucet/objednavky" className="text-sm font-semibold text-forest hover:underline">
              {t("allOrders")}
            </Link>
          )}
        </div>
        <OrderList
          orders={orders.slice(0, 3)}
          invoices={invoices}
          locale={locale}
          statusLabel={(s) => tAuth(ORDER_STATUS_KEY[s] ?? "statusNew")}
          trackLabel={t("trackParcel")}
          empty={tAuth("noOrders")}
        />
      </div>
    </div>
  );
}
