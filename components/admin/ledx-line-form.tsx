/* eslint-disable @next/next/no-img-element */
"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Upload, X, Star, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveLedxLineAction, uploadEditorImageAction } from "@/lib/admin/actions";
import { translateFromCs, translateErrorMessage } from "@/lib/admin/translate-client";

export type LedxLineRow = {
  id: string;
  slug: string;
  sort_order: number;
  is_published: boolean;
  name: string;
  subtitle: string | null;
  tagline: string | null;
  landing_desc: string | null;
  landing_pills: unknown;
  detail_lead: string | null;
  detail_pills: unknown;
  models_note: string | null;
  models: unknown;
  params: unknown;
  uses_title: string | null;
  uses: unknown;
  images: unknown;
  form_models: unknown;
  form_cct: unknown;
  form_cct_fixed: string | null;
  form_uhel: unknown;
  translations?: unknown;
};

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const rows2d = (v: unknown): string[][] =>
  Array.isArray(v) ? v.map((r) => (Array.isArray(r) ? r.map(String) : [])) : [];
const joinLines = (v: unknown) => arr(v).join("\n");
const joinTable = (v: unknown) => rows2d(v).map((r) => r.join(" | ")).join("\n");

const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";
const card = "rounded-xl border border-cream-dark bg-white p-5 space-y-4";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={legend}>{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-soft">{hint}</span>}
    </label>
  );
}

type Loc = "cs" | "en" | "de";
const LOCS: Loc[] = ["cs", "en", "de"];

/** Přeložitelná pole řady: sloupec → jak se převádí na text v textarea. */
const TR_FIELDS = {
  subtitle: "text",
  tagline: "text",
  landing_desc: "text",
  landing_pills: "list",
  detail_lead: "text",
  detail_pills: "list",
  models_note: "text",
  models: "table",
  params: "table",
  uses_title: "text",
  uses: "list",
  form_models: "list",
  form_cct: "list",
  form_cct_fixed: "text",
  form_uhel: "list",
} as const;
type TrCol = keyof typeof TR_FIELDS;
type TrVals = Record<TrCol, Record<Loc, string>>;

const toText = (kind: (typeof TR_FIELDS)[TrCol], v: unknown): string =>
  kind === "list" ? joinLines(v) : kind === "table" ? joinTable(v) : typeof v === "string" ? v : "";

function initVals(line?: LedxLineRow): TrVals {
  const tr = (line?.translations ?? {}) as Record<string, Record<string, unknown>>;
  const out = {} as TrVals;
  for (const col of Object.keys(TR_FIELDS) as TrCol[]) {
    const kind = TR_FIELDS[col];
    out[col] = {
      cs: toText(kind, line?.[col]) || (col === "uses_title" && !line ? "Kde se hodí" : ""),
      en: toText(kind, tr.en?.[col]),
      de: toText(kind, tr.de?.[col]),
    };
  }
  return out;
}

type TrCtxValue = { vals: TrVals; setVals: React.Dispatch<React.SetStateAction<TrVals>>; lang: Loc };
const TrCtx = createContext<TrCtxValue | null>(null);

/** Pole s verzí pro každý jazyk (zobrazená jen aktivní; odesílají se všechny). */
function Tr({ col, label, hint, rows, mono, placeholder }: {
  col: TrCol; label: string; hint?: string; rows?: number; mono?: boolean; placeholder?: string;
}) {
  const { vals, setVals, lang } = useContext(TrCtx)!;
  return (
    <Field label={`${label}${lang !== "cs" ? ` · ${lang.toUpperCase()}` : ""}`} hint={lang !== "cs" ? "Prázdné = zobrazí se česká verze." : hint}>
      {LOCS.map((loc) => {
        const common = {
          name: loc === "cs" ? col : `${col}__${loc}`,
          value: vals[col][loc],
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setVals((p) => ({ ...p, [col]: { ...p[col], [loc]: e.target.value } })),
          placeholder: loc === "cs" ? placeholder : vals[col].cs.split("\n")[0] || placeholder,
          className: cn(input, mono && "font-mono", TR_FIELDS[col] === "table" && "text-xs", loc !== lang && "hidden"),
        };
        return rows ? <textarea key={loc} rows={rows} {...common} /> : <input key={loc} {...common} />;
      })}
    </Field>
  );
}

