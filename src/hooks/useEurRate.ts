'use client'
import { useState, useEffect } from 'react'

let cachedRate: number | null = null

export function useEurRate(): number | null {
  const [rate, setRate] = useState<number | null>(cachedRate)

  useEffect(() => {
    if (cachedRate) { setRate(cachedRate); return }
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then(d => { cachedRate = d.eur_czk; setRate(d.eur_czk) })
      .catch(() => {})
  }, [])

  return rate
}
