import { Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { deleteBrandAction } from "@/lib/admin/actions";
import { ToastForm } from "@/components/admin/toast";

export default async function AdminBrandsPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("brand")
    .select("id,name,slug,is_published,sort_order")
    .order("sort_order");
  const brands = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Značky</h1>
        <Link
          href="/admin/brands/new"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
        >
          <Plus className="size-4" /> Nová značka
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
            <tr>
              <th className="px-4 py-3">Název</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-b border-cream last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{b.name}</td>
                <td className="px-4 py-3 font-mono text-gray-soft">{b.slug}</td>
                <td className="px-4 py-3">
                  {b.is_published ? "Publikováno" : "Skryto"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/brands/${b.id}`}
                      className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <ToastForm
                      action={deleteBrandAction}
                      success="Smazáno"
                      confirm={`Smazat značku „${b.name}"?`}
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <button className="rounded-md p-2 text-gray-soft hover:bg-error/10 hover:text-error">
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
    </div>
  );
}
