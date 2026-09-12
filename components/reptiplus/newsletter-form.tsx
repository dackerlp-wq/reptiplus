"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { subscribeNewsletterAction, type NewsletterState } from "@/lib/newsletter/actions";

/** Oznámení po kliknutí na odkaz z e-mailu (`?newsletter=confirmed|unsubscribed|invalid`). */
function NewsletterNotice() {
  const t = useTranslations("Home");
  const notice = useSearchParams().get("newsletter");
  if (notice !== "confirmed" && notice !== "unsubscribed" && notice !== "invalid") return null;
  const invalid = notice === "invalid";
  return (
    <p
      className={`mx-auto mt-6 flex max-w-md items-start gap-2 rounded-lg border px-4 py-3 text-left text-sm ${
        invalid ? "border-error/30 bg-error/5 text-error" : "border-success/30 bg-success/5 text-success"
      }`}
    >
      {invalid ? <X className="mt-0.5 size-4 shrink-0" /> : <Check className="mt-0.5 size-4 shrink-0" />}
      {t(notice === "confirmed" ? "newsletterConfirmed" : notice === "unsubscribed" ? "newsletterUnsubscribed" : "newsletterInvalid")}
    </p>
  );
}

/** Přihlášení k novinkám (homepage) — double opt-in, honeypot, časová past. */

/** Čas vykreslení formuláře (antispam: boti odesílají okamžitě). Nastavuje se až v prohlížeči, bez hydratačního rozdílu. */
const stampTs = (el: HTMLInputElement | null) => {
  if (el && !el.value) el.value = String(Date.now());
};

export function NewsletterForm() {
  return (
    <>
      <Suspense fallback={null}>
        <NewsletterNotice />
      </Suspense>
      <NewsletterFormInner />
    </>
  );
}

function NewsletterFormInner() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletterAction, { status: "idle" });

  if (state.status === "sent" || state.status === "already") {
    return (
      <p className="mx-auto mt-6 flex max-w-md items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-left text-sm text-success">
        <Check className="mt-0.5 size-4 shrink-0" />
        {state.status === "sent" ? t("newsletterSent") : t("newsletterAlready")}
      </p>
    );
  }

  return (
    <form action={action} className="mx-auto mt-6 max-w-md">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ts" ref={stampTs} />
      <div className="hidden" aria-hidden="true">
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={t("newsletterPlaceholder")}
          className="flex-1 rounded-lg border border-cream-dark bg-white px-4 py-3 text-sm outline-none focus:border-forest"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />} {t("newsletterCta")}
        </button>
      </div>
      {state.status === "error" && (
        <p className="mt-2 text-sm text-error">{state.error === "EMAIL" ? t("newsletterErrEmail") : t("newsletterErrServer")}</p>
      )}
      <p className="mt-2 text-xs text-gray-soft">{t("newsletterConsent")}</p>
    </form>
  );
}
