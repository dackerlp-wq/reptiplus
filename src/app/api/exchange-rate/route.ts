import { NextResponse } from 'next/server'

let cached: { rate: number; ts: number } | null = null
const CACHE_MS = 4 * 60 * 60 * 1000 // 4 hours

export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json({ eur_czk: cached.rate })
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK', {
      next: { revalidate: 14400 },
    })
    const data = await res.json()
    const rate = data?.rates?.CZK as number
    if (rate) {
      cached = { rate, ts: Date.now() }
      return NextResponse.json({ eur_czk: rate })
    }
  } catch {}

  // Fallback fixed rate
  return NextResponse.json({ eur_czk: 25.3 })
}
