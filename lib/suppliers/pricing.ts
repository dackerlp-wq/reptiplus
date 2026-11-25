/** Výpočty cen z feedu dodavatele (čisté funkce — admin náhled v prohlížeči, import i testy). */

export type PriceRule =
  /** Doporučená prodejní cena dodavatele + DPH. */
  | { mode: "recommended" }
  /** Velkoobchodní cena + DPH + přirážka v %. */
  | { mode: "markup"; pct: number };

export type PricedItem = {
  vatRate: number | null;
  wholesaleCzk: number | null;
  wholesaleEur: number | null;
  retailCzk: number | null;
  retailEur: number | null;
};

const vatOf = (i: PricedItem) => 1 + (i.vatRate ?? 21) / 100;

/** Prodejní cena v minor units (Kč na celé koruny nahoru, € na 10 centů nahoru); null = nejde spočítat. */
export function sellPrice(i: PricedItem, rule: PriceRule, currency: "CZK" | "EUR"): number | null {
  const wholesale = currency === "CZK" ? i.wholesaleCzk : i.wholesaleEur;
  const retail = currency === "CZK" ? i.retailCzk : i.retailEur;
  const base =
    rule.mode === "recommended"
      ? retail != null
        ? retail * vatOf(i)
        : null
      : wholesale != null
        ? wholesale * vatOf(i) * (1 + rule.pct / 100)
        : null;
  if (base == null || base <= 0) return null;
  // Malá tolerance kvůli float chybám (216.96 × 1.12 = 242.99999…).
  return currency === "CZK" ? Math.ceil(base - 1e-6) * 100 : Math.ceil(base * 10 - 1e-6) * 10;
}

/**
 * Nákupní cena v haléřích pro `product.purchase_price_czk`: plátce DPH bez DPH (odpočte si ji),
 * neplátce včetně DPH (skutečný náklad) — stejně jako ji čte výpočet marže.
 */
export function purchasePrice(i: PricedItem, vatPayer: boolean): number | null {
  if (i.wholesaleCzk == null) return null;
  return Math.round(i.wholesaleCzk * (vatPayer ? 1 : vatOf(i)) * 100);
}

/** Marže v % z prodejní ceny (u plátce z ceny bez DPH). */
export function marginPct(sellMinor: number | null, purchaseMinor: number | null, vatRate: number | null, vatPayer: boolean) {
  if (!sellMinor || purchaseMinor == null) return null;
  const net = vatPayer ? sellMinor / (1 + (vatRate ?? 21) / 100) : sellMinor;
  return Math.round(((net - purchaseMinor) / net) * 1000) / 10;
}
