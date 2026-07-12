import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/auth/actions";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/prihlaseni`);

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="mb-8 font-display text-4xl font-bold">
        {t("accountTitle")}
      </h1>

      <div className="rounded-xl border border-cream-dark bg-white p-6">
        <p className="text-sm text-gray-soft">{t("loggedInAs")}</p>
        <p className="mt-1 font-medium text-ink">{user.email}</p>

        <form action={signOutAction} className="mt-6">
          <input type="hidden" name="redirectTo" value={`/${locale}`} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-cream-dark px-4 py-2 text-sm font-medium transition-colors hover:bg-cream"
          >
            <LogOut className="size-4" /> {t("logout")}
          </button>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-display text-xl font-semibold">
          {t("myOrders")}
        </h2>
        <p className="rounded-xl border border-cream-dark bg-white p-6 text-sm text-gray-soft">
          {t("noOrders")}
        </p>
      </div>
    </section>
  );
}
