// Aktuální kurz CZK/EUR z denního kurzovního lístku ČNB (cache 1 h).
// Sdíleno mezi /api/exchange-rate a admin akcemi (inline přepočet ceny).
const CNB_URL =
  "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt";

export type CnbRate = { rate: number; date: string };

export async function getCnbEurRate(): Promise<CnbRate | null> {
  try {
    const res = await fetch(CNB_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const date = lines[0]?.trim().split(" ")[0] ?? "";

    // Řádek: "EMU|euro|1|EUR|25,320"
    const eurLine = lines.find((l) => l.includes("|EUR|"));
    if (!eurLine) return null;
    const parts = eurLine.split("|");
    const amount = parseFloat(parts[2] ?? "1") || 1;
    const rate = parseFloat((parts[4] ?? "").replace(",", ".")) / amount;
    if (!Number.isFinite(rate) || rate <= 0) return null;

    return { rate: Math.round(rate * 1000) / 1000, date };
  } catch {
    return null;
  }
}