export function LedxLineForm({ line, locale }: { line?: LedxLineRow; locale: string }) {
  const [images, setImages] = useState<string[]>(arr(line?.images));
  const [uploading, startUpload] = useTransition();
  const [lang, setLang] = useState<Loc>("cs");
  const [vals, setVals] = useState<TrVals>(() => initVals(line));
  const [busy, setBusy] = useState(false);
  const [trError, setTrError] = useState<string | null>(null);

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    startUpload(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await uploadEditorImageAction(fd);
        if (res.ok && res.url) setImages((prev) => [...prev, res.url!]);
      }
    });
  };
  const remove = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const makePrimary = (i: number) =>
    setImages((prev) => {
      const next = [...prev];
      const [x] = next.splice(i, 1);
      next.unshift(x);
      return next;
    });

  const filled = (loc: Loc) =>
    (Object.keys(TR_FIELDS) as TrCol[]).filter((c) => vals[c].cs.trim() && vals[c][loc].trim()).length;
  const total = (Object.keys(TR_FIELDS) as TrCol[]).filter((c) => vals[c].cs.trim()).length;

  async function translate() {
    setBusy(true);
    setTrError(null);
    const texts: Record<string, string> = {};
    for (const col of Object.keys(TR_FIELDS) as TrCol[]) if (vals[col].cs.trim()) texts[col] = vals[col].cs;
    const res = await translateFromCs(texts);
    setBusy(false);
    if (!res.ok) {
      setTrError(translateErrorMessage(res.error));
      return;
    }
    setVals((p) => {
      const next = { ...p };
      for (const col of Object.keys(texts) as TrCol[]) {
        next[col] = { ...next[col], en: res.en[col] ?? next[col].en, de: res.de[col] ?? next[col].de };
      }
      return next;
    });
    setLang("en");
  }

  return (
    <TrCtx.Provider value={{ vals, setVals, lang }}>
      <form action={saveLedxLineAction} className="max-w-3xl space-y-5">
        <input type="hidden" name="id" value={line?.id ?? ""} />
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="images" value={JSON.stringify(images)} />

        {/* Jazyk obsahu */}
        <div className="sticky top-[57px] z-10 flex flex-wrap items-center gap-2 rounded-xl border border-cream-dark bg-white/95 p-3 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-soft">Jazyk textů</span>
          <div className="inline-flex rounded-lg border border-cream-dark bg-white p-0.5 text-xs font-semibold">
            {LOCS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn("rounded-md px-3 py-1.5 uppercase transition-colors", lang === code ? "bg-forest text-white" : "text-gray-soft hover:bg-cream")}
              >
                {code}
                {code !== "cs" && total > 0 && (
                  <span className={cn("ml-1 font-mono text-[10px]", lang === code ? "text-white/80" : filled(code) === total ? "text-forest" : "text-amber")}>
                    {filled(code)}/{total}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={translate}
            disabled={busy}
            title="Přeloží všechna vyplněná česká pole do EN a DE (přepíše stávající překlady)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/10 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Přeložit z ČJ (AI)
          </button>
          {trError && <span className="text-xs text-error">{trError}</span>}
        </div>

        {/* Základní */}
        <div className={card}>
          <p className="font-display text-lg font-semibold">Základní</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Název *" hint="Stejný ve všech jazycích"><input name="name" required defaultValue={line?.name ?? ""} className={input} placeholder="Flood Light" /></Field>
            <Field label="Slug *" hint="Adresa detailu: /kategorie/profi-osvetleni/slug"><input name="slug" required defaultValue={line?.slug ?? ""} className={input} placeholder="flood" /></Field>
            <Tr col="subtitle" label="Podtitul" placeholder="Univerzální reflektory" />
            <Field label="Pořadí"><input name="sort_order" type="number" defaultValue={line?.sort_order ?? 0} className={input} /></Field>
            <Tr col="tagline" label="Tagline (kurzíva na kartě řady)" placeholder="Spolehlivý pracant…" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={line?.is_published ?? true} className="size-4 accent-forest" />
            Publikováno (zobrazit na webu)
          </label>
        </div>

        {/* Fotky */}
        <div className={card}>
          <p className="font-display text-lg font-semibold">Fotky (galerie)</p>
          <p className="text-sm text-gray-soft">První fotka je hlavní (zobrazí se na kartě řady i jako velká na detailu). Nejlépe průhledné PNG produktu.</p>
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((url, i) => (
                <div key={url + i} className={`relative rounded-lg border p-2 ${i === 0 ? "border-forest" : "border-cream-dark"}`}>
                  <img src={url} alt="" className="aspect-square w-full object-contain" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-forest px-1.5 py-0.5 text-[10px] font-semibold text-white">Hlavní</span>}
                  <div className="mt-1 flex justify-between">
                    <button type="button" onClick={() => makePrimary(i)} title="Nastavit jako hlavní" className="text-gray-soft hover:text-forest"><Star className="size-4" /></button>
                    <button type="button" onClick={() => remove(i)} title="Odebrat" className="text-gray-soft hover:text-error"><X className="size-4" /></button>
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

        {/* Karta na úvodu */}
        <div className={card}>
          <p className="font-display text-lg font-semibold">Karta na úvodu</p>
          <Tr col="landing_desc" label="Krátký popis" rows={2} />
          <Tr col="landing_pills" label="Odznaky (parametry)" hint="Jeden na řádek, např. CRI 90" rows={4} mono />
        </div>

        {/* Detail */}
        <div className={card}>
          <p className="font-display text-lg font-semibold">Detail řady</p>
          <Tr col="detail_lead" label="Úvodní text" rows={3} />
          <Tr col="detail_pills" label="Odznaky na detailu" hint="Jeden na řádek" rows={4} mono />
          <Tr col="models_note" label="Poznámka nad tabulkou modelů" rows={2} />
          <Tr col="models" label="Modely" hint="Jeden model na řádek. Sloupce oddělené | :  Model | Výkon | Světelný tok | Rozměry | Hmotnost" rows={7} mono placeholder="Flood Light 50 W | 50 W | 6 000 lm | 278 × 86 × 230 mm | 2,45 kg" />
          <Tr col="params" label="Společné parametry" hint="Jeden na řádek:  Klíč | Hodnota" rows={7} mono placeholder="Krytí / třída | IP66 · I · IK08" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Tr col="uses_title" label="Nadpis sekce použití" />
          </div>
          <Tr col="uses" label="Použití (štítky)" hint="Jeden na řádek" rows={4} mono />
        </div>

        {/* Formulář poptávky */}
        <div className={card}>
          <p className="font-display text-lg font-semibold">Volby v poptávkovém formuláři</p>
          <Tr col="form_models" label="Modely / výkony" hint="Jeden na řádek — nabídne se v poli „Model / výkon“" rows={5} mono />
          <div className="grid gap-4 sm:grid-cols-2">
            <Tr col="form_cct" label="Barvy světla (výběr)" hint="Jedna na řádek. Nechte prázdné, pokud je barva pevná →" rows={5} mono />
            <Tr col="form_cct_fixed" label="Pevná barva světla" hint="Vyplňte jen u Grow (pak se výběr nezobrazí)" placeholder="4200 K · Grow spektrum" />
          </div>
          <Tr col="form_uhel" label="Úhly vyzařování (výběr)" hint="Jeden na řádek" rows={5} mono />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="rounded-lg bg-forest px-6 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
            Uložit řadu
          </button>
          <a href={`/${locale}/admin/ledx`} className="rounded-lg border border-cream-dark px-6 py-2.5 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
            Zrušit
          </a>
        </div>
      </form>
    </TrCtx.Provider>
  );
}
