"use client";

import { useActionState } from "react";
import { submitLedxInquiry, type InquiryState } from "@/lib/ledx/actions";

export type RadaConfig = {
  id: string; // pop-flood / pop-phoenix1 / pop-grow
  rada: string; // Flood Light
  models: string[];
  /** Pole barev, nebo pevná barva (Grow). */
  cct: string[] | { fixed: string };
  uhel: string[];
};

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function LedxInquiryForm({ config }: { config: RadaConfig }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(
    submitLedxInquiry,
    { status: "idle" },
  );

  if (state.status === "ok") {
    return (
      <div className="form-success on">
        <div className="ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3>Děkujeme, poptávka odeslána!</h3>
        <p>Ozveme se vám obvykle do dvou pracovních dnů s návrhem a nabídkou.</p>
      </div>
    );
  }

  const fixed = !Array.isArray(config.cct);

  return (
    <form className="form" action={action}>
      <input type="hidden" name="rada" value={config.rada} />
      <div className="fs">
        <div className="grid3">
          <div className="field">
            <label>Model / výkon <span className="req">*</span></label>
            <select name="model" required defaultValue="">
              <option value="" disabled>— vyberte —</option>
              {config.models.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Barva světla</label>
            {fixed ? (
              <input name="cct" value={(config.cct as { fixed: string }).fixed} readOnly />
            ) : (
              <select name="cct" defaultValue="">
                <option value="">— poradíme —</option>
                {(config.cct as string[]).map((c) => <option key={c}>{c}</option>)}
              </select>
            )}
          </div>
          <div className="field">
            <label>Úhel vyzařování</label>
            <select name="uhel" defaultValue="">
              <option value="">— poradíme —</option>
              {config.uhel.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="field">
            <label>Počet kusů</label>
            <input type="number" name="pocet" min="1" placeholder="např. 4" />
          </div>
          <div className="field">
            <label>Stmívání</label>
            <select name="stmivani" defaultValue="">
              <option value="">— nevím —</option>
              <option>Bez</option><option>0–10V</option><option>DALI</option><option>Zigbee</option>
            </select>
          </div>
        </div>
        <div className="grid3" style={{ marginTop: 16 }}>
          <div className="field">
            <label>Jméno <span className="req">*</span></label>
            <input name="jmeno" required placeholder="Jan Novák" />
          </div>
          <div className="field">
            <label>E-mail <span className="req">*</span></label>
            <input type="email" name="email" required placeholder="jan@firma.cz" />
          </div>
          <div className="field">
            <label>Telefon</label>
            <input type="tel" name="telefon" placeholder="+420…" />
          </div>
        </div>
        <div className="field" style={{ marginTop: 16 }}>
          <label>Poznámka (prostor, výška zavěšení, druhy…)</label>
          <textarea name="poznamka" placeholder="Krátce popište, co chcete nasvítit…" />
        </div>
        <label className="gdpr">
          <input type="checkbox" name="gdpr" required />
          <span>Souhlasím se zpracováním údajů za účelem poptávky (GDPR).</span>
        </label>
        {state.status === "error" && (
          <p className="form-err">
            {state.error === "GDPR"
              ? "Potvrďte prosím souhlas se zpracováním údajů."
              : state.error === "FORM"
                ? "Vyplňte prosím jméno a platný e-mail."
                : "Poptávku se nepodařilo odeslat. Zkuste to prosím znovu."}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Odesílám…" : "Odeslat poptávku"} <Arrow />
          </button>
        </div>
      </div>
    </form>
  );
}
