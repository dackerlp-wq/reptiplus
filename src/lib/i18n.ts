export const locales = ['cs', 'en', 'de'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'cs'

export function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split('/')[1]
  if (locales.includes(segment as Locale)) return segment as Locale
  return defaultLocale
}
