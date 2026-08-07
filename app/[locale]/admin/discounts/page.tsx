import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/i18n";
import { ToastForm } from "@/components/admin/toast";
import {
  deleteDiscountAction,
  toggleDiscountActiveAction,
} from "@/lib/admin/actions";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("cs-CZ") : "—";

export default async function AdminDiscountsPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("discount_code")
    .select("*")
    .order("created_at", { ascending: false });
  const codes = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Slevové kódy</h1>
          <p className="mt-1 text-sm text-gray-soft">{codes.length} kódů</p>
        </div>
        <Link
          href="/admin/discounts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
        >
          <Plus className="size-4" /> Nový kód
        </Link>
      </div>

      {codes.length === 0 ? (
        <p className="rounded-xl border border-cream-dark bg-white p-10 text-center text-gray-soft">
          Zatím žádné slevové kódy.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
              <tr>
                <th className="px-4 py-3">Kód</th>
                <th className="px-4 py-3">Sleva</th>
                <th className="px-4 py-3">Min. objednávka</th>
                <th className="px-4 py-3">Platnost</th>
                <th className="px-4 py-3">Využití</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-cream last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold text-ink">
                    {c.code}
                  </td>
                  <td className="px-4 py-3">
                    {c.type === "percent"
                      ? `${c.value} %`
                      : formatPrice(c.value, "cs")}
                  </td>
                  <td className="px-4 py-3 text-charcoal">
                    {c.min_order ? formatPrice(c.min_order, "cs") : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal">
                    {fmtDate(c.valid_from)} – {fmtDate(c.valid_to)}
                  </td>
                  <td className="px-4 py-3 font-mono text-charcoal">
                    {c.used_count}
                    {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${c.is_active ? "bg-success/15 text-success" : "bg-gray-soft/15 text-gray-soft"}`}
                    >
                      {c.is_active ? "Aktivní" : "Neaktivní"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ToastForm
                        action={toggleDiscountActiveAction}
                        success={c.is_active ? "Deaktivováno" : "Aktivováno"}
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={c.is_active ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          title={c.is_active ? "Deaktivovat" : "Aktivovat"}
                          className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                        >
                          {c.is_active ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </ToastForm>
                      <Link
                        href={`/admin/discounts/${c.id}`}
                        title="Upravit"
                        className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <ToastForm
                        action={deleteDiscountAction}
                        success="Smazáno"
                        confirm={`Smazat kód „${c.code}"?`}
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          title="Smazat"
                          className="rounded-md p-2 text-gray-soft hover:bg-error/10 hover:text-error"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </ToastForm>
                    </div>
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
