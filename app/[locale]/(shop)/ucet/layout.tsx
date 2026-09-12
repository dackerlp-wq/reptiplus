import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireCustomer } from "@/lib/account/queries";
import { signOutAction } from "@/lib/auth/actions";
import { AccountNav } from "@/components/reptiplus/account/account-nav";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const [t, tAuth] = await Promise.all([getTranslations("Account"), getTranslations("Auth")]);
  const { user, profile } = await requireCustomer(locale);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{tAuth("accountTitle")}</h1>
          <p className="mt-1 text-sm text-gray-soft">
            {profile?.full_name ? `${profile.full_name} · ` : ""}
            {user.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(profile?.role === "admin" || profile?.role === "staff") && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
            >
              <ShieldCheck className="size-4" /> {t("adminEntry")}
            </Link>
          )}
          <form action={signOutAction}>
            <input type="hidden" name="redirectTo" value={`/${locale}`} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-cream"
            >
              <LogOut className="size-4" /> {tAuth("logout")}
            </button>
          </form>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
        <AccountNav
          labels={{
            navOverview: t("navOverview"),
            navOrders: t("navOrders"),
            navAddresses: t("navAddresses"),
            navWishlist: t("navWishlist"),
            navReviews: t("navReviews"),
            navProfile: t("navProfile"),
          }}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
