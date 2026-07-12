import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllCategories, getBrands } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/service";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const svc = createServiceClient();
  const [{ data: product }, categories, brands] = await Promise.all([
    svc.from("product").select("*").eq("id", id).maybeSingle(),
    getAllCategories(),
    getBrands(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Produkty
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">
        Upravit produkt
      </h1>
      <ProductForm
        product={product as never}
        categories={categories}
        brands={brands}
        locale={locale}
      />
    </div>
  );
}
