/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveLedxPageContentAction, uploadEditorImageAction } from "@/lib/admin/actions";
import { translateFromCs, translateErrorMessage } from "@/lib/admin/translate-client";
import {
  LEDX_PAGE_DEFAULTS,
  LOCS,
  type I18nText,
  type LedxPageSetting,
  type Loc,
} from "@/lib/ledx/content";

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const card = "rounded-xl border border-cream-dark bg-white p-5 space-y-4";
const iconBtn = "rounded-md p-1.5 text-gray-soft hover:bg-cream hover:text-forest disabled:opacity-30";

const move = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export function LedxContentForm({ initial, locale }: { initial: LedxPageSetting; locale: string }) {
  const [lang, setLang] = useState<Loc>("cs");
  const [stats, setStats] = useState(initial.stats);
  const [refs, setRefs] = useState(initial.references);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();

  const setStat = (i: number, key: "value" | "label", v: string) =>
    setStats((p) => p.map((s, idx) => (idx === i ? { ...s, [key]: { ...s[key], [lang]: v } } : s)));
  const setCaption = (i: number, v: string) =>
    setRefs((p) => p.map((r, idx) => (idx === i ? { ...r, caption: { ...r.caption, [lang]: v } } : r)));

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    startUpload(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadEditorImageAction(fd);
        if (res.ok && res.url) setRefs((p) => [...p, { image: res.url!, caption: {} }]);
        else setError("Nahrání fotky se nezdařilo (max. velikost / formát).");
      }
    });
  };

  async function translate() {
    setBusy(true);
    setError(null);
    const texts: Record<string, string> = {};
    stats.forEach((s, i) => {
      texts[`s${i}_value`] = s.value.cs ?? "";
      texts[`s${i}_label`] = s.label.cs ?? "";
    });
    refs.forEach((r, i) => (texts[`r${i}_caption`] = r.caption.cs ?? ""));
    const res = await translateFromCs(texts);
    setBusy(false);
    if (!res.ok) {
      setError(translateErrorMessage(res.error));
      return;
    }
    const fill = (t: I18nText, key: string): I18nText => ({
      ...t,
      en: res.en[key] ?? t.en,
      de: res.de[key] ?? t.de,
    });
    setStats((p) => p.map((s, i) => ({ value: fill(s.value, `s${i}_value`), label: fill(s.label, `s${i}_label`) })));
    setRefs((p) => p.map((r, i) => ({ ...r, caption: fill(r.caption, `r${i}_caption`) })));
    setLang("en");
  }

  const payload = JSON.stringify({ stats, references: refs });

  return (
    <form action={saveLedxPageContentAction} className="max-w-4xl space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="payload" value={payload} />

      {/* Jazyk + AI */}
      <div className="sticky top-[57px] z-10 flex flex-wrap items-center gap-2 rounded-xl border border-cream-dark bg-white/95 p-3 backdrop-blur">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Jazyk textů</span>
        <div className="inline-flex rounded-lg border border-cream-dark bg-white p-0.5 text-xs font-semibold">
          {LOCS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={cn(
                "rounded-md px-3 py-1.5 uppercase transition-colors",
                lang === code ? "bg-forest text-white" : "text-gray-soft hover:bg-cream",
              )}
            >
              {code}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={translate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/10 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Přeložit z ČJ (AI)
        </button>
        <button
          type="button"
          onClick={() => {
            setStats(LEDX_PAGE_DEFAULTS.stats);
            setRefs(LEDX_PAGE_DEFAULTS.references);
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-soft hover:bg-cream"
          title="Vrátí původní statistiky a reference (neuloží se, dokud nekliknete na Uložit)"
        >
          <RotateCcw className="size-3.5" /> Výchozí obsah
        </button>
      </div>
      {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}

      {/* Statistiky */}
      <div className={card}>
        <div>
          <p className="font-display text-lg font-semibold">Statistiky (pás pod úvodem)</p>
          <p className="text-sm text-gray-soft">
            Číslo, které má být zvýrazněné zeleně, obalte hvězdičkami: <code className="rounded bg-cream px-1">CRI až *95*</code>. Ideálně 4 položky.
          </p>
        </div>
        {stats.map((s, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-cream p-3">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1">
              <span className="text-xs text-gray-soft">Hodnota ({lang})</span>
              <input
                className={cn(input, "font-mono")}
                value={s.value[lang] ?? ""}
                placeholder={lang !== "cs" ? s.value.cs : "až *150* lm/W"}
                onChange={(e) => setStat(i, "value", e.target.value)}
              />
            </label>
            <label className="flex min-w-[220px] flex-[2] flex-col gap-1">
              <span className="text-xs text-gray-soft">Popisek ({lang})</span>
              <input
                className={input}
                value={s.label[lang] ?? ""}
                placeholder={lang !== "cs" ? s.label.cs : "Světelná účinnost"}
                onChange={(e) => setStat(i, "label", e.target.value)}
              />
            </label>
            <div className="flex gap-1">
              <button type="button" className={iconBtn} disabled={i === 0} onClick={() => setStats((p) => move(p, i, -1))} title="Posunout nahoru"><ArrowUp className="size-4" /></button>
              <button type="button" className={iconBtn} disabled={i === stats.length - 1} onClick={() => setStats((p) => move(p, i, 1))} title="Posunout dolů"><ArrowDown className="size-4" /></button>
              <button type="button" className={cn(iconBtn, "hover:text-error")} onClick={() => setStats((p) => p.filter((_, idx) => idx !== i))} title="Odebrat"><X className="size-4" /></button>
            </div>
          </div>
        ))}
        {stats.length < 8 && (
          <button
            type="button"
            onClick={() => setStats((p) => [...p, { value: {}, label: {} }])}
            className="inline-flex items-center gap-2 rounded-lg border border-cream-dark px-3 py-2 text-sm font-medium hover:border-forest hover:text-forest"
          >
            <Plus className="size-4" /> Přidat statistiku
          </button>
        )}
      </div>

      {/* Reference */}
      <div className={card}>
        <div>
          <p className="font-display text-lg font-semibold">Reference „Kde už LEDX svítí"</p>
          <p className="text-sm text-gray-soft">Fotky realizací (na šířku, ideálně 4:3). Bez fotek se sekce na webu skryje.</p>
        </div>
        {refs.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {refs.map((r, i) => (
              <div key={r.image + i} className="space-y-2 rounded-lg border border-cream p-2">
                <img src={r.image} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
                <input
                  className={input}
                  value={r.caption[lang] ?? ""}
                  placeholder={lang !== "cs" ? r.caption.cs || `Popisek (${lang})` : "Popisek (např. Krokodýlí ZOO Protivín)"}
                  onChange={(e) => setCaption(i, e.target.value)}
                />
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => setRefs((p) => move(p, i, -1))} title="Dříve"><ArrowUp className="size-4 -rotate-90" /></button>
                    <button type="button" className={iconBtn} disabled={i === refs.length - 1} onClick={() => setRefs((p) => move(p, i, 1))} title="Později"><ArrowDown className="size-4 -rotate-90" /></button>
                  </div>
                  <button type="button" className={cn(iconBtn, "hover:text-error")} onClick={() => setRefs((p) => p.filter((_, idx) => idx !== i))} title="Odebrat"><X className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cream-dark px-3 py-2 text-sm font-medium hover:border-forest hover:text-forest">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Nahrát fotky
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="rounded-lg bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
          Uložit obsah
        </button>
        <a href={`/${locale}/admin/ledx`} className="rounded-lg border border-cream-dark px-6 py-2.5 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
          Zpět
        </a>
      </div>
    </form>
  );
}
