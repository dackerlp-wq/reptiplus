/** Výpočty marže (bez server-only, používá je i klientský formulář produktu). */

/** Marže z prodejní ceny (u plátce DPH bez DPH) a nákupní ceny; čistá funkce kvůli testům. */
export function marginOf(priceKc: number | null, purchaseKc: number | null, vatRate: number, vatPayer: boolean) {
  if (priceKc == null || priceKc <= 0 || purchaseKc == null) return null;
  const net = vatPayer ? priceKc / (1 + vatRate / 100) : priceKc;
  const margin = net - purchaseKc;
  return { net, margin, pct: Math.round((margin / net) * 1000) / 10, markup: purchaseKc > 0 ? Math.round((margin / purchaseKc) * 1000) / 10 : null };
}
