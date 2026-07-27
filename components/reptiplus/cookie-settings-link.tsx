"use client";

import { useTranslations } from "next-intl";
import { openCookieSettings } from "./cookie-consent";

/** Odkaz v patičce pro trvalé odvolání / úpravu souhlasu s cookies. */
export function CookieSettingsLink({ className }: { className?: string }) {
  const t = useTranslations("Cookies");
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      {t("manage")}
    </button>
  );
}
