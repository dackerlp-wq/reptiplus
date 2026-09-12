import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { AuthForm } from "@/components/reptiplus/auth-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("loginTitle") };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { locale } = await params;
  const { redirectTo } = await searchParams;
  setRequestLocale(locale);
  // Jen relativní cesty na vlastním webu (žádné open redirecty).
  const safe = redirectTo && /^\/[^/\\]/.test(redirectTo) ? redirectTo : `/${locale}/ucet`;
  return <AuthForm mode="login" redirectTo={safe} />;
}
