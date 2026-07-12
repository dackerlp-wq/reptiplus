"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signInAction, signUpAction, type AuthState } from "@/lib/auth/actions";

const inputClass =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm outline-none focus:border-forest";

export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: "login" | "register";
  redirectTo: string;
}) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? signInAction : signUpAction,
    undefined,
  );

  const isConfirm = state?.error === "CONFIRM_EMAIL";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-8 font-display text-3xl font-bold">
        {mode === "login" ? t("loginTitle") : t("registerTitle")}
      </h1>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {mode === "register" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("fullName")}</span>
            <input name="fullName" autoComplete="name" className={inputClass} />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("email")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("password")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={inputClass}
          />
        </label>

        {isConfirm ? (
          <p className="rounded-lg bg-forest/10 px-3 py-2 text-sm text-forest">
            {t("confirmEmailNotice")}
          </p>
        ) : (
          state?.error && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {state.error}
            </p>
          )
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light disabled:opacity-50"
        >
          {mode === "login" ? t("loginButton") : t("registerButton")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-soft">
        <Link
          href={mode === "login" ? "/registrace" : "/prihlaseni"}
          className="font-medium text-forest hover:underline"
        >
          {mode === "login" ? t("toRegister") : t("toLogin")}
        </Link>
      </p>
    </div>
  );
}
