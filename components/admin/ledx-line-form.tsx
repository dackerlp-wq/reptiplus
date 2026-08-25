/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { Upload, X, Star, Loader2 } from "lucide-react";
import { saveLedxLineAction, uploadEditorImageAction } from "@/lib/admin/actions";

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

export function LedxLineForm({ line, locale }: { line?: LedxLineRow; locale: string }) {
  const [images, setImages] = useState<string[]>(arr(line?.images));
  const [uploading, startUpload] = useTransition();

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

  return (
    <form action={saveLedxLineAction} className="max-w-3xl space-y-5">
      <input type="hidden" name="id" value={line?.id ?? ""} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {/* Základní */}
      <div className={card}>
        <p className="font-display text-lg font-semibold">Základní</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Název *"><input name="name" required defaultValue={line?.name ?? ""} className={input} placeholder="Flood Light" /></Field>
          <Field label="Slug *" hint="Krátký kód do URL (#slug), např. flood"><input name="slug" required defaultValue={line?.slug ?? ""} className={input} placeholder="flood" /></Field>
          <Field label="Podtitul"><input name="subtitle" defaultValue={line?.subtitle ?? ""} className={input} placeholder="Univerzální reflektory" /></Field>
          <Field label="Pořadí"><input name="sort_order" type="number" defaultValue={line?.sort_order ?? 0} className={input} /></Field>
          <Field label="Tagline (kurzíva na detailu)"><input name="tagline" defaultValue={line?.tagline ?? ""} className={input} placeholder="Spolehlivý pracant…" /></Field>
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
        <Field label="Krátký popis"><textarea name="landing_desc" rows={2} defaultValue={line?.landing_desc ?? ""} className={input} /></Field>
        <Field label="Odznaky (parametry)" hint="Jeden na řádek, např. CRI 90"><textarea name="landing_pills" rows={4} defaultValue={joinLines(line?.landing_pills)} className={`${input} font-mono`} /></Field>
      </div>

      {/* Detail */}
      <div className={card}>
        <p className="font-display text-lg font-semibold">Detail řady</p>
        <Field label="Úvodní text"><textarea name="detail_lead" rows={3} defaultValue={line?.detail_lead ?? ""} className={input} /></Field>
        <Field label="Odznaky na detailu" hint="Jeden na řádek"><textarea name="detail_pills" rows={4} defaultValue={joinLines(line?.detail_pills)} className={`${input} font-mono`} /></Field>
        <Field label="Poznámka nad tabulkou modelů"><textarea name="models_note" rows={2} defaultValue={line?.models_note ?? ""} className={input} /></Field>
        <Field label="Modely" hint="Jeden model na řádek. Sloupce oddělené | :  Model | Výkon | Světelný tok | Rozměry | Hmotnost">
          <textarea name="models" rows={7} defaultValue={joinTable(line?.models)} className={`${input} font-mono text-xs`} placeholder="Flood Light 50 W | 50 W | 6 000 lm | 278 × 86 × 230 mm | 2,45 kg" />
        </Field>
        <Field label="Společné parametry" hint="Jeden na řádek:  Klíč | Hodnota">
          <textarea name="params" rows={7} defaultValue={joinTable(line?.params)} className={`${input} font-mono text-xs`} placeholder="Krytí / třída | IP66 · I · IK08" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nadpis sekce použití"><input name="uses_title" defaultValue={line?.uses_title ?? "Kde se hodí"} className={input} /></Field>
        </div>
        <Field label="Použití (štítky)" hint="Jeden na řádek"><textarea name="uses" rows={4} defaultValue={joinLines(line?.uses)} className={`${input} font-mono`} /></Field>
      </div>

      {/* Formulář poptávky */}
      <div className={card}>
        <p className="font-display text-lg font-semibold">Volby v poptávkovém formuláři</p>
        <Field label="Modely / výkony" hint="Jeden na řádek — nabídne se v poli „Model / výkon"><textarea name="form_models" rows={5} defaultValue={joinLines(line?.form_models)} className={`${input} font-mono`} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Barvy světla (výběr)" hint="Jedna na řádek. Nechte prázdné, pokud je barva pevná ↓"><textarea name="form_cct" rows={5} defaultValue={joinLines(line?.form_cct)} className={`${input} font-mono`} /></Field>
          <Field label="Pevná barva světla" hint="Vyplňte jen u Grow (pak se výběr nezobrazí)"><input name="form_cct_fixed" defaultValue={line?.form_cct_fixed ?? ""} className={input} placeholder="4200 K · Grow spektrum" /></Field>
        </div>
        <Field label="Úhly vyzařování (výběr)" hint="Jeden na řádek"><textarea name="form_uhel" rows={5} defaultValue={joinLines(line?.form_uhel)} className={`${input} font-mono`} /></Field>
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
  );
}
