"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/admin/image-compress";

type Pick = { id: string; file: File; url: string };

/**
 * Obrázky pro NOVÝ produkt (ještě nemá ID): vybrané soubory se zkomprimují v
 * prohlížeči, ukážou jako náhled a odešlou se spolu s formulářem jako pole
 * `images` (skryté <input type="file">, soubory se do něj vkládají přes
 * DataTransfer). Akce `saveProductAction` je po vložení produktu nahraje.
 * První v pořadí je hlavní obrázek.
 */
export function NewProductImages() {
  const pickerRef = useRef<HTMLInputElement>(null);
  const formInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);

  // Soubory ve skrytém poli formuláře držet v souladu se seznamem náhledů.
  useEffect(() => {
    const input = formInputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const it of items) dt.items.add(it.file);
    input.files = dt.files;
  }, [items]);

  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const picked: Pick[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        const file = await compressImage(f);
        picked.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
      }
      setItems((p) => [...p, ...picked]);
    } finally {
      setBusy(false);
      if (pickerRef.current) pickerRef.current.value = "";
    }
  };

  const remove = (id: string) =>
    setItems((p) => {
      const it = p.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.url);
      return p.filter((x) => x.id !== id);
    });

  const makePrimary = (id: string) =>
    setItems((p) => [...p.filter((x) => x.id === id), ...p.filter((x) => x.id !== id)]);

  return (
    <div className="rounded-xl border border-cream-dark bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Obrázky</h2>
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-forest px-3 py-1.5 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Vybrat
        </button>
        <input
          ref={pickerRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => add(e.target.files)}
        />
        {/* Skutečné pole formuláře — soubory se nahrají při uložení produktu. */}
        <input ref={formInputRef} type="file" name="images" multiple hidden tabIndex={-1} />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-cream-dark px-4 py-8 text-center text-sm text-gray-soft">
          Vyber obrázky — nahrají se při uložení produktu. První v pořadí je hlavní
          (zobrazí se v katalogu).
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((it, i) => (
              <div
                key={it.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-cream-dark bg-paper"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt="" className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-forest px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Hlavní
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {i !== 0 && (
                    <button
                      type="button"
                      title="Nastavit jako hlavní"
                      onClick={() => makePrimary(it.id)}
                      className="rounded bg-white/90 p-1.5 text-charcoal hover:text-gold"
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Odebrat"
                    onClick={() => remove(it.id)}
                    className="rounded bg-white/90 p-1.5 text-charcoal hover:text-error"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-soft">
            {items.length} {items.length === 1 ? "obrázek" : items.length < 5 ? "obrázky" : "obrázků"} se nahraje
            při uložení produktu.
          </p>
        </>
      )}
    </div>
  );
}
