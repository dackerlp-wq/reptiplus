"use client";

import { Printer } from "lucide-react";

/** Tlačítko pro tisk / uložení do PDF (přes prohlížeč). Na tisku se skryje. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
    >
      <Printer className="size-4" /> {label}
    </button>
  );
}
