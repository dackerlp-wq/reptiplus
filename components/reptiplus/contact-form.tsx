"use client";

import { useActionState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { submitContactAction, type ContactState } from "@/lib/contact/actions";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";
const label = "flex flex-col gap-1.5";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";


/** Čas vykreslení formuláře (antispam: boti odesílají okamžitě). Nastavuje se až v prohlížeči, bez hydratačního rozdílu. */
const stampTs = (el: HTMLInputElement | null) => {
  if (el && !el.value) el.value = String(Date.now());
};

export function ContactForm({ defaultEmail, defaultName }: { defaultEmail?: string; defaultName?: string }) {
  const t = useTranslations("Contact");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContactAction, { status: "idle" });

  if (state.status === "ok") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-sm">
        <p className="flex items-center gap-2 font-semibold text-success">
          <Check className="size-5" /> {t("successTitle")}
        </p>
        <p className="mt-1 text-charcoal">{t("successText")}</p>
      </div>
    );
  }

  const errKey = state.status === "error" ? ({ FORM: "errForm", GDPR: "errGdpr", RATE: "errRate", SERVER: "errServer" } as const)[state.error] : null;

  return (
    <form action={action} className="space-y-4 rounded-xl border border-cream-dark bg-white p-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ts" ref={stampTs} />
      <div className="hidden" aria-hidden="true">
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          <span className={legend}>{t("name")} *</span>
          <input name="name" required maxLength={120} defaultValue={defaultName ?? ""} autoComplete="name" className={input} />
        </label>
        <label className={label}>
          <span className={legend}>{t("email")} *</span>
          <input name="email" type="email" required maxLength={200} defaultValue={defaultEmail ?? ""} autoComplete="email" className={input} />
        </label>
        <label className={label}>
          <span className={legend}>{t("phone")}</span>
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" className={input} />
        </label>
        <label className={label}>
          <span className={legend}>{t("orderNumber")}</span>
          <input name="order_number" maxLength={30} placeholder="RP…" className={input} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          <span className={legend}>{t("subject")}</span>
          <input name="subject" maxLength={150} className={input} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          <span className={legend}>{t("message")} *</span>
          <textarea name="message" required rows={6} maxLength={5000} className={input} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-charcoal">
        <input type="checkbox" name="gdpr" required className="mt-0.5 size-4 accent-forest" />
        <span>
          {t.rich("gdpr", {
            link: (c) => (
              <Link href="/ochrana-osobnich-udaju" target="_blank" rel="noopener" className="text-forest underline">
                {c}
              </Link>
            ),
          })}
        </span>
      </label>
      {errKey && <p className="text-sm text-error">{t(errKey)}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
