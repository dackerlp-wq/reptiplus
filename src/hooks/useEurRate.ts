'use client'
import { useState, useEffect } from 'react'

export type EurRateInfo = {
  rate: number
  fetchedAt: string
  source: string
  isFallback: boolean
  cacheAgeMinutes: number
}

let cachedInfo: EurRateInfo | null = null

export function useEurRate(): number | null {
  const info = useEurRateInfo()
  return info?.rate ?? null
}

export function useEurRateInfo(): EurRateInfo | null {
  const [info, setInfo] = useState<EurRateInfo | null>(cachedInfo)

  useEffect(() => {
    if (cachedInfo) { setInfo(cachedInfo); return }
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then(d => {
        cachedInfo = {
          rate: d.eur_czk,
          fetchedAt: d.fetched_at,
          source: d.source,
          isFallback: d.is_fallback,
          cacheAgeMinutes: d.cache_age_minutes,
        }
        setInfo(cachedInfo)
      })
      .catch(() => {})
  }, [])

  return info
}
