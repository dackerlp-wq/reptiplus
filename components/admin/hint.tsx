import { Info } from "lucide-react";

/** Elegantní vysvětlivka (muted, s ikonou). */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-cream px-3 py-2 text-xs leading-relaxed text-gray-soft">
      <Info className="mt-0.5 size-3.5 shrink-0 text-forest" />
      <span>{children}</span>
    </p>
  );
}
