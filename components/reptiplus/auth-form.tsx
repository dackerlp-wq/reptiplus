"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signInAction, signUpAction, signInWithGoogleAction, type AuthState } from "@/lib/auth/actions";

const inputClass =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm outline-none focus:border-forest";

export function AuthForm({
  mode,
  redirectTo,
  error,
}: {
  mode: "login" | "register";
  redirectTo: string;
  /** Chyba z URL (např. nezdařené přihlášení přes Google). */
  error?: "oauth" | null;
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

        {mode === "login" && (
          <Link
            href="/obnova-hesla"
            className="-mt-2 self-end text-sm text-gray-soft hover:text-forest"
          >
            {t("forgotPassword")}
          </Link>
        )}

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

      {/* Google — OAuth přes Supabase (viz docs/GOOGLE_LOGIN.md) */}
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-soft">
        <span className="h-px flex-1 bg-cream-dark" />
        {t("or")}
        <span className="h-px flex-1 bg-cream-dark" />
      </div>
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {error === "oauth" && (
          <p className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{t("oauthError")}</p>
        )}
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-cream-dark bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-forest hover:bg-paper"
        >
          <GoogleLogo />
          {t("google")}
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

/** Oficiální barevné „G" (SVG inline, bez externího požadavku). */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.6H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.6l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}
