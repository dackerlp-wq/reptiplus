'use client'
import { useLocale } from 'next-intl'
import { useEurRate } from './useEurRate'

export function usePriceFmt() {
  const locale = useLocale()
  const eurRate = useEurRate()
  const isEur = locale !== 'cs'

  const fmt = (czk: number): string => {
    if (isEur && eurRate) {
      const eur = czk / eurRate
      return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(eur)
    }
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(czk)
  }

  // Secondary display: when EUR is primary, show CZK in small; when CZK primary, show EUR
  const fmtSecondary = (czk: number): string | null => {
    if (isEur) {
      return new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(czk)
    }
    if (!eurRate) return null
    const eur = czk / eurRate
    return `≈ ${new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(eur)} €`
  }

  return { fmt, fmtSecondary, isEur, eurRate }
}
