import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { ResetPasswordForm } from "@/components/reptiplus/reset-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ResetPassword" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("ResetPassword");

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 font-display text-3xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-sm text-gray-soft">{t("subtitle")}</p>
      <ResetPasswordForm locale={locale} />
    </section>
  );
}
