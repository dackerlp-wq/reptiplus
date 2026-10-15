/**
 * Dostupnost produktu / varianty pro obchod (čisté funkce, bez DB).
 * `supplier` = vlastní sklad prázdný, ale produkt má příznak „Skladem u dodavatele“
 * (dodání do 5 pracovních dnů) → lze objednat, sklad jde do záporu.
 */
export type Availability = "in" | "low" | "supplier" | "out";

export const LOW_STOCK_MAX = 5;
/** Dodání od dodavatele (pracovní dny) — text v messages `Product.supplierStock`, feedy DELIVERY_DATE. */
export const SUPPLIER_DELIVERY_DAYS = 5;

export function availabilityOf(stock: number, supplierStock: boolean): Availability {
  if (stock > LOW_STOCK_MAX) return "in";
  if (stock > 0) return "low";
  return supplierStock ? "supplier" : "out";
}

/** Lze přidat do košíku / objednat. */
export function canOrder(stock: number, supplierStock: boolean): boolean {
  return stock > 0 || supplierStock;
}

/** Horní limit množství v košíku (u dodavatelského zboží bez vlastního skladu rozumný strop). */
export const SUPPLIER_ORDER_CAP = 99;
export function orderCap(stock: number, supplierStock: boolean): number {
  if (stock > 0) return supplierStock ? Math.max(stock, SUPPLIER_ORDER_CAP) : stock;
  return supplierStock ? SUPPLIER_ORDER_CAP : 0;
}
