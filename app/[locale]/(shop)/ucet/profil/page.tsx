import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { requireCustomer, isNewsletterSubscribed } from "@/lib/account/queries";
import {
  ProfileForm,
  PasswordForm,
  EmailForm,
  NewsletterForm,
  DeleteAccountForm,
} from "@/components/reptiplus/account/profile-forms";

export default async function AccountProfilePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { user, profile } = await requireCustomer(locale);
  const subscribed = await isNewsletterSubscribed(user.email);
  return (
    <div className="space-y-6">
      <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
      <EmailForm email={user.email ?? ""} confirmed={Boolean(user.email_confirmed_at)} />
      <PasswordForm />
      <NewsletterForm subscribed={subscribed} />
      <DeleteAccountForm locale={locale} />
    </div>
  );
}
