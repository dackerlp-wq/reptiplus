import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { ProductsTable, type ProductRow } from "@/components/admin/products-table";

export default async function AdminProductsPage() {
  const svc = createServiceClient();

  const [{ data: productsData }, { data: ordersData }, { data: itemsData }] =
    await Promise.all([
      svc
        .from("product")
        .select(
          "id,name,slug,price_czk,compare_at_czk,stock_qty,is_published,is_featured,created_at,category:category_id(name)",
        )
        .order("created_at", { ascending: false }),
      // Objednávky mimo zrušené/vrácené — pro výpočet oblíbenosti
      svc.from("order").select("id,status"),
      svc.from("order_item").select("product_id,qty,order_id"),
    ]);

  // Prodanost = suma qty z položek platných objednávek (bez cancelled/refunded)
  const validOrders = new Set(
    (ordersData ?? [])
      .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
      .map((o) => o.id),
  );

  const sold = new Map<string, number>();
  for (const it of itemsData ?? []) {
    if (!it.product_id || !validOrders.has(it.order_id)) continue;
    sold.set(it.product_id, (sold.get(it.product_id) ?? 0) + (it.qty ?? 0));
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
