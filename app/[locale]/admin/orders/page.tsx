import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { OrdersTable, type OrderRow } from "@/components/admin/orders-table";

export default async function AdminOrdersPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("order")
    .select(
      "id,number,email,total,currency,status,payment_status,created_at,order_item(count)",
    )
    .order("created_at", { ascending: false });

  const rows: OrderRow[] = (data ?? []).map((o) => {
    const oi = o.order_item as { count: number }[] | null;
    return {
      id: o.id,
      number: o.number,
      email: o.email,
      total: o.total ?? 0,
      currency: o.currency,
      status: o.status,
      payment: o.payment_status,
      itemCount: oi?.[0]?.count ?? 0,
      createdAt: o.created_at,
    };
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Objednávky</h1>
        <Link
          href="/admin/orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
        >
          <Plus className="size-4" /> Nová objednávka
        </Link>
      </div>
      <OrdersTable orders={rows} />
    </div>
  );
}
