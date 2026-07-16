"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

type Phase = "loading" | "request" | "set" | "sent" | "done" | "expired";

export function ResetPasswordForm({ locale }: { locale: Locale }) {
  const t = useTranslations("ResetPassword");
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zachytit token z odkazu a založit recovery session.
  useEffect(() => {
    async function init() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const at = hash.get("access_token");
      const rt = hash.get("refresh_token");
      const code = new URLSearchParams(window.location.search).get("code");

      if (at && rt) {
        const { error } = await supabase.auth.setSession({
          access_token: at,
          refresh_token: rt,
        });
        if (!error) {
          window.history.replaceState(null, "", window.location.pathname);
          return setPhase("set");
        }
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return setPhase("set");
      }
      // Bez tokenu → nabídnout vyžádání odkazu e-mailem.
      setPhase("request");
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const redirectTo = `${window.location.origin}/${locale}/obnova-hesla`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);
    if (error) return setError(error.message);
    setPhase("sent");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError(t("tooShort"));
    if (pw !== pw2) return setError(t("mismatch"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(error.message);
    setPhase("done");
    setTimeout(() => router.push("/ucet"), 1500);
  };

  const inputClass =
    "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm outline-none focus:border-forest";

  if (phase === "loading") {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-6 animate-spin text-forest" />
      </div>
    );
  }

  if (phase === "sent") {
    return (
      <p className="rounded-lg bg-forest/10 px-4 py-3 text-sm text-forest">
        {t("sent")}
      </p>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <p className="font-medium text-ink">{t("done")}</p>
      </div>
    );
  }

  if (phase === "request") {
    return (
      <form onSubmit={sendReset} className="flex flex-col gap-4">
        <p className="text-sm text-gray-soft">{t("requestHint")}</p>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("email")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-50"
        >
          {busy && <Loader2 className="size-4 animate-spin" />} {t("sendLink")}
        </button>
        <Link href="/prihlaseni" className="text-center text-sm text-gray-soft hover:text-forest">
          {t("backToLogin")}
        </Link>
      </form>
    );
  }

  // phase === "set"
  return (
    <form onSubmit={savePassword} className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm text-gray-soft">
        <KeyRound className="size-4 text-forest" /> {t("setHint")}
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("newPassword")}</span>
        <input
          type="password"
          required
          minLength={8}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{t("confirmPassword")}</span>
        <input
          type="password"
          required
          minLength={8}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-50"
      >
        {busy && <Loader2 className="size-4 animate-spin" />} {t("save")}
      </button>
    </form>
  );
}
