import { NextResponse } from 'next/server'

let cached: { rate: number; ts: number; isFallback: boolean } | null = null
const CACHE_MS = 4 * 60 * 60 * 1000 // 4 hours

export async function GET() {
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json({
      eur_czk: cached.rate,
      fetched_at: new Date(cached.ts).toISOString(),
      source: cached.isFallback ? 'fallback' : 'frankfurter.app',
      is_fallback: cached.isFallback,
      cache_age_minutes: Math.round((Date.now() - cached.ts) / 60000),
    })
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=CZK', {
      next: { revalidate: 14400 },
    })
    const data = await res.json()
    const rate = data?.rates?.CZK as number
    if (rate) {
      cached = { rate, ts: Date.now(), isFallback: false }
      return NextResponse.json({
        eur_czk: rate,
        fetched_at: new Date(cached.ts).toISOString(),
        source: 'frankfurter.app',
        is_fallback: false,
        cache_age_minutes: 0,
      })
    }
  } catch {}

  const ts = Date.now()
  cached = { rate: 25.3, ts, isFallback: true }
  return NextResponse.json({
    eur_czk: 25.3,
    fetched_at: new Date(ts).toISOString(),
    source: 'fallback',
    is_fallback: true,
    cache_age_minutes: 0,
  })
}
