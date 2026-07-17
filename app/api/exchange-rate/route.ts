import { NextResponse } from "next/server";
import { getCnbEurRate } from "@/lib/exchange-rate";

// Aktuální kurz CZK/EUR z denního kurzovního lístku ČNB (cache 1 h).
export async function GET() {
  const data = await getCnbEurRate();
  if (!data) {
    return NextResponse.json({ error: "RATE_UNAVAILABLE" }, { status: 502 });
  }
  return NextResponse.json(data);
}
