"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Chyba při renderu stránky (v rámci locale layoutu — s fonty a překlady). */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("ErrorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="mx-auto max-w-3xl px-4 py-24 text-center">
      <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle className="size-9 text-error" />
      </div>
      <h1 className="font-display text-4xl font-bold">{t("title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-gray-soft">{t("text")}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-gray-soft">{error.digest}</p>}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
        >
          <RotateCcw className="size-4" /> {t("retry")}
        </button>
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-cream-dark bg-white px-5 py-3 text-sm font-semibold text-charcoal hover:bg-cream">
          {t("home")}
        </Link>
      </div>
    </section>
  );
}
