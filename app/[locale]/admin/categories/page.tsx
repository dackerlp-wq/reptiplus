import { Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { deleteCategoryAction } from "@/lib/admin/actions";
import { ToastForm } from "@/components/admin/toast";
import { pickI18n } from "@/lib/i18n";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const svc = createServiceClient();
  const { data } = await svc
    .from("category")
    .select("id,name,name_i18n,slug,parent_id,is_published,sort_order")
    .order("sort_order");
  const cats = data ?? [];
  const nameOf = (id: string | null) =>
    id ? cats.find((c) => c.id === id)?.name ?? "" : "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Kategorie</h1>
        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
        >
          <Plus className="size-4" /> Nová kategorie
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
            <tr>
              <th className="px-4 py-3">Název</th>
              <th className="px-4 py-3">Nadřazená</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-b border-cream last:border-0">
                <td className="px-4 py-3 font-medium text-ink">
                  {c.parent_id ? "— " : ""}
                  {pickI18n(c.name_i18n as Record<string, string>, locale, c.name)}
                </td>
                <td className="px-4 py-3 text-gray-soft">{nameOf(c.parent_id)}</td>
                <td className="px-4 py-3">
                  {c.is_published ? "Publikováno" : "Skryto"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/categories/${c.id}`}
                      className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <ToastForm
                      action={deleteCategoryAction}
                      success="Smazáno"
                      confirm={`Smazat kategorii „${c.name}"?`}
                    >
                      <input type="hidden" name="id" value={c.id} />
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
