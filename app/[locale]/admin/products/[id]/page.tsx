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
      .select("key, value, key_i18n, value_i18n, sort_order")
      .eq("product_id", id)
      .order("sort_order"),
    svc.from("product_attribute").select("key"),
    getAllCategories(),
    getBrands(),
  ]);

  const { data: variantRows } = await svc
    .from("product_variant")
    .select("id, name, sku, price_czk, price_eur, stock_qty, sort_order")
    .eq("product_id", id)
    .order("sort_order");

  const [{ data: allProds }, { data: upsellRows }] = await Promise.all([
    svc.from("product").select("id, name").order("name"),
    svc.from("product_upsell").select("upsell_product_id").eq("product_id", id),
  ]);

  if (!product) notFound();

  const allProducts = (allProds ?? []).map((p) => ({ id: p.id, name: p.name }));
  const upsellIds = (upsellRows ?? []).map((r) => r.upsell_product_id);

  const i18nOf = (base: string, j: unknown) => {
    const v = (j ?? {}) as { cs?: string; en?: string; de?: string };
    return { cs: v.cs || base, en: v.en || "", de: v.de || "" };
  };
  const attributes = (attrs ?? []).map((a) => ({
    key: i18nOf(a.key, a.key_i18n),
    value: i18nOf(a.value, a.value_i18n),
  }));
  const specKeys = [...new Set((allKeys ?? []).map((k) => k.key))].sort();
  const money = (v: number | null) => (v == null ? "" : String(v / 100));
  const variants = (variantRows ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku ?? "",
    price_czk: money(v.price_czk),
    price_eur: money(v.price_eur),
    stock_qty: String(v.stock_qty ?? 0),
  }));

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
        attributes={attributes}
        specKeys={specKeys}
        variants={variants}
        allProducts={allProducts}
        upsellIds={upsellIds}
        imagesSlot={<ProductImages productId={product.id} images={images ?? []} />}
      />
    </div>
  );
}
