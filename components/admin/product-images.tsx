"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import {
  uploadProductImagesAction,
  deleteProductImageAction,
  setPrimaryImageAction,
} from "@/lib/admin/actions";
import { compressImage } from "@/lib/admin/image-compress";

type Img = { id: string; url: string; alt: string | null; sort_order: number };

const ERR: Record<string, string> = {
  NO_FILES: "Nevybral jsi žádný soubor.",
  NOT_IMAGE: "Jeden ze souborů není obrázek.",
  TOO_LARGE: "Obrázek je i po kompresi příliš velký.",
  UPLOAD: "Nahrání do úložiště selhalo.",
  DB: "Uložení obrázku selhalo.",
};

export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: Img[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", productId);
      for (const f of Array.from(files)) {
        fd.append("files", await compressImage(f));
      }
      const res = await uploadProductImagesAction(fd);
      if (!res.ok) setError(ERR[res.error ?? ""] ?? "Nahrání selhalo.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  };

  const remove = (imageId: string) => {
    setError(null);
    const fd = new FormData();
    fd.set("imageId", imageId);
    startTransition(async () => {
      await deleteProductImageAction(fd);
      router.refresh();
    });
  };

  const makePrimary = (imageId: string) => {
    setError(null);
    const fd = new FormData();
    fd.set("imageId", imageId);
    fd.set("id", productId);
    startTransition(async () => {
      await setPrimaryImageAction(fd);
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-cream-dark bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Obrázky</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg border border-forest px-3 py-1.5 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Nahrát
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {error && <p className="mb-3 text-sm text-error">{error}</p>}

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-cream-dark px-4 py-8 text-center text-sm text-gray-soft">
          Zatím žádné obrázky. První v pořadí je hlavní (zobrazí se v katalogu).
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {sorted.map((img, i) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-cream-dark bg-paper"
            >
              <Image
                src={img.url}
                alt={img.alt || ""}
                fill
                sizes="120px"
                className="object-cover"
              />
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
                    onClick={() => makePrimary(img.id)}
                    disabled={pending}
                    className="rounded bg-white/90 p-1.5 text-charcoal hover:text-gold"
                  >
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  title="Smazat"
                  onClick={() => remove(img.id)}
                  disabled={pending}
                  className="rounded bg-white/90 p-1.5 text-charcoal hover:text-error"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
