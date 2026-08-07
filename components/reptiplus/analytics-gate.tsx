"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getConsent } from "./cookie-consent";

/**
 * Načte měřicí skripty (GA4, Sklik retargeting, Meta Pixel) — ale výhradně
 * po uděleném souhlasu s cookies. GA4 spadá pod „analytics", Sklik a Meta
 * Pixel pod „marketing". Reaguje na změnu souhlasu (event rp-consent-changed)
 * a při navigaci v rámci SPA posílá pageview.
 */

const CHANGE_EVENT = "rp-consent-changed";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean };
    _fbq?: unknown;
    seznam_retargeting_id?: number;
  }
}

type Consent = { analytics: boolean; marketing: boolean };

/** Google Consent Mode v2 signály z kategorií souhlasu. */
function consentState(c: Consent) {
  return {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.marketing ? "granted" : "denied",
    ad_user_data: c.marketing ? "granted" : "denied",
    ad_personalization: c.marketing ? "granted" : "denied",
  } as const;
}

function loadGa4(id: string, c: Consent) {
  window.dataLayer = window.dataLayer || [];
  // DŮLEŽITÉ: gtag.js zpracuje jen položky typu `arguments`, nikoli obyčejné
  // pole. Proto musí funkce pushovat `arguments` (kanonický snippet), jinak
  // se příkazy config/consent/event ignorují a nic se neodesílá.
  const gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  } as Gtag;
  window.gtag = gtag;
  // Consent Mode v2: výchozí zamítnuto, hned aktualizováno dle souhlasu.
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  gtag("consent", "update", consentState(c));
  gtag("js", new Date());
  // Vercel/Next samo neposílá page_view při SPA navigaci → řešíme ručně níže.
  gtag("config", id, { send_page_view: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

function loadMetaPixel(id: string) {
  /* eslint-disable */
  // Standardní snippet Meta Pixelu.
  (function (f: any, b: any, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e);
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq!("init", id);
  window.fbq!("track", "PageView");
}

function loadSklik(id: string) {
  const num = Number(id);
  if (!Number.isFinite(num)) return;
  window.seznam_retargeting_id = num;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://c.seznam.cz/js/rc.js";
  document.head.appendChild(s);
}

export function AnalyticsGate({
  ga4,
  sklik,
  metaPixel,
}: {
  ga4?: string;
  sklik?: string;
  metaPixel?: string;
}) {
  const pathname = usePathname();
  const loaded = useRef({ ga4: false, pixel: false, sklik: false });

  useEffect(() => {
    const apply = () => {
      const c = getConsent();
      if (!c) return;
      if (c.analytics && ga4 && !loaded.current.ga4) {
        loadGa4(ga4, c);
        loaded.current.ga4 = true;
      } else if (loaded.current.ga4 && window.gtag) {
        // GA už běží → jen aktualizuj Consent Mode signály při změně souhlasu.
        window.gtag("consent", "update", consentState(c));
      }
      if (c.marketing && metaPixel && !loaded.current.pixel) {
        loadMetaPixel(metaPixel);
        loaded.current.pixel = true;
      }
      if (c.marketing && sklik && !loaded.current.sklik) {
        loadSklik(sklik);
        loaded.current.sklik = true;
      }
    };
    apply();
    window.addEventListener(CHANGE_EVENT, apply);
    return () => window.removeEventListener(CHANGE_EVENT, apply);
  }, [ga4, sklik, metaPixel]);

  // Pageview při SPA navigaci (první načtení řeší samotné snippety).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (loaded.current.ga4 && window.gtag && ga4) {
      window.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
      });
    }
    if (loaded.current.pixel && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, ga4]);

  return null;
}
