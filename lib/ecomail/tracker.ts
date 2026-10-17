"use client";

/**
 * Ecomail sledování webu (ecotrack, Snowplow) — načítá se jen po souhlasu
 * s marketingovými cookies (AnalyticsGate). Identifikace návštěvníka: parametr
 * `ecmid` v odkazech z kampaní, nebo `identifyEcomail(email)` po objednávce.
 * Košík se posílá celý (Ecomail chce i prázdný, jinak pošle „opuštěný košík“).
 * Dokumentace: support.ecomail.cz → Implementace trackovacího kódu / Sledování obsahu košíku.
 */

const LOADER_SRC = "https://d70shl7vidtft.cloudfront.net/ecmtr-2.4.2.js";
const COLLECTOR = "d2dpiwfhf3tz0r.cloudfront.net";

type Ecotrack = ((...args: unknown[]) => void) & { q?: unknown[] };
declare global {
  interface Window {
    ecotrack?: Ecotrack;
    GlobalSnowplowNamespace?: string[];
  }
}

let loadedAppId: string | null = null;

/** Načte skript a založí tracker (jednou). */
export function loadEcomailTracker(appId: string): void {
  if (typeof window === "undefined" || !appId || loadedAppId) return;
  loadedAppId = appId;
  window.GlobalSnowplowNamespace = window.GlobalSnowplowNamespace || [];
  window.GlobalSnowplowNamespace.push("ecotrack");
  const fn = function (this: unknown) {
    // eslint-disable-next-line prefer-rest-params
    (fn.q = fn.q || []).push(arguments);
  } as Ecotrack;
  fn.q = fn.q || [];
  window.ecotrack = fn;
  const s = document.createElement("script");
  s.async = true;
  s.src = LOADER_SRC;
  document.head.appendChild(s);
  window.ecotrack("newTracker", "cf", COLLECTOR, { appId });
  window.ecotrack("setUserIdFromLocation", "ecmid");
  window.ecotrack("trackPageView");
}

export function ecomailLoaded(): boolean {
  return typeof window !== "undefined" && !!window.ecotrack;
}

export function trackEcomailPageView(): void {
  window.ecotrack?.("trackPageView");
}

/** Spáruje návštěvníka s kontaktem (po objednávce / přihlášení). */
export function identifyEcomail(email: string): void {
  if (!email) return;
  window.ecotrack?.("setUserId", email);
}

export type EcomailBasketProduct = {
  productId: string;
  name: string;
  /** Cena za kus v hlavních jednotkách (Kč / €). */
  price: number;
  url: string;
  img_url?: string;
  description?: string;
};

/** Obsah košíku pro automatizaci „opuštěný košík“ (max 10 položek kvůli velikosti cookie). */
export function trackEcomailBasket(products: EcomailBasketProduct[]): void {
  window.ecotrack?.("trackUnstructEvent", {
    schema: "",
    data: { action: "Basket", products: products.slice(0, 10) },
  });
}

/** Počká, než se tracker (po souhlasu) načte; bez souhlasu nic neudělá. */
export function whenEcomailReady(fn: () => void, tries = 20): void {
  if (typeof window === "undefined") return;
  if (window.ecotrack) {
    fn();
    return;
  }
  if (tries <= 0) return;
  window.setTimeout(() => whenEcomailReady(fn, tries - 1), 250);
}
