import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllCategories, getBrands } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/service";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const svc = createServiceClient();
  const [
    { data: product },
    { data: images },
    { data: attrs },
    { data: allKeys },
    categories,
    brands,
  ] = await Promise.all([
    svc.from("product").select("*").eq("id", id).maybeSingle(),
    svc
      .from("product_image")
      .select("id, url, alt, sort_order")
      .eq("product_id", id)
      .order("sort_order"),
    svc
      .from("product_attribute")
      .select("key, value, sort_order")
      .eq("product_id", id)
      .order("sort_order"),
    svc.from("product_attribute").select("key"),
    getAllCategories(),
    getBrands(),
  ]);

  if (!product) notFound();

  const attributes = (attrs ?? []).map((a) => ({ key: a.key, value: a.value }));
  const specKeys = [...new Set((allKeys ?? []).map((k) => k.key))].sort();

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
      <div className="max-w-3xl space-y-6">
        <ProductForm
          product={product as never}
          categories={categories}
          brands={brands}
          locale={locale}
          attributes={attributes}
          specKeys={specKeys}
        />
        <ProductImages productId={product.id} images={images ?? []} />
      </div>
    </div>
  );
}
