import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";

const STATUS_LABEL: Record<string, string> = {
  new: "Nová",
  paid: "Zaplacená",
  processing: "Zpracovává se",
  shipped: "Odeslaná",
  delivered: "Doručená",
  cancelled: "Stornovaná",
  refunded: "Vrácená",
};
const PAY_LABEL: Record<string, string> = {
  pending: "Čeká",
  paid: "Zaplaceno",
  failed: "Selhalo",
  refunded: "Vráceno",
};

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat(currency === "CZK" ? "cs-CZ" : "de-DE", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CZK" ? 0 : 2,
  }).format(minor / 100);

export default async function AdminOrdersPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("order")
    .select("id,number,email,total,currency,status,payment_status,created_at")
    .order("created_at", { ascending: false });
  const orders = data ?? [];

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold">Objednávky</h1>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          Zatím žádné objednávky.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="px-4 py-3">Číslo</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Částka</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3">Platba</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-cream last:border-0">
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-forest hover:underline"
                    >
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{o.email}</td>
                  <td className="px-4 py-3 font-mono">
                    {money(o.total ?? 0, o.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </td>
                  <td className="px-4 py-3">
                    {PAY_LABEL[o.payment_status] ?? o.payment_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
