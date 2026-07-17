"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  X,
  ImagePlus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/admin/image-compress";
import { uploadVariantImageAction } from "@/lib/admin/actions";
import { translateFromCs } from "@/lib/admin/translate-client";

type Lang = "cs" | "en" | "de";
type I18n = Record<Lang, string>;
const emptyI18n = (): I18n => ({ cs: "", en: "", de: "" });

export type VariantAttrRow = { key: I18n; value: I18n };
export type VariantRow = {
  id?: string;
  name: I18n;
  sku: string;
  price_czk: string;
  price_eur: string;
  stock_qty: string;
  image_url: string;
  attributes: VariantAttrRow[];
};

const LOCALES: [Lang, string][] = [
  ["cs", "CS"],
  ["en", "EN"],
  ["de", "DE"],
];
const input =
  "w-full rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm outline-none focus:border-forest";
const legend = "text-[11px] font-semibold uppercase tracking-wide text-gray-soft";

export function emptyVariant(): VariantRow {
  return {
    name: emptyI18n(),
    sku: "",
    price_czk: "",
    price_eur: "",
    stock_qty: "0",
    image_url: "",
    attributes: [],
  };
}

export function ProductVariants({ initial }: { initial: VariantRow[] }) {
  const [rows, setRows] = useState<VariantRow[]>(initial);
  const [lang, setLang] = useState<Lang>("cs");
  const [busy, setBusy] = useState<null | "translate" | "eur">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);

  const add = () => setRows((r) => [...r, emptyVariant()]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const patch = (i: number, fn: (v: VariantRow) => VariantRow) =>
    setRows((r) => r.map((row, idx) => (idx === i ? fn(row) : row)));

  const setName = (i: number, val: string) =>
    patch(i, (v) => ({ ...v, name: { ...v.name, [lang]: val } }));
  const setStr = (i: number, field: keyof VariantRow, val: string) =>
    patch(i, (v) => ({ ...v, [field]: val }));

  const addAttr = (i: number) =>
    patch(i, (v) => ({
      ...v,
      attributes: [...v.attributes, { key: emptyI18n(), value: emptyI18n() }],
    }));
  const removeAttr = (i: number, ai: number) =>
    patch(i, (v) => ({
      ...v,
      attributes: v.attributes.filter((_, idx) => idx !== ai),
    }));
  const setAttr = (
    i: number,
    ai: number,
    field: "key" | "value",
    val: string,
  ) =>
    patch(i, (v) => ({
      ...v,
      attributes: v.attributes.map((a, idx) =>
        idx === ai ? { ...a, [field]: { ...a[field], [lang]: val } } : a,
      ),
    }));

  const named = rows.filter((r) => r.name.cs.trim());
  const totalStock = named.reduce((sum, r) => {
    const n = parseInt(r.stock_qty || "0", 10);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  const serialized = JSON.stringify(
    named.map((r) => ({
      id: r.id,
      name: r.name.cs.trim(),
      name_i18n: r.name,
      sku: r.sku,
      price_czk: r.price_czk,
      price_eur: r.price_eur,
      stock_qty: r.stock_qty,
      image_url: r.image_url || null,
      attributes: r.attributes
        .filter((a) => a.key.cs.trim() && a.value.cs.trim())
        .map((a) => ({
          key: a.key.cs.trim(),
          value: a.value.cs.trim(),
          key_i18n: a.key,
          value_i18n: a.value,
        })),
    })),
  );

  async function uploadImage(i: number, file: File | null) {
    if (!file) return;
    setUploading(i);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", await compressImage(file));
      const res = await uploadVariantImageAction(fd);
      if (res.ok && res.url) setStr(i, "image_url", res.url);
      else setMsg("Nahrání obrázku varianty selhalo.");
    } finally {
      setUploading(null);
    }
  }

  async function convertEur() {
    setBusy("eur");
    setMsg(null);
    try {
      const res = await fetch("/api/exchange-rate");
      const data = (await res.json()) as { rate?: number; date?: string };
      if (!res.ok || !data.rate) {
        setMsg("Kurz se nepodařilo načíst.");
        return;
      }
      const rate = data.rate;
      setRows((r) =>
        r.map((row) => {
          const czk = parseFloat((row.price_czk || "").replace(",", "."));
          return Number.isFinite(czk) && czk > 0
            ? { ...row, price_eur: (czk / rate).toFixed(2) }
            : row;
        }),
      );
      setMsg(`Ceny variant přepočteny kurzem ČNB ${rate} Kč/€.`);
    } catch {
      setMsg("Kurz se nepodařilo načíst.");
    } finally {
      setBusy(null);
    }
  }

  async function translate() {
    setBusy("translate");
    setMsg(null);
    const texts: Record<string, string> = {};
    rows.forEach((r, i) => {
      if (r.name.cs.trim()) texts[`n${i}`] = r.name.cs;
      r.attributes.forEach((a, ai) => {
        if (a.key.cs.trim()) texts[`k${i}_${ai}`] = a.key.cs;
        if (a.value.cs.trim()) texts[`v${i}_${ai}`] = a.value.cs;
      });
    });
    const res = await translateFromCs(texts);
    if (!res.ok) {
      setMsg("Překlad se nezdařil. Zkontroluj AI Gateway.");
      setBusy(null);
      return;
    }
    setRows((r) =>
      r.map((row, i) => ({
        ...row,
        name: {
          ...row.name,
          en: res.en[`n${i}`] ?? row.name.en,
          de: res.de[`n${i}`] ?? row.name.de,
        },
        attributes: row.attributes.map((a, ai) => ({
          key: {
            ...a.key,
            en: res.en[`k${i}_${ai}`] ?? a.key.en,
            de: res.de[`k${i}_${ai}`] ?? a.key.de,
          },
          value: {
            ...a.value,
            en: res.en[`v${i}_${ai}`] ?? a.value.en,
            de: res.de[`v${i}_${ai}`] ?? a.value.de,
          },
        })),
      })),
    );
    setLang("en");
    setBusy(null);
  }

  return (
    <div className="rounded-xl border border-cream-dark bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Varianty</h2>
        {named.length > 0 && (
          <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest">
            {named.length} variant · sklad {totalStock} ks
          </span>
        )}
      </div>
      <p className="mb-3 mt-1 text-xs text-gray-soft">
        Každá varianta má vlastní cenu, sklad, obrázek a <strong>specifické
        parametry</strong> (to, čím se liší od ostatních). Parametry společné pro
        všechny varianty patří nahoru do „Společných parametrů". Prázdná cena =
        použije se cena produktu. Přelož názvy i parametry do EN/DE tlačítkem.
      </p>

      {/* Nástroje: jazyk, překlad, EUR přepočet */}
      {rows.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-cream-dark bg-white p-0.5 text-xs font-semibold">
            {LOCALES.map(([code, l]) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  lang === code ? "bg-forest text-white" : "text-gray-soft hover:bg-cream",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={translate}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/10 disabled:opacity-50"
          >
            {busy === "translate" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Přeložit z ČJ (AI)
          </button>
          <button
            type="button"
            onClick={convertEur}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest/10 disabled:opacity-50"
          >
            {busy === "eur" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Přepočítat € z Kč
          </button>
        </div>
      )}

      {msg && (
        <p className="mb-3 rounded-lg bg-forest/5 px-3 py-2 text-xs text-forest">
          {msg}
        </p>
      )}

      <input type="hidden" name="variants" value={serialized} />

      {rows.length === 0 && (
        <p className="mb-3 rounded-lg border border-dashed border-cream-dark px-3 py-4 text-center text-sm text-gray-soft">
          Produkt bez variant.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.id ?? `new-${i}`}
            className="rounded-lg border border-cream-dark bg-white p-3"
          >
            <div className="flex gap-3">
              {/* Obrázek varianty */}
              <div className="shrink-0">
                <label className="relative flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-cream-dark bg-paper">
                  {row.image_url ? (
                    <Image
                      src={row.image_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : uploading === i ? (
                    <Loader2 className="size-5 animate-spin text-forest" />
                  ) : (
                    <ImagePlus className="size-5 text-gray-soft" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => uploadImage(i, e.target.files?.[0] ?? null)}
                  />
                </label>
                {row.image_url && (
                  <button
                    type="button"
                    onClick={() => setStr(i, "image_url", "")}
                    className="mt-1 flex w-full items-center justify-center gap-1 text-[11px] text-gray-soft hover:text-error"
                  >
                    <X className="size-3" /> Odebrat
                  </button>
                )}
              </div>

              {/* Pole */}
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.6fr]">
                <label className="flex flex-col gap-1">
                  <span className={legend}>Název ({lang.toUpperCase()})</span>
                  <input
                    value={row.name[lang]}
                    onChange={(e) => setName(i, e.target.value)}
                    placeholder="54 W"
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={legend}>SKU</span>
                  <input
                    value={row.sku}
                    onChange={(e) => setStr(i, "sku", e.target.value)}
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={legend}>Cena Kč</span>
                  <input
                    inputMode="decimal"
                    value={row.price_czk}
                    onChange={(e) => setStr(i, "price_czk", e.target.value)}
                    placeholder="—"
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={legend}>Cena €</span>
                  <input
                    inputMode="decimal"
                    value={row.price_eur}
                    onChange={(e) => setStr(i, "price_eur", e.target.value)}
                    placeholder="—"
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={legend}>Sklad</span>
                  <input
                    type="number"
                    min={0}
                    value={row.stock_qty}
                    onChange={(e) => setStr(i, "stock_qty", e.target.value)}
                    className={input}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => remove(i)}
                title="Odebrat variantu"
                className="h-fit rounded-md p-2 text-gray-soft transition-colors hover:bg-cream hover:text-error"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            {/* Parametry varianty */}
            <div className="mt-3 border-t border-cream pt-3">
              <span className={legend}>Parametry specifické pro tuto variantu</span>
              <div className="mt-1.5 space-y-1.5">
                {row.attributes.map((a, ai) => (
                  <div key={ai} className="flex items-center gap-2">
                    <input
                      value={a.key[lang]}
                      onChange={(e) => setAttr(i, ai, "key", e.target.value)}
                      placeholder="Název (např. Barva)"
                      className={input}
                    />
                    <input
                      value={a.value[lang]}
                      onChange={(e) => setAttr(i, ai, "value", e.target.value)}
                      placeholder="Hodnota"
                      className={input}
                    />
                    <button
                      type="button"
                      onClick={() => removeAttr(i, ai)}
                      className="shrink-0 rounded-md p-2 text-gray-soft hover:text-error"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addAttr(i)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
              >
                <Plus className="size-3.5" /> Parametr varianty
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-sm font-semibold text-forest transition-colors hover:bg-forest/10"
      >
        <Plus className="size-4" /> Přidat variantu
      </button>
    </div>
  );
}
