import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllCategories } from "@/lib/queries";
import { createServiceClient } from "@/lib/supabase/service";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const svc = createServiceClient();
  const [{ data: category }, categories] = await Promise.all([
    svc.from("category").select("*").eq("id", id).maybeSingle(),
    getAllCategories(),
  ]);
  if (!category) notFound();

  return (
    <div>
      <Link href="/admin/categories" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Kategorie
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Upravit kategorii</h1>
      <CategoryForm category={category as never} categories={categories} locale={locale} />
    </div>
  );
}
