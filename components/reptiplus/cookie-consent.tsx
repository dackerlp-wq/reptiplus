"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cookie, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Souhlas s cookies (GDPR / ePrivacy). Lišta se zobrazí, dokud uživatel
 * nerozhodne. Volba se ukládá do cookie `rp_consent` a znovu se nezobrazuje.
 * Sledovací skripty (analytika/marketing) se načtou jen se souhlasem —
 * viz <AnalyticsGate/> a helper `getConsent`.
 */

export type ConsentCategories = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE = "rp_consent";
const VERSION = 1;
const OPEN_EVENT = "rp-open-cookie-settings";
const CHANGE_EVENT = "rp-consent-changed";
const ALL_ON: ConsentCategories = { functional: true, analytics: true, marketing: true };
const ALL_OFF: ConsentCategories = { functional: false, analytics: false, marketing: false };

export function getConsent(): ConsentCategories | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!m) return null;
  try {
    const v = JSON.parse(decodeURIComponent(m[1]));
    if (v.v !== VERSION) return null;
    return {
      functional: !!v.functional,
      analytics: !!v.analytics,
      marketing: !!v.marketing,
    };
  } catch {
    return null;
  }
}

function writeConsent(c: ConsentCategories) {
  const value = encodeURIComponent(JSON.stringify({ v: VERSION, ...c }));
  document.cookie = `${COOKIE}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: c }));
}

/** Otevře nastavení cookies (např. z odkazu v patičce). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieConsent() {
  const t = useTranslations("Cookies");
  const [mounted, setMounted] = useState(false);
  const [decided, setDecided] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState<ConsentCategories>(ALL_OFF);

  useEffect(() => {
    setMounted(true);
    setDecided(getConsent() !== null);
    const open = () => {
      setDraft(getConsent() ?? ALL_OFF);
      setShowSettings(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const save = (c: ConsentCategories) => {
    writeConsent(c);
    setDecided(true);
    setShowSettings(false);
  };

  if (!mounted) return null;
  const bannerVisible = !decided && !showSettings;
  if (!bannerVisible && !showSettings) return null;

  const toggle = (k: keyof ConsentCategories) =>
    setDraft((d) => ({ ...d, [k]: !d[k] }));

  const btn =
    "rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors";

  return (
    <>
      {/* Lišta */}
      {bannerVisible && (
        <div className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-cream-dark bg-white p-5 shadow-xl sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Cookie className="size-5 text-forest" /> {t("title")}
              </p>
              <p className="text-sm text-charcoal/80">{t("text")}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:w-auto">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => save(ALL_OFF)}
                  className={cn(btn, "border border-cream-dark text-charcoal hover:bg-cream")}
                >
                  {t("rejectAll")}
                </button>
                <button
                  type="button"
                  onClick={() => save(ALL_ON)}
                  className={cn(btn, "bg-forest text-white hover:bg-forest-light")}
                >
                  {t("acceptAll")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft(ALL_OFF);
                  setShowSettings(true);
                }}
                className="text-sm font-medium text-forest hover:underline"
              >
                {t("settings")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nastavení (modal) */}
      {showSettings && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cream-dark bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Cookie className="size-5 text-forest" /> {t("settingsTitle")}
              </p>
              {decided && (
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  aria-label={t("close")}
                  className="rounded-md p-1 text-gray-soft hover:text-ink"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Row
                label={t("necessary")}
                desc={t("necessaryDesc")}
                checked
                disabled
              />
              <Row
                label={t("functional")}
                desc={t("functionalDesc")}
                checked={draft.functional}
                onChange={() => toggle("functional")}
              />
              <Row
                label={t("analytics")}
                desc={t("analyticsDesc")}
                checked={draft.analytics}
                onChange={() => toggle("analytics")}
              />
              <Row
                label={t("marketing")}
                desc={t("marketingDesc")}
                checked={draft.marketing}
                onChange={() => toggle("marketing")}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => save(draft)}
                className={cn(btn, "flex-1 bg-forest text-white hover:bg-forest-light")}
              >
                {t("save")}
              </button>
              <button
                type="button"
                onClick={() => save(ALL_ON)}
                className={cn(btn, "flex-1 border border-cream-dark text-charcoal hover:bg-cream")}
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border border-cream-dark p-3",
        disabled ? "bg-cream/50" : "cursor-pointer hover:bg-cream/40",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 size-4 accent-forest disabled:opacity-60"
      />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="block text-xs text-gray-soft">{desc}</span>
      </span>
    </label>
  );
}
