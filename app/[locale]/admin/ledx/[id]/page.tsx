import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { LedxLineForm, type LedxLineRow } from "@/components/admin/ledx-line-form";

export default async function EditLedxLinePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const svc = createServiceClient();
  const { data } = await svc.from("ledx_line").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <div>
      <Link href="/admin/ledx" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> LEDX řady
      </Link>
      <h1 className="mb-6 font-display text-3xl font-bold">Upravit: {data.name}</h1>
      <LedxLineForm line={data as unknown as LedxLineRow} locale={locale} />
    </div>
  );
}
