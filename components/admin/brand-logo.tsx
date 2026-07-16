"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  uploadBrandLogoAction,
  removeBrandLogoAction,
} from "@/lib/admin/actions";
import { compressImage } from "@/lib/admin/image-compress";

const ERR: Record<string, string> = {
  NO_FILES: "Nevybral jsi soubor.",
  NOT_IMAGE: "Soubor není obrázek.",
  TOO_LARGE: "Obrázek je příliš velký.",
  UPLOAD: "Nahrání selhalo.",
  DB: "Uložení selhalo.",
};

export function BrandLogo({
  brandId,
  logoUrl,
}: {
  brandId: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const upload = (file: File | null) => {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", brandId);
      fd.set("file", await compressImage(file, 512));
      const res = await uploadBrandLogoAction(fd);
      if (!res.ok) setError(ERR[res.error ?? ""] ?? "Nahrání selhalo.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", brandId);
      await removeBrandLogoAction(fd);
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-cream-dark bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Logo</h2>
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
          {logoUrl ? "Změnit" : "Nahrát"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => upload(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="mb-3 text-sm text-error">{error}</p>}

      {logoUrl ? (
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border border-cream-dark bg-paper">
            <Image
              src={logoUrl}
              alt="Logo"
              fill
              sizes="160px"
              className="object-contain p-2"
            />
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            title="Odebrat logo"
            className="rounded-md p-2 text-gray-soft transition-colors hover:bg-cream hover:text-error disabled:opacity-40"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-cream-dark px-4 py-6 text-center text-sm text-gray-soft">
          Bez loga. Zobrazí se v sekci „O výrobci" na detailu produktu.
        </p>
      )}
    </div>
  );
}
