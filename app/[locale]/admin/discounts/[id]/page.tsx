import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { DiscountForm, type DiscountRow } from "@/components/admin/discount-form";

export default async function EditDiscountPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  const { data } = await createServiceClient()
    .from("discount_code")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div>
      <Link
        href="/admin/discounts"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Slevové kódy
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">
        Upravit kód {data.code}
      </h1>
      <DiscountForm discount={data as DiscountRow} locale={locale} />
    </div>
  );
}
