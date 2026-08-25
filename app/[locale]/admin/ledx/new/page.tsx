import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LedxLineForm } from "@/components/admin/ledx-line-form";

export default async function NewLedxLinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div>
      <Link href="/admin/ledx" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> LEDX řady
      </Link>
      <h1 className="mb-6 font-display text-3xl font-bold">Nová řada LEDX</h1>
      <LedxLineForm locale={locale} />
    </div>
  );
}
