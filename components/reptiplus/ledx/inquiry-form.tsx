"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { submitLedxInquiry, type InquiryState } from "@/lib/ledx/actions";

export type RadaConfig = {
  rada: string; // např. Flood Light
  models: string[];
  /** Pole barev, nebo pevná barva (Grow). */
  cct: string[] | { fixed: string };
  uhel: string[];
};

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);


/** Čas vykreslení formuláře (antispam: boti odesílají okamžitě). Nastavuje se až v prohlížeči, bez hydratačního rozdílu. */
const stampTs = (el: HTMLInputElement | null) => {
  if (el && !el.value) el.value = String(Date.now());
};

export function LedxInquiryForm({ config }: { config: RadaConfig }) {
  const t = useTranslations("LedxForm");
  const locale = useLocale();
  const [state, action, pending] = useActionState<InquiryState, FormData>(
    submitLedxInquiry,
    { status: "idle" },
  );

  if (state.status === "ok") {
    return (
      <div className="form-success on" role="status">
        <div className="ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3>{t("successTitle")}</h3>
        <p>
          {t("successText")}
          {state.mailed ? ` ${t("successMailed")}` : ""}
        </p>
      </div>
    );
  }

  const fixed = !Array.isArray(config.cct);
  const errorKey =
    state.status === "error"
      ? ({ GDPR: "errGdpr", FORM: "errForm", RATE: "errRate", SERVER: "errServer" } as const)[state.error]
      : null;

  return (
    <form className="form" action={action}>
      <input type="hidden" name="rada" value={config.rada} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ts" ref={stampTs} />
      {/* Honeypot — lidé pole nevidí, boti ho vyplní. */}
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="fs">
        <div className="grid3">
          <div className="field">
            <label htmlFor="lq-model">{t("model")} <span className="req">*</span></label>
            <select id="lq-model" name="model" required defaultValue="">
              <option value="" disabled>{t("choose")}</option>
              {config.models.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lq-cct">{t("cct")}</label>
            {fixed ? (
              <input id="lq-cct" name="cct" value={(config.cct as { fixed: string }).fixed} readOnly />
            ) : (
              <select id="lq-cct" name="cct" defaultValue="">
                <option value="">{t("advise")}</option>
                {(config.cct as string[]).map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </div>
          <div className="field">
            <label htmlFor="lq-uhel">{t("angle")}</label>
            <select id="lq-uhel" name="uhel" defaultValue="">
              <option value="">{t("advise")}</option>
              {config.uhel.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="lq-pocet">{t("qty")}</label>
            <input id="lq-pocet" type="number" name="pocet" min="1" max="10000" placeholder={t("qtyPh")} />
          </div>
          <div className="field">
            <label htmlFor="lq-stmivani">{t("dimming")}</label>
            <select id="lq-stmivani" name="stmivani" defaultValue="">
              <option value="">{t("dimUnknown")}</option>
              <option value="Bez">{t("dimNone")}</option>
              <option>0–10V</option><option>DALI</option><option>Zigbee</option>
            </select>
          </div>
        </div>
        <div className="grid3" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="lq-jmeno">{t("name")} <span className="req">*</span></label>
            <input id="lq-jmeno" name="jmeno" required maxLength={120} autoComplete="name" placeholder={t("namePh")} />
          </div>
          <div className="field">
            <label htmlFor="lq-email">{t("email")} <span className="req">*</span></label>
            <input id="lq-email" type="email" name="email" required maxLength={200} autoComplete="email" placeholder={t("emailPh")} />
          </div>
          <div className="field">
            <label htmlFor="lq-telefon">{t("phone")}</label>
            <input id="lq-telefon" type="tel" name="telefon" maxLength={40} autoComplete="tel" placeholder={t("phonePh")} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="lq-poznamka">{t("note")}</label>
          <textarea id="lq-poznamka" name="poznamka" maxLength={3000} placeholder={t("notePh")} />
        </div>
        <label className="gdpr">
          <input type="checkbox" name="gdpr" required />
          <span>
            {t.rich("gdpr", {
              link: (c) => (
                <Link href="/ochrana-osobnich-udaju" target="_blank" rel="noopener">
                  {c}
                </Link>
              ),
            })}
          </span>
        </label>
        {errorKey && <p className="form-err" role="alert">{t(errorKey)}</p>}
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? t("sending") : t("submit")} <Arrow />
          </button>
        </div>
      </div>
    </form>
  );
}
