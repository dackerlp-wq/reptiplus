import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { DiscountForm } from "@/components/admin/discount-form";

export default async function NewDiscountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return (
    <div>
      <Link
        href="/admin/discounts"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest"
      >
        <ArrowLeft className="size-4" /> Slevové kódy
      </Link>
      <h1 className="mb-8 font-display text-3xl font-bold">Nový slevový kód</h1>
      <DiscountForm locale={locale} />
    </div>
  );
}
