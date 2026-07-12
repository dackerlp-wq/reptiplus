import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { BrandForm } from "@/components/admin/brand-form";

export default async function NewBrandPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return (
    <div>
      <Link href="/admin/brands" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Značky
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Nová značka</h1>
      <BrandForm locale={locale} />
    </div>
  );
}
