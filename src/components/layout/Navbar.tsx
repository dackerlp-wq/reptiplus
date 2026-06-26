'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ShoppingCart, User, Search, Menu, X, ChevronDown, Globe } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { cn } from '@/lib/utils'

const categories = [
  { slug: 'osvetleni', cs: 'Osvětlení', en: 'Lighting', de: 'Beleuchtung' },
  { slug: 'vyhrivani', cs: 'Vyhřívání', en: 'Heating', de: 'Heizung' },
  { slug: 'terraria', cs: 'Terária', en: 'Terrariums', de: 'Terrarien' },
  { slug: 'krmivo', cs: 'Krmivo', en: 'Food', de: 'Futter' },
  { slug: 'vitaminy', cs: 'Vitamíny & doplňky', en: 'Vitamins & Supplements', de: 'Vitamine & Ergänzungen' },
  { slug: 'dekorace', cs: 'Dekorace', en: 'Decoration', de: 'Dekoration' },
  { slug: 'doplnky', cs: 'Doplňky', en: 'Accessories', de: 'Zubehör' },
]

const localeLabels: Record<string, string> = { cs: 'CS', en: 'EN', de: 'DE' }

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const cartCount = useCartStore(s => s.itemCount())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [catDropdown, setCatDropdown] = useState(false)
  const [langDropdown, setLangDropdown] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const getCatName = (cat: typeof categories[0]) => {
    const map: Record<string, string> = { cs: cat.cs, en: cat.en, de: cat.de }
    return map[locale] || cat.cs
  }

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/')
    segments[1] = newLocale
    return segments.join('/')
  }

  return (
    <>
      {/* Top bar */}
      <div className="bg-forest text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>📦 Doprava zdarma nad 2 000 Kč</span>
          <span>info@reptiplus.cz | +420 123 456 789</span>
        </div>
      </div>

      {/* Main navbar */}
      <header className={cn(
        'sticky top-0 z-50 bg-white/95 backdrop-blur-sm transition-shadow duration-200',
        scrolled && 'shadow-md'
      )}>
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-forest flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="font-bold text-xl text-forest tracking-tight">Reptiplus</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1 flex-1 mx-4">
              <Link href={`/${locale}/obchod`} className="px-3 py-2 text-sm font-medium hover:text-forest transition-colors rounded-lg hover:bg-sage/30">
                {t('shop')}
              </Link>

              {/* Categories dropdown */}
              <div className="relative" onMouseEnter={() => setCatDropdown(true)} onMouseLeave={() => setCatDropdown(false)}>
                <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium hover:text-forest transition-colors rounded-lg hover:bg-sage/30">
                  {t('categories')}
                  <ChevronDown className={cn('w-4 h-4 transition-transform', catDropdown && 'rotate-180')} />
                </button>
                {catDropdown && (
                  <div className="absolute top-full left-0 bg-white rounded-xl shadow-xl border border-cream-dark w-64 py-2 z-50">
                    {categories.map(cat => (
                      <Link
                        key={cat.slug}
                        href={`/${locale}/obchod?kategorie=${cat.slug}`}
                        className="block px-4 py-2.5 text-sm hover:bg-sage/30 hover:text-forest transition-colors"
                        onClick={() => setCatDropdown(false)}
                      >
                        {getCatName(cat)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link href={`/${locale}/blog`} className="px-3 py-2 text-sm font-medium hover:text-forest transition-colors rounded-lg hover:bg-sage/30">
                {t('blog')}
              </Link>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Search */}
              {searchOpen ? (
                <div className="flex items-center gap-2 bg-cream-dark rounded-lg px-3 py-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        window.location.href = `/${locale}/obchod?hledat=${encodeURIComponent(searchQuery)}`
                      }
                      if (e.key === 'Escape') setSearchOpen(false)
                    }}
                    placeholder={t('search')}
                    className="bg-transparent text-sm outline-none w-40 placeholder-gray-soft"
                  />
                  <button onClick={() => setSearchOpen(false)}>
                    <X className="w-4 h-4 text-gray-soft" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg hover:bg-sage/30 text-charcoal hover:text-forest transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Language */}
              <div className="relative hidden md:block" onMouseEnter={() => setLangDropdown(true)} onMouseLeave={() => setLangDropdown(false)}>
                <button className="flex items-center gap-1 p-2 rounded-lg hover:bg-sage/30 text-sm font-medium text-charcoal hover:text-forest transition-colors">
                  <Globe className="w-4 h-4" />
                  {localeLabels[locale]}
                </button>
                {langDropdown && (
                  <div className="absolute top-full right-0 bg-white rounded-xl shadow-xl border border-cream-dark w-28 py-2 z-50">
                    {Object.entries(localeLabels).map(([loc, label]) => (
                      <Link
                        key={loc}
                        href={switchLocale(loc)}
                        className={cn(
                          'block px-4 py-2 text-sm hover:bg-sage/30 transition-colors',
                          loc === locale && 'text-forest font-semibold'
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Account */}
              <Link href={`/${locale}/ucet`} className="p-2 rounded-lg hover:bg-sage/30 text-charcoal hover:text-forest transition-colors">
                <User className="w-5 h-5" />
              </Link>

              {/* Cart */}
              <Link href={`/${locale}/kosik`} className="relative p-2 rounded-lg hover:bg-sage/30 text-charcoal hover:text-forest transition-colors">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gold text-charcoal text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-sage/30 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-cream-dark px-4 py-4 space-y-1">
            <Link href={`/${locale}/obchod`} className="block px-3 py-2.5 text-sm font-medium hover:bg-sage/30 rounded-lg" onClick={() => setMobileOpen(false)}>
              {t('shop')}
            </Link>
            <div className="px-3 py-1 text-xs font-semibold text-gray-soft uppercase tracking-wider">{t('categories')}</div>
            {categories.map(cat => (
              <Link
                key={cat.slug}
                href={`/${locale}/obchod?kategorie=${cat.slug}`}
                className="block px-6 py-2 text-sm hover:bg-sage/30 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {getCatName(cat)}
              </Link>
            ))}
            <Link href={`/${locale}/blog`} className="block px-3 py-2.5 text-sm font-medium hover:bg-sage/30 rounded-lg" onClick={() => setMobileOpen(false)}>
              {t('blog')}
            </Link>
            <div className="flex gap-2 pt-2 border-t border-cream-dark">
              {Object.entries(localeLabels).map(([loc, label]) => (
                <Link
                  key={loc}
                  href={switchLocale(loc)}
                  className={cn('px-3 py-1.5 text-sm rounded-lg', loc === locale ? 'bg-forest text-white' : 'hover:bg-sage/30')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
