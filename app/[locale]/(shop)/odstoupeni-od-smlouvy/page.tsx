import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getShopContact } from "@/lib/settings";
import { localizedAlternates } from "@/lib/seo";
import { ClaimForm } from "@/components/reptiplus/claim-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Claims" });
  return { title: t("withdrawalTitle"), description: t("withdrawalMeta"), alternates: localizedAlternates(locale, "odstoupeni-od-smlouvy") };
}

export default async function WithdrawalPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ o?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [{ o }, t, contact, supabase] = await Promise.all([searchParams, getTranslations("Claims"), getShopContact(), createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("customer").select("full_name").eq("id", user.id).maybeSingle() : { data: null };

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold">{t("withdrawalTitle")}</h1>
      <p className="mt-3 text-gray-soft">{t("withdrawalIntro")}</p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-charcoal">
        <li>{t("withdrawalStep1")}</li>
        <li>{t("withdrawalStep2")}</li>
        <li>{t("withdrawalStep3")}</li>
      </ol>
      <p className="mt-3 text-sm text-gray-soft">
        {t.rich("withdrawalLegal", { link: (c) => <Link href="/obchodni-podminky" className="text-forest underline hover:text-forest-light">{c}</Link> })}
        {contact.address ? ` ${t("returnAddress")}: ${contact.name}, ${contact.address}.` : ""}
      </p>
      <div className="mt-8">
        <ClaimForm type="withdrawal" defaultEmail={user?.email ?? undefined} defaultName={profile?.full_name ?? undefined} defaultOrder={o} />
      </div>
    </section>
  );
}
