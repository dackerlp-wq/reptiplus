import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { LogOut, ChevronRight, FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/i18n";
import { signOutAction } from "@/lib/auth/actions";

const ORDER_STATUS_KEY: Record<string, string> = {
  new: "statusNew",
  paid: "statusPaid",
  processing: "statusProcessing",
  shipped: "statusShipped",
  delivered: "statusDelivered",
  cancelled: "statusCancelled",
  refunded: "statusRefunded",
};

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/prihlaseni`);

  // Objednávky přihlášeného zákazníka (RLS: owner read na tabulce order)
  const { data: orders } = await supabase
    .from("order")
    .select("id, number, status, total, currency, created_at")
    .order("created_at", { ascending: false });
  // Doklady k objednávkám (RLS: owner read na tabulce invoice)
  const { data: invoices } = await supabase
    .from("invoice")
    .select("id, order_id, number, type")
    .order("created_at", { ascending: true });
  const invoicesByOrder = new Map<string, { id: string; number: string; type: string }[]>();
  for (const inv of invoices ?? []) {
    const list = invoicesByOrder.get(inv.order_id) ?? [];
    list.push(inv);
    invoicesByOrder.set(inv.order_id, list);
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="mb-8 font-display text-4xl font-bold">
        {t("accountTitle")}
      </h1>

      <div className="rounded-xl border border-cream-dark bg-white p-6">
        <p className="text-sm text-gray-soft">{t("loggedInAs")}</p>
        <p className="mt-1 font-medium text-ink">{user.email}</p>

        <form action={signOutAction} className="mt-6">
          <input type="hidden" name="redirectTo" value={`/${locale}`} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-cream-dark px-4 py-2 text-sm font-medium transition-colors hover:bg-cream"
          >
            <LogOut className="size-4" /> {t("logout")}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-display text-xl font-semibold">
          {t("myOrders")}
        </h2>
        {!orders || orders.length === 0 ? (
          <p className="rounded-xl border border-cream-dark bg-white p-6 text-sm text-gray-soft">
            {t("noOrders")}
          </p>
        ) : (
          <ul className="divide-y divide-cream-dark overflow-hidden rounded-xl border border-cream-dark bg-white">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/objednavka/${o.number}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-cream"
                >
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold text-ink">
                      {o.number}
                    </p>
                    <p className="text-xs text-gray-soft">
                      {dateFmt.format(new Date(o.created_at))} ·{" "}
                      {t(ORDER_STATUS_KEY[o.status] ?? "statusNew")}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-forest">
                    {formatPrice(o.total, o.currency === "CZK" ? "cs" : locale)}
                  </span>
                  <ChevronRight className="size-4 text-gray-soft" />
                </Link>
                {(invoicesByOrder.get(o.id) ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-3 text-xs">
                    {(invoicesByOrder.get(o.id) ?? []).map((inv) => (
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
        )}
      </div>
    </section>
  );
}
