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
      <h1 className="mb-6 font-display text-3xl font-bold">Objednávky</h1>
      <OrdersTable orders={rows} />
    </div>
  );
}
