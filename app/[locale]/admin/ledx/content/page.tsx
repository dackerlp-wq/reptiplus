import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getContentI18n } from "@/lib/settings";
import { LedxContentForm } from "@/components/admin/ledx-content-form";
import {
  LEDX_PAGE_DEFAULTS,
  LEDX_PAGE_SETTING,
  normalizeLedxPage,
} from "@/lib/ledx/content";

export default async function LedxContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const stored = normalizeLedxPage(await getContentI18n(LEDX_PAGE_SETTING));

  return (
    <div>
      <Link href="/admin/ledx" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-soft hover:text-forest">
        <ArrowLeft className="size-4" /> LEDX řady
      </Link>
      <h1 className="font-display text-3xl font-bold">Obsah stránky Profi osvětlení</h1>
      <p className="mb-6 text-sm text-gray-soft">
        Statistiky a reference na úvodní stránce LEDX.
        {!stored && " Zatím se zobrazuje výchozí obsah — po uložení se použije tento."}
      </p>
      <LedxContentForm initial={stored ?? LEDX_PAGE_DEFAULTS} locale={locale} />
    </div>
  );
}
