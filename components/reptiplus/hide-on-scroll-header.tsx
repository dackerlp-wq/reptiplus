"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Minimální posun (px), který se počítá jako změna směru — tlumí drobné cuknutí. */
const DELTA = 8;

/**
 * Sticky hlavička, která se při skrolu dolů schová a při skrolu nahoru znovu objeví.
 * Zůstává viditelná nahoře na stránce, při najetí myší (megamenu)
 * a když je uvnitř fokus (např. psaní do vyhledávání).
 */
export function HideOnScrollHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastY = window.scrollY;
    // Na dotykových zařízeních :hover „ulpí" po ťuknutí → hover bereme jen u myši.
    const canHover = window.matchMedia("(hover: hover)").matches;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = Math.max(window.scrollY, 0);
      const diff = y - lastY;
      if (Math.abs(diff) < DELTA) return;

      const active = document.activeElement;
      const interacting =
        (canHover && el.matches(":hover")) || // otevřené megamenu pod myší
        (!!active && el.contains(active) && active.matches("input, textarea, select")); // psaní do hledání

      if (y <= el.offsetHeight) setHidden(false); // nahoře stránky vždy vidět
      else if (diff > 0 && !interacting) setHidden(true); // dolů → schovat
      else if (diff < 0) setHidden(false); // nahoru → ukázat

      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    // Klávesnice (Tab) do schované hlavičky → ukázat.
    const onFocusIn = (e: FocusEvent) => {
      if ((e.target as Element | null)?.matches?.(":focus-visible")) setHidden(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return (
    <header
      ref={ref}
      data-hidden={hidden || undefined}
      className={cn(
        "sticky top-0 transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none",
        hidden && "-translate-y-full",
        className,
      )}
    >
      {children}
    </header>
  );
}
