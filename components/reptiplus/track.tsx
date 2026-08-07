"use client";

import { useEffect } from "react";
import {
  trackViewItem,
  trackBeginCheckout,
  trackPurchase,
  type AnalyticsItem,
} from "@/lib/analytics/events";

/** Odešle view_item při zobrazení produktu. */
export function ViewItemTracker({
  item,
  currency,
}: {
  item: AnalyticsItem;
  currency: string;
}) {
  useEffect(() => {
    trackViewItem(item, currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return null;
}

/** Odešle begin_checkout při vstupu do pokladny. */
export function BeginCheckoutTracker({
  items,
  value,
  currency,
}: {
  items: AnalyticsItem[];
  value: number;
  currency: string;
}) {
  useEffect(() => {
    trackBeginCheckout(items, value, currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Odešle purchase na potvrzení objednávky (jednou na číslo objednávky). */
export function PurchaseTracker({
  order,
}: {
  order: {
    number: string;
    total: number;
    shipping?: number;
    currency: string;
    items: AnalyticsItem[];
  };
}) {
  useEffect(() => {
    trackPurchase(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.number]);
  return null;
}
