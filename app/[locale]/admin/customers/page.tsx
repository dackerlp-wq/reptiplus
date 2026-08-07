import { createServiceClient } from "@/lib/supabase/service";
import { CustomersTable, type CustomerRow } from "@/components/admin/customers-table";

export default async function AdminCustomersPage() {
  const svc = createServiceClient();
  const [{ data: customers }, { data: orders }] = await Promise.all([
    svc
      .from("customer")
      .select("id, email, full_name, phone, role, created_at")
      .order("created_at", { ascending: false }),
    svc.from("order").select("customer_id, total, currency, payment_status"),
  ]);

  // Agregace objednávek: počet (vše) + útrata (zaplacené, CZK)
  const stats = new Map<string, { orders: number; spent: number }>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    const s = stats.get(o.customer_id) ?? { orders: 0, spent: 0 };
    s.orders++;
    if (o.payment_status === "paid" && o.currency === "CZK")
      s.spent += o.total ?? 0;
    stats.set(o.customer_id, s);
  }

  const rows: CustomerRow[] = (customers ?? []).map((c) => {
    const s = stats.get(c.id) ?? { orders: 0, spent: 0 };
    return {
      id: c.id,
      name: c.full_name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      role: c.role,
      createdAt: c.created_at,
      orders: s.orders,
      spent: s.spent,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Zákazníci</h1>
        <p className="mt-1 text-sm text-gray-soft">{rows.length} zákazníků</p>
      </div>
      <CustomersTable customers={rows} />
    </div>
  );
}
