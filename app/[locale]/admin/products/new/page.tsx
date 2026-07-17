import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllCategories, getBrands } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/service";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const svc = createServiceClient();
  const [categories, brands, { data: allAttrs }, { data: allProds }] =
    await Promise.all([
      getAllCategories(),
      getBrands(),
      svc.from("product_attribute").select("key, value"),
      svc.from("product").select("id, name").order("name"),
    ]);
  const keyValues: Record<string, string[]> = {};
  for (const a of allAttrs ?? []) {
    if (!a.key || !a.value) continue;
    (keyValues[a.key] ??= []);
    for (const v of a.value.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!keyValues[a.key].includes(v)) keyValues[a.key].push(v);
    }
  }
  const specKeys = Object.keys(keyValues).sort();
  const allProducts = (allProds ?? []).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Produkty
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Nový produkt</h1>
      <ProductForm
        categories={categories}
        brands={brands}
        locale={locale}
        specKeys={specKeys}
        keyValues={keyValues}
        allProducts={allProducts}
      />
    </div>
  );
}
