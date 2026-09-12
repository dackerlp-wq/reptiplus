import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { ToastForm } from "@/components/admin/toast";
import { setCustomerRoleAction } from "@/lib/admin/actions";

const STATUS: Record<string, string> = {
  new: "Nová",
  paid: "Zaplacená",
  processing: "Zpracovává se",
  shipped: "Odeslaná",
  delivered: "Doručená",
  cancelled: "Stornovaná",
  refunded: "Vrácená",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { id } = await params;
  const svc = createServiceClient();
  const [{ data: customer }, { data: addresses }, { data: orders }] =
    await Promise.all([
      svc
        .from("customer")
        .select("id, email, full_name, phone, role, created_at")
        .eq("id", id)
        .maybeSingle(),
      svc.from("address").select("*").eq("customer_id", id),
      svc
        .from("order")
        .select("id, number, total, currency, status, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
    ]);
  if (!customer) notFound();

  const money = (m: number, c: string) =>
    new Intl.NumberFormat(c === "CZK" ? "cs-CZ" : "de-DE", {
      style: "currency",
      currency: c,
      maximumFractionDigits: c === "CZK" ? 0 : 2,
    }).format((m ?? 0) / 100);
  const date = (s: string) => new Date(s).toLocaleDateString("cs-CZ");

  const addrList = (addresses ?? []) as {
    id: string;
    type: string;
    full_name: string | null;
    company: string | null;
    street: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
  }[];
  const orderList = orders ?? [];

  const card = "rounded-xl border border-cream-dark bg-white p-5";

  return (
    <div>
      <Link
        href="/admin/customers"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Zákazníci
      </Link>
      <h1 className="mb-1 font-display text-3xl font-bold">
        {customer.full_name || "Zákazník"}
      </h1>
      <p className="mb-8 text-sm text-gray-soft">
        Registrace: {date(customer.created_at)}
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Objednávky */}
        <div className={card}>
          <p className="mb-4 font-display text-lg font-semibold">
            Objednávky ({orderList.length})
          </p>
          {orderList.length === 0 ? (
            <p className="text-sm text-gray-soft">Zatím žádné objednávky.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {orderList.map((o) => (
                  <tr key={o.id} className="border-b border-cream last:border-0">
                    <td className="py-2 font-mono">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-forest hover:underline"
                      >
                        {o.number}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-soft">{date(o.created_at)}</td>
                    <td className="py-2 text-charcoal">
                      {STATUS[o.status] ?? o.status}
                    </td>
                    <td className="py-2 text-right font-mono font-medium">
                      {money(o.total, o.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Kontakt + role + adresy */}
        <div className="space-y-6">
          <div className={card}>
            <p className="mb-3 font-display text-lg font-semibold">Kontakt</p>
            <p className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-gray-soft" /> {customer.email}
            </p>
            {customer.phone && (
              <p className="mt-1 flex items-center gap-2 text-sm">
                <Phone className="size-4 text-gray-soft" /> {customer.phone}
              </p>
            )}
          </div>

          <ToastForm action={setCustomerRoleAction} success="Role uložena" className={card}>
            <input type="hidden" name="id" value={customer.id} />
            <p className="mb-2 font-display text-lg font-semibold">Role</p>
            <div className="flex items-center gap-2">
              <select
                name="role"
                defaultValue={customer.role}
                className="flex-1 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest"
              >
                <option value="customer">Zákazník</option>
                <option value="staff">Personál</option>
                <option value="admin">Administrátor</option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
              >
                Uložit
              </button>
            </div>
          </ToastForm>

          {addrList.length > 0 && (
            <div className={card}>
              <p className="mb-3 font-display text-lg font-semibold">Adresy</p>
              <div className="space-y-3">
                {addrList.map((a) => (
                  <div key={a.id} className="text-sm">
                    <p className="mb-0.5 flex items-center gap-1.5 text-xs text-gray-soft">
                      <MapPin className="size-3.5" />
                      {a.type === "billing" ? "Fakturační" : "Dodací"}
                    </p>
                    <p className="text-ink">{a.full_name}</p>
                    {a.company && <p className="text-charcoal">{a.company}</p>}
                    <p className="text-charcoal">{a.street}</p>
                    <p className="text-charcoal">
                      {a.postal_code} {a.city}
                      {a.country ? `, ${a.country}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
