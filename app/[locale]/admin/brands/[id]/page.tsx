import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { BrandForm } from "@/components/admin/brand-form";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const svc = createServiceClient();
  const { data: brand } = await svc
    .from("brand")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!brand) notFound();

  return (
    <div>
      <Link href="/admin/brands" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> Značky
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Upravit značku</h1>
      <BrandForm brand={brand as never} locale={locale} />
    </div>
  );
}
