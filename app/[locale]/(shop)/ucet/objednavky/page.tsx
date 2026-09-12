import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { requireCustomer, getMyOrders, getMyInvoices } from "@/lib/account/queries";
import { OrderList, ORDER_STATUS_KEY } from "@/components/reptiplus/account/order-list";

export default async function AccountOrdersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tAuth] = await Promise.all([getTranslations("Account"), getTranslations("Auth")]);
  const { supabase } = await requireCustomer(locale);
  const [orders, invoices] = await Promise.all([getMyOrders(supabase), getMyInvoices(supabase)]);
  return (
    <div>
      <h2 className="mb-4 font-display text-xl font-semibold">{tAuth("myOrders")}</h2>
      <OrderList
        orders={orders}
        invoices={invoices}
        locale={locale}
        statusLabel={(s) => tAuth(ORDER_STATUS_KEY[s] ?? "statusNew")}
        trackLabel={t("trackParcel")}
        empty={tAuth("noOrders")}
      />
    </div>
  );
}
