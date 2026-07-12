import { Package, ShoppingBag, Wallet, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";

const czk = (minor: number) =>
  new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(minor / 100);

export default async function AdminDashboard() {
  const svc = createServiceClient();

  const [{ count: productCount }, { count: orderCount }, paid, lowStock, recent] =
    await Promise.all([
      svc.from("product").select("*", { count: "exact", head: true }),
      svc.from("order").select("*", { count: "exact", head: true }),
      svc.from("order").select("total").eq("payment_status", "paid"),
      svc
        .from("product")
        .select("id", { count: "exact", head: true })
        .lte("stock_qty", 5),
      svc
        .from("order")
        .select("id,number,email,total,currency,status,payment_status,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const revenue = (paid.data ?? []).reduce((s, o) => s + (o.total ?? 0), 0);

  const cards = [
    { label: "Tržby (zaplaceno)", value: czk(revenue), icon: Wallet },
    { label: "Objednávky", value: orderCount ?? 0, icon: ShoppingBag },
    { label: "Produkty", value: productCount ?? 0, icon: Package },
    { label: "Nízký sklad (≤5)", value: lowStock.count ?? 0, icon: AlertTriangle },
  ];

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl font-bold">Přehled</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-cream-dark bg-white p-5"
          >
            <c.icon className="size-5 text-forest" />
            <p className="mt-3 font-mono text-2xl font-bold text-ink">
              {c.value}
            </p>
            <p className="text-sm text-gray-soft">{c.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-semibold">
        Poslední objednávky
      </h2>
      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
            <tr>
              <th className="px-4 py-3">Číslo</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Částka</th>
              <th className="px-4 py-3">Stav</th>
            </tr>
          </thead>
          <tbody>
            {(recent.data ?? []).map((o) => (
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
                <td className="px-4 py-3 font-mono">{czk(o.total ?? 0)}</td>
                <td className="px-4 py-3">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
