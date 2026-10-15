"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Událost, kterou vyvolají klientské komponenty (filtry) při změně URL přes router. */
const START_EVENT = "rp-navigation-start";
export function startNavigationProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START_EVENT));
}

const SAFETY_MS = 12_000;

/**
 * Tenká lišta průběhu u horního okraje při přechodu na jinou stránku (klik na odkaz,
 * změna filtru). Spustí se kliknutím na interní odkaz nebo událostí z filtrů,
 * skončí, jakmile se změní cesta / query (tj. nová stránka je vykreslená).
 * Bez setState v efektu: stav drží klíč navigace, se kterým byl spuštěn —
 * jakmile se klíč změní, lišta se sama přepne do „hotovo“.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navKey = `${pathname}?${searchParams?.toString() ?? ""}`;
  const [started, setStarted] = useState<{ key: string; id: number } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const start = () => {
      const id = Date.now();
      setStarted({ key: navKey, id });
      if (timer) clearTimeout(timer);
      // Pojistka: když navigace nikdy nedoběhne (chyba, stejná URL), lištu schovat.
      timer = setTimeout(() => setStarted((s) => (s?.id === id ? null : s)), SAFETY_MS);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // jen kotva / stejná stránka
      start();
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener(START_EVENT, start);
      if (timer) clearTimeout(timer);
    };
  }, [navKey]);

  if (!started) return null;
  const running = started.key === navKey;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      style={{ top: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        key={`${started.id}-${running ? "run" : "done"}`}
        className={running ? "h-full bg-forest-light animate-nav-progress" : "h-full bg-forest-light animate-nav-done"}
      />
    </div>
  );
}
