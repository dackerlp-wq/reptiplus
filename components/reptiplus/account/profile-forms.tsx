"use client";

import { useActionState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  updateProfileAction,
  changePasswordAction,
  changeEmailAction,
  deleteAccountAction,
  setNewsletterAction,
  type AccountState,
} from "@/lib/account/actions";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const field = "flex flex-col gap-1.5";
const card = "space-y-4 rounded-xl border border-cream-dark bg-white p-5";
const btn =
  "inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-50";

const ERR_KEY: Record<string, string> = {
  AUTH: "errAuth",
  NAME: "errName",
  PASSWORD_SHORT: "errPasswordShort",
  PASSWORD_MISMATCH: "errPasswordMismatch",
  EMAIL: "errEmail",
  EMAIL_SAME: "errEmailSame",
  CONFIRM: "errConfirm",
  SERVER: "errServer",
};
const MSG_KEY: Record<string, string> = {
  SAVED: "msgSaved",
  PASSWORD_CHANGED: "msgPasswordChanged",
  EMAIL_PENDING: "msgEmailPending",
};

function Feedback({ state }: { state: AccountState }) {
  const t = useTranslations("Account");
  if (!state) return null;
  if (state.error) {
    return (
      <p className="text-sm text-error">
        {t(ERR_KEY[state.error] ?? "errServer")}
        {state.error === "SERVER" && state.message ? ` (${state.message})` : ""}
      </p>
    );
  }
  if (state.ok && state.message) return <p className="text-sm text-success">{t(MSG_KEY[state.message] ?? "msgSaved")}</p>;
  return null;
}

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const t = useTranslations("Account");
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfileAction, undefined);
  return (
    <form action={action} className={card}>
      <h2 className="font-display text-lg font-semibold">{t("profile")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          <span className={legend}>{t("fullName")}</span>
          <input name="full_name" required defaultValue={fullName} autoComplete="name" className={input} />
        </label>
        <label className={field}>
          <span className={legend}>{t("phone")}</span>
          <input name="phone" type="tel" defaultValue={phone} autoComplete="tel" className={input} />
        </label>
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={btn}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t("saveProfile")}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("Account");
  const [state, action, pending] = useActionState<AccountState, FormData>(changePasswordAction, undefined);
  return (
    <form action={action} className={card}>
      <h2 className="font-display text-lg font-semibold">{t("changePassword")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          <span className={legend}>{t("newPassword")}</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        <label className={field}>
          <span className={legend}>{t("newPassword2")}</span>
          <input name="password2" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={btn}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t("savePassword")}
      </button>
    </form>
  );
}

export function EmailForm({ email, confirmed }: { email: string; confirmed: boolean }) {
  const t = useTranslations("Account");
  const [state, action, pending] = useActionState<AccountState, FormData>(changeEmailAction, undefined);
  return (
    <form action={action} className={card}>
      <h2 className="font-display text-lg font-semibold">{t("changeEmail")}</h2>
      <p className="text-sm text-gray-soft">
        {t("currentEmail")}: <span className="font-medium text-ink">{email}</span>
        {!confirmed && <span className="ml-2 text-amber">{t("emailUnconfirmed")}</span>}
      </p>
      <label className={field}>
        <span className={legend}>{t("newEmail")}</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={btn}>
        {pending && <Loader2 className="size-4 animate-spin" />} {t("saveEmail")}
      </button>
    </form>
  );
}

export function NewsletterForm({ subscribed }: { subscribed: boolean }) {
  const t = useTranslations("Account");
  return (
    <form action={setNewsletterAction} className={card}>
      <h2 className="font-display text-lg font-semibold">{t("newsletter")}</h2>
      <p className="text-sm text-gray-soft">{t("newsletterText")}</p>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="subscribed" defaultChecked={subscribed} className="size-4 accent-forest" />
        {t("newsletterOn")}
      </label>
      <button type="submit" className={btn}>
        {t("newsletterSave")}
      </button>
    </form>
  );
}

export function DeleteAccountForm({ locale }: { locale: string }) {
  const t = useTranslations("Account");
  const [state, action, pending] = useActionState<AccountState, FormData>(deleteAccountAction, undefined);
  return (
    <form action={action} className="space-y-4 rounded-xl border border-error/30 bg-white p-5">
      <input type="hidden" name="locale" value={locale} />
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-error">
        <AlertTriangle className="size-5" /> {t("dangerZone")}
      </h2>
      <p className="text-sm text-gray-soft">{t("deleteAccountText")}</p>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="confirm" className="size-4 accent-error" />
        {t("deleteConfirm")}
      </label>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-error px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error hover:text-white disabled:opacity-50"
      >
        {pending && <Loader2 className="size-4 animate-spin" />} {t("deleteAccount")}
      </button>
    </form>
  );
}
