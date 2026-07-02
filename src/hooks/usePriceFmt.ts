'use client'
import { useLocale } from 'next-intl'
import { useEurRate } from './useEurRate'

export function usePriceFmt() {
  const locale = useLocale()
  const eurRate = useEurRate()
  const isEur = locale !== 'cs'

  const fmtEur = (czk: number): string => {
    if (!eurRate) return ''
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(czk / eurRate)
  }

  const fmtCzk = (czk: number): string =>
    new Intl.NumberFormat('cs-CZ', {
      style: 'currency', currency: 'CZK', minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(czk)

  // Primary price display
  const fmt = (czk: number): string => {
    if (isEur) return eurRate ? fmtEur(czk) : '…'
    return fmtCzk(czk)
  }

  // Secondary price (CS → EUR, EN/DE → nothing)
  const fmtSecondary = (czk: number): string | null => {
    if (!isEur) {
      // Czech: show EUR alongside Kč
      if (!eurRate) return null
      return fmtEur(czk)
    }
    // English / German: no secondary — EUR only
    return null
  }

  return { fmt, fmtSecondary, isEur, eurRate }
}
