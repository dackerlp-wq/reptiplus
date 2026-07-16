import { NextResponse } from "next/server";

// Aktuální kurz CZK/EUR z denního kurzovního lístku ČNB (cache 1 h).
const CNB_URL =
  "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt";

export async function GET() {
  try {
    const res = await fetch(CNB_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("CNB fetch failed");
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    const date = lines[0]?.trim().split(" ")[0] ?? "";

    // Řádek: "EMU|euro|1|EUR|25,320"
    const eurLine = lines.find((l) => l.includes("|EUR|"));
    if (!eurLine) throw new Error("EUR not found");
    const parts = eurLine.split("|");
    const amount = parseFloat(parts[2] ?? "1") || 1;
    const rate = parseFloat((parts[4] ?? "").replace(",", ".")) / amount;
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid rate");

    return NextResponse.json({ rate: Math.round(rate * 1000) / 1000, date });
  } catch {
    return NextResponse.json({ error: "RATE_UNAVAILABLE" }, { status: 502 });
  }
}
