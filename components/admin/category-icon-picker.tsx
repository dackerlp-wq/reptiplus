"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { CATEGORY_ICON_GROUPS, CategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

const legend = "text-xs font-semibold uppercase tracking-wide text-gray-soft";

/**
 * Výběr ikony kategorie: předpřipravená sada nebo vlastní obrázek (SVG/PNG/WebP).
 * Odesílá `icon` (klíč nebo prázdné), `icon_file` (nový soubor) a `icon_url_keep`
 * (stávající vlastní ikona, prázdné = odebrat).
 */
export function CategoryIconPicker({
  icon,
  iconUrl,
}: {
  icon: string | null;
  iconUrl: string | null;
}) {
  const [preset, setPreset] = useState<string>(icon ?? "");
  const [keepUrl, setKeepUrl] = useState<string>(iconUrl ?? "");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const customUrl = filePreview ?? (keepUrl || null);

  const clearCustom = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setKeepUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-4 rounded-xl border border-cream-dark bg-paper p-4">
      <input type="hidden" name="icon" value={preset} />
      <input type="hidden" name="icon_url_keep" value={keepUrl} />

      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-cream-dark bg-white text-forest">
          <CategoryIcon icon={preset} iconUrl={customUrl} className="size-7" />
        </span>
        <div className="min-w-0">
          <p className={legend}>Ikona v menu</p>
          <p className="text-sm text-gray-soft">
            {customUrl
              ? "Vlastní obrázek (má přednost před předpřipravenou ikonou)."
              : preset
                ? "Předpřipravená ikona."
                : "Bez výběru se použije výchozí lístek."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cream-dark bg-white px-3 py-2 text-sm font-medium text-charcoal hover:border-forest hover:text-forest">
          <Upload className="size-4" />
          Nahrát vlastní (SVG / PNG / WebP)
          <input
            ref={fileRef}
            type="file"
            name="icon_file"
            accept="image/svg+xml,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (filePreview) URL.revokeObjectURL(filePreview);
              setFilePreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        {customUrl && (
          <button
            type="button"
            onClick={clearCustom}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-soft hover:bg-error/10 hover:text-error"
          >
            <X className="size-4" /> Odebrat vlastní
          </button>
        )}
      </div>
      <p className="text-xs text-gray-soft">
        Vlastní ikona se obarví barvou webu (jako ostatní ikony) — nejlépe jednobarevná s průhledným pozadím, max. 512 kB.
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className={legend}>Předpřipravené ikony</p>
          {preset && (
            <button type="button" onClick={() => setPreset("")} className="text-xs text-gray-soft hover:text-forest">
              Zrušit výběr
            </button>
          )}
        </div>
        {CATEGORY_ICON_GROUPS.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-xs text-gray-soft">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.icons.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={preset === key}
                  onClick={() => setPreset(key)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg border transition-colors",
                    preset === key
                      ? "border-forest bg-forest text-white"
                      : "border-cream-dark bg-white text-charcoal hover:border-forest hover:text-forest",
                  )}
                >
                  <Icon className="size-5" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
