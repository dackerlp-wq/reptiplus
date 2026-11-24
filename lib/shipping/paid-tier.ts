import { shippingPriceFor, type ShippingPriceMethod } from "@/lib/shipping/price";

/**
 * Jakou cenu dopravy zákazník zaplatil — do limitu („light"), nad limit („heavy"), nebo nevíme (null:
 * doprava zdarma, metoda bez těžké ceny, cena mezitím změněná).
 */
export function paidTierOf(
  method: ShippingPriceMethod | null,
  paidShipping: number,
  currency: "CZK" | "EUR",
  country: string | null | undefined,
): "light" | "heavy" | null {
  if (!method || !method.heavy_from_kg || paidShipping <= 0) return null;
  const light = shippingPriceFor(method, 0, currency, country);
  const heavy = shippingPriceFor(method, Number(method.heavy_from_kg) + 1, currency, country);
  if (light === heavy) return null;
  if (paidShipping === light) return "light";
  if (paidShipping === heavy) return "heavy";
  return null;
}
