import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getAllCategories } from "@/lib/queries";
import { CategoryForm } from "@/components/admin/category-form";

export default async function NewCategoryPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const categories = await getAllCategories();
  return (
    <div>
      <Link href="/admin/categories" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Kategorie
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Nová kategorie</h1>
      <CategoryForm categories={categories} locale={locale} />
    </div>
  );
}
