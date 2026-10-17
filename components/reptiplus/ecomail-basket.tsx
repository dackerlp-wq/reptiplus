"use client";

import { useEffect } from "react";
import {
  identifyEcomail,
  trackEcomailBasket,
  trackEcomailProductView,
  whenEcomailReady,
  type EcomailBasketProduct,
  type EcomailViewedProduct,
} from "@/lib/ecomail/tracker";

/**
 * Pošle Ecomailu obsah košíku (stránka košíku) nebo prázdný košík a identitu
 * zákazníka (stránka objednávky). Bez souhlasu s marketingem je to no-op.
 */
export function EcomailBasket({ products, email }: { products: EcomailBasketProduct[]; email?: string | null }) {
  const key = JSON.stringify(products.map((p) => [p.productId, p.price]));
  useEffect(() => {
    whenEcomailReady(() => {
      if (email) identifyEcomail(email);
      trackEcomailBasket(products);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, email]);
  return null;
}

/** Zobrazení produktu pro Ecomail (automatizace „prohlížel, nekoupil“, doporučení). */
export function EcomailProductView({ product }: { product: EcomailViewedProduct }) {
  useEffect(() => {
    whenEcomailReady(() => trackEcomailProductView(product));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.productId]);
  return null;
}
