import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import {
  deleteProductAction,
  togglePublishAction,
} from "@/lib/admin/actions";

export default async function AdminProductsPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from("product")
    .select("id,name,slug,price_czk,stock_qty,is_published,is_featured")
    .order("created_at", { ascending: false });
  const products = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Produkty</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
        >
          <Plus className="size-4" /> Nový produkt
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-dark bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-cream-dark text-left text-xs uppercase tracking-wide text-gray-soft">
            <tr>
              <th className="px-4 py-3">Název</th>
              <th className="px-4 py-3">Cena (Kč)</th>
              <th className="px-4 py-3">Sklad</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-cream last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-4 py-3 font-mono">
                  {Math.round((p.price_czk ?? 0) / 100)}
                </td>
                <td className="px-4 py-3 font-mono">{p.stock_qty}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${p.is_published ? "bg-success/15 text-success" : "bg-gray-soft/15 text-gray-soft"}`}
                  >
                    {p.is_published ? "Publikováno" : "Skryto"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <form action={togglePublishAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="publish"
                        value={p.is_published ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        title={p.is_published ? "Skrýt" : "Publikovat"}
                        className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                      >
                        {p.is_published ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </form>
                    <Link
                      href={`/admin/products/${p.id}`}
                      title="Upravit"
                      className="rounded-md p-2 text-gray-soft hover:bg-cream hover:text-forest"
                    >
                      <Pencil className="size-4" />
                    </Link>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        title="Smazat"
                        className="rounded-md p-2 text-gray-soft hover:bg-error/10 hover:text-error"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
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
