"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { lookupOrderAction, type LookupState } from "@/lib/checkout/actions";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

export function OrderLookup({ locale }: { locale: Locale }) {
  const t = useTranslations("OrderLookup");
  const [state, action, pending] = useActionState<LookupState, FormData>(
    lookupOrderAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4 rounded-xl border border-cream-dark bg-white p-6">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex flex-col gap-1.5">
        <span className={legend}>{t("number")}</span>
        <input name="number" required placeholder="RP260716-XXXX" className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={legend}>{t("email")}</span>
        <input name="email" type="email" required className={input} />
      </label>

      {state?.error && (
        <p className="text-sm text-error">
          {state.error === "MISSING" ? t("errorMissing") : t("errorNotFound")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        {t("submit")}
      </button>
    </form>
  );
}
