/** Rozdělení názvů položek jedné skupiny (ITEMGROUP_ID) na název produktu a názvy variant. Čistá funkce. */

const SEP = /[\s,;:/|–-]/;

export function splitVariantNames(names: string[]): { base: string; variants: string[] } {
  if (names.length < 2) return { base: names[0] ?? "", variants: names };
  // Společný začátek po znacích…
  let n = 0;
  const first = names[0];
  while (n < first.length && names.every((x) => x[n] === first[n])) n++;
  // …zkrácený na hranici slova (aby z „18W" / „25-30W" nezůstalo „T8 " + „1"/„2").
  if (n < first.length || names.some((x) => x.length > n)) {
    while (n > 0 && !(SEP.test(first[n - 1] ?? "") || names.every((x) => n === x.length || SEP.test(x[n] ?? "")))) n--;
  }
  const base = first.slice(0, n).replace(/[\s,;:/|–-]+$/, "").trim();
  const variants = names.map((x) => x.slice(n).replace(/^[\s,;:/|–-]+/, "").trim() || x);
  if (base.length < 3 || new Set(variants).size !== variants.length) return { base: first, variants: names };
  return { base, variants };
}
