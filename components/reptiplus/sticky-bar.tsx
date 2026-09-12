"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Přilepený řádek hlavičky (kategorie). Jakmile odscrolluje velká část
 * hlavičky nad ním, přepne se do kompaktního režimu (`data-compact`), ve
 * kterém se v řádku objeví malé logo, hledání a ikony účtu/košíku.
 * Nikdy se neschovává — žádné skákání při změně směru scrollu.
 */
export function StickyBar({ className, children }: { className?: string; children: React.ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    // Sentinel sedí těsně nad lištou: když opustí viewport horem, lišta je přilepená.
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      rootMargin: "0px 0px 0px 0px",
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="h-px w-full" />
      <div data-compact={compact || undefined} className={cn("group sticky top-0 z-40", className)}>
        {children}
      </div>
    </>
  );
}
