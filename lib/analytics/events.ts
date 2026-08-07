"use client";

/**
 * E-commerce události pro GA4 (`gtag`) a Meta Pixel (`fbq`).
 * Volají se z klientských komponent; pokud měřák není načtený (chybí souhlas),
 * jsou to no-opy. `whenReady` řeší pořadí React efektů — trackery ve stránce
 * se mountnou dřív než <AnalyticsGate/> v layoutu, proto krátce počkáme,
 * než `gtag`/`fbq` existují.
 */

export type AnalyticsItem = {
  id: string;
  name: string;
  price: number; // minor units (haléře / centy)
  qty?: number;
  brand?: string;
  category?: string;
  variant?: string;
};

const major = (minor: number) => Math.round(minor) / 100;

function whenReady(fn: () => void, tries = 20) {
  if (typeof window === "undefined") return;
  if (window.gtag || window.fbq) {
    fn();
    return;
  }
  if (tries <= 0) return;
  window.setTimeout(() => whenReady(fn, tries - 1), 150);
}

function gaItem(i: AnalyticsItem) {
  return {
    item_id: i.id,
    item_name: i.name,
    price: major(i.price),
    quantity: i.qty ?? 1,
    ...(i.brand ? { item_brand: i.brand } : {}),
    ...(i.category ? { item_category: i.category } : {}),
    ...(i.variant ? { item_variant: i.variant } : {}),
  };
}

export function trackViewItem(item: AnalyticsItem, currency: string) {
  whenReady(() => {
    window.gtag?.("event", "view_item", {
      currency,
      value: major(item.price),
      items: [gaItem(item)],
    });
    window.fbq?.("track", "ViewContent", {
      content_ids: [item.id],
      content_type: "product",
      content_name: item.name,
      value: major(item.price),
      currency,
    });
  });
}

export function trackAddToCart(item: AnalyticsItem, currency: string) {
  const value = major(item.price) * (item.qty ?? 1);
  whenReady(() => {
    window.gtag?.("event", "add_to_cart", {
      currency,
      value,
      items: [gaItem(item)],
    });
    window.fbq?.("track", "AddToCart", {
      content_ids: [item.id],
      content_type: "product",
      content_name: item.name,
      value,
      currency,
    });
  });
}

export function trackBeginCheckout(
  items: AnalyticsItem[],
  value: number,
  currency: string,
) {
  whenReady(() => {
    window.gtag?.("event", "begin_checkout", {
      currency,
      value: major(value),
      items: items.map(gaItem),
    });
    window.fbq?.("track", "InitiateCheckout", {
      content_ids: items.map((i) => i.id),
      content_type: "product",
      num_items: items.reduce((s, i) => s + (i.qty ?? 1), 0),
      value: major(value),
      currency,
    });
  });
}

export function trackPurchase(o: {
  number: string;
  total: number;
  shipping?: number;
  currency: string;
  items: AnalyticsItem[];
}) {
  const key = `rp_purchase_${o.number}`;
  try {
    if (sessionStorage.getItem(key)) return; // už změřeno (refresh/zpět)
  } catch {
    /* soukromý režim bez storage → případné dvojí měření akceptujeme */
  }
  whenReady(() => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    window.gtag?.("event", "purchase", {
      transaction_id: o.number,
      value: major(o.total),
      currency: o.currency,
      ...(o.shipping ? { shipping: major(o.shipping) } : {}),
      items: o.items.map(gaItem),
    });
    window.fbq?.("track", "Purchase", {
      value: major(o.total),
      currency: o.currency,
      content_type: "product",
      contents: o.items.map((i) => ({ id: i.id, quantity: i.qty ?? 1 })),
    });
  });
}
