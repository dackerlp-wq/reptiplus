import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { ProductsTable, type ProductRow } from "@/components/admin/products-table";

export default async function AdminProductsPage() {
  const svc = createServiceClient();

  const [{ data: productsData }, { data: salesData }] = await Promise.all([
    svc
      .from("product")
      .select(
        "id,name,slug,price_czk,compare_at_czk,stock_qty,is_published,is_featured,created_at,category:category_id(name)",
      )
      .order("created_at", { ascending: false }),
    // Prodanost (oblíbenost) předpočítaná v DB pohledu product_sales
    svc.from("product_sales").select("product_id,sold"),
  ]);

  const sold = new Map<string, number>();
  for (const s of salesData ?? []) {
    if (s.product_id) sold.set(s.product_id, s.sold ?? 0);
  }

  const rows: ProductRow[] = (productsData ?? []).map((p) => {
    const cat = p.category as { name: string } | { name: string }[] | null;
    const categoryName = Array.isArray(cat) ? (cat[0]?.name ?? null) : (cat?.name ?? null);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceCzk: p.price_czk ?? 0,
      compareCzk: p.compare_at_czk ?? null,
      stock: p.stock_qty ?? 0,
      published: p.is_published,
      featured: p.is_featured,
      categoryName,
      sold: sold.get(p.id) ?? 0,
    };
  });

  const categories = Array.from(
    new Set(rows.map((r) => r.categoryName).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b, "cs"));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Produkty</h1>
          <p className="mt-1 text-sm text-gray-soft">{rows.length} produktů</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
        >
          <Plus className="size-4" /> Nový produkt
        </Link>
      </div>

      <ProductsTable products={rows} categories={categories} />
    </div>
  );
}
