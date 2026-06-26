import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Locale } from './i18n'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = 'CZK', locale = 'cs-CZ'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string, locale: Locale = 'cs'): string {
  const localeMap: Record<Locale, string> = { cs: 'cs-CZ', en: 'en-GB', de: 'de-DE' }
  return new Date(dateStr).toLocaleDateString(localeMap[locale], {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function getProductName(product: { name_cs?: string; name_en?: string; name_de?: string; nameCs?: string; nameEn?: string; nameDe?: string }, locale: Locale) {
  const cs = product.name_cs || product.nameCs || ''
  const en = product.name_en || product.nameEn || cs
  const de = product.name_de || product.nameDe || cs
  const map: Record<Locale, string> = { cs, en, de }
  return map[locale] || cs
}

export function getProductDescription(product: { description_cs?: string | null; description_en?: string | null; description_de?: string | null; descriptionCs?: string | null; descriptionEn?: string | null; descriptionDe?: string | null }, locale: Locale) {
  const cs = product.description_cs ?? product.descriptionCs ?? ''
  const en = product.description_en ?? product.descriptionEn ?? cs
  const de = product.description_de ?? product.descriptionDe ?? cs
  const map: Record<Locale, string | null | undefined> = { cs, en, de }
  return map[locale] || cs || ''
}

export function getCategoryName(category: { name_cs?: string; name_en?: string; name_de?: string; nameCs?: string; nameEn?: string; nameDe?: string }, locale: Locale) {
  const cs = category.name_cs || category.nameCs || ''
  const en = category.name_en || category.nameEn || cs
  const de = category.name_de || category.nameDe || cs
  const map: Record<Locale, string> = { cs, en, de }
  return map[locale] || cs
}
