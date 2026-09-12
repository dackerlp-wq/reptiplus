"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { SearchBar } from "./search-bar";
import { cn } from "@/lib/utils";

/** Lupa v kompaktní liště: po kliknutí rozbalí pole hledání pod lištou (úzké obrazovky). */
export function CompactSearch({ placeholder, locale, className }: { placeholder: string; locale: Locale; className?: string }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <div ref={boxRef} className={cn("contents", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={placeholder}
        aria-expanded={open}
        className="flex items-center justify-center rounded-xl p-2 text-charcoal transition-colors hover:bg-white hover:text-forest"
      >
        {open ? <X className="size-6" /> : <Search className="size-6" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-cream-dark bg-white px-4 py-3 shadow-lg animate-reveal">
          <SearchBar placeholder={placeholder} locale={locale} autoFocus className="mx-auto max-w-2xl" />
        </div>
      )}
    </div>
  );
}
