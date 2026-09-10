"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Zpětná kompatibilita: dřív byl detail řady na /profi-osvetleni#slug
 * (a formulář na #pop-slug). Staré odkazy přesměrujeme na vlastní URL řady.
 */
export function LegacyHashRedirect({ slugs }: { slugs: string[] }) {
  const router = useRouter();
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(location.hash.replace(/^#/, ""));
      if (!h) return;
      const form = h.startsWith("pop-");
      const slug = form ? h.slice(4) : h;
      if (slugs.includes(slug)) {
        router.replace(`/kategorie/profi-osvetleni/${slug}${form ? "#poptavka" : ""}`);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [router, slugs]);
  return null;
}
