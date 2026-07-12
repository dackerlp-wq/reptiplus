import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllCategories, getBrands } from "@/lib/queries";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const [categories, brands] = await Promise.all([
    getAllCategories(),
    getBrands(),
  ]);

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Produkty
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Nový produkt</h1>
      <ProductForm categories={categories} brands={brands} locale={locale} />
    </div>
  );
}
