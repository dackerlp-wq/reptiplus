/**
 * Variabilní symbol pro platbu objednávky převodem. Číslo objednávky
 * (RPyyMMdd-XXXX) není číselné, VS smí mít max. 10 číslic → datum (6)
 * + 4 číslice odvozené z náhodné části. Do zprávy pro příjemce jde navíc
 * celé číslo objednávky, takže platbu lze vždy dohledat.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function variableSymbolForOrder(orderNumber: string): string {
  const m = orderNumber.match(/^RP(\d{6})-([A-Z2-9]{4})$/i);
  if (!m) return orderNumber.replace(/\D/g, "").slice(0, 10);
  let v = 0;
  for (const ch of m[2].toUpperCase()) v = v * 32 + Math.max(0, ALPHABET.indexOf(ch));
  return `${m[1]}${String(v % 10000).padStart(4, "0")}`;
}
