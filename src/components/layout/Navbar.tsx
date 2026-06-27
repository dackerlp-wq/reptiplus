'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ShoppingCart, User, Search, Menu, X, ChevronDown, Globe, ChevronRight, ArrowRight } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { cn } from '@/lib/utils'
import { usePriceFmt } from '@/hooks/usePriceFmt'

type Category = {
  id: string
  slug: string
  name_cs: string
  name_en: string
  name_de: string
  parent_id: string | null
  sort_order: number
  children: Category[]
}

type FeaturedProduct = {
  id: string
  slug: string
  nameCs: string
  nameEn: string
  nameDe: string
  price: number
  images: string | null
}

const localeLabels: Record<string, string> = { cs: 'CS', en: 'EN', de: 'DE' }

function buildTree(cats: Omit<Category, 'children'>[]): Category[] {
  const map = new Map<string, Category>()
  cats.forEach(c => map.set(c.id, { ...c, children: [] }))
  const roots: Category[] = []
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  roots.forEach(r => r.children.sort((a, b) => a.sort_order - b.sort_order))
  return roots.sort((a, b) => a.sort_order - b.sort_order)
}

export default function Navbar({ locale }: { locale: string }) {
  const t = useTranslations('nav')
  const tShop = useTranslations('shop')
  const pathname = usePathname()
  const router = useRouter()
  const cartCount = useCartStore(s => s.itemCount())
  const { fmt } = usePriceFmt()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [megaOpen, setMegaOpen] = useState(false)
  const [langDropdown, setLangDropdown] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [featuredProduct, setFeaturedProduct] = useState<FeaturedProduct | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)

  const megaRef = useRef<HTMLDivElement>(null)
  const megaTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (d.categories || []).map((c: any) => ({
          id: c.id, slug: c.slug,
          name_cs: c.nameCs || c.name_cs,
          name_en: c.nameEn || c.name_en,
          name_de: c.nameDe || c.name_de,
          parent_id: c.parentId ?? c.parent_id ?? null,
          sort_order: c.sortOrder ?? c.sort_order ?? 0,
        }))
        setCategories(buildTree(raw))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/products?filtr=doporucene&strana=1')
      .then(r => r.json())
      .then(d => {
        const p = (d.products || [])[0]
        if (p) setFeaturedProduct(p)
      })
      .catch(() => {})
  }, [])

  const getCatName = (cat: Category) => {
    const map: Record<string, string> = { cs: cat.name_cs, en: cat.name_en, de: cat.name_de }
    return map[locale] || cat.name_cs
  }

  const getFeaturedName = (p: FeaturedProduct) => {
    const map: Record<string, string> = { cs: p.nameCs, en: p.nameEn, de: p.nameDe }
    return map[locale] || p.nameCs
  }

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/')
    segments[1] = newLocale
    return segments.join('/')
  }

  const openMega = () => {
    if (megaTimeout.current) clearTimeout(megaTimeout.current)
    setMegaOpen(true)
  }

  const closeMega = () => {
    megaTimeout.current = setTimeout(() => setMegaOpen(false), 120)
  }

  const featuredImages = featuredProduct ? JSON.parse(featuredProduct.images || '[]') as string[] : []
  const featuredImage = featuredImages[0] || null

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
              <Link
                href={`/${locale}/obchod`}
                className="px-3 py-2 text-sm font-medium hover:text-forest transition-colors rounded-lg hover:bg-sage/30"
              >
                {t('shop')}
              </Link>

              {/* Mega menu trigger */}
              <div
                ref={megaRef}
                className="relative"
                onMouseEnter={openMega}
                onMouseLeave={closeMega}
              >
                <button
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-sage/30',
                    megaOpen ? 'text-forest bg-sage/30' : 'hover:text-forest'
                  )}
                >
                  {t('categories')}
                  <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', megaOpen && 'rotate-180')} />
                </button>

                {/* Mega menu panel — positioned fixed to span full width below navbar */}
                {megaOpen && categories.length > 0 && (
                  <div
                    className="fixed left-0 right-0 z-40 bg-white border-t border-b border-cream-dark shadow-2xl"
                    style={{ top: megaRef.current ? megaRef.current.closest('header')!.getBoundingClientRect().bottom + 'px' : '88px' }}
                    onMouseEnter={openMega}
                    onMouseLeave={closeMega}
                  >
                    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
                      {/* Category columns */}
                      <div className="flex-1 grid gap-x-8 gap-y-6"
                        style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)` }}
                      >
                        {categories.map(root => (
                          <div key={root.id}>
                            <Link
                              href={`/${locale}/obchod?kategorie=${root.slug}`}
                              onClick={() => setMegaOpen(false)}
                              className="block group mb-2"
                            >
                              <span className="font-bold text-sm text-charcoal group-hover:text-forest transition-colors">
                                {getCatName(root)}
                              </span>
                              <div className="h-0.5 bg-forest/20 mt-1 group-hover:bg-forest transition-colors" />
                            </Link>
                            <ul className="space-y-1">
                              {root.children.map(child => (
                                <li key={child.id}>
                                  <Link
                                    href={`/${locale}/obchod?kategorie=${child.slug}`}
                                    onClick={() => setMegaOpen(false)}
                                    className="flex items-center gap-1.5 text-sm text-gray-soft hover:text-forest transition-colors py-0.5 group/child"
                                  >
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover/child:opacity-100 transition-opacity shrink-0" />
                                    {getCatName(child)}
                                  </Link>
                                </li>
                              ))}
                              {root.children.length === 0 && (
                                <li>
                                  <Link
                                    href={`/${locale}/obchod?kategorie=${root.slug}`}
                                    onClick={() => setMegaOpen(false)}
                                    className="text-xs text-gray-soft hover:text-forest transition-colors"
                                  >
                                    {tShop('all_categories')} →
                                  </Link>
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {/* Right: featured product + all link */}
                      <div className="w-52 shrink-0 border-l border-cream-dark pl-6 flex flex-col gap-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-forest/60" style={{ fontFamily: 'var(--font-mono)' }}>
                          Doporučujeme
                        </p>
                        {featuredProduct ? (
                          <Link
                            href={`/${locale}/produkt/${featuredProduct.slug}`}
                            onClick={() => setMegaOpen(false)}
                            className="group/fp block"
                          >
                            <div className="relative aspect-square rounded-xl overflow-hidden bg-cream border border-cream-dark mb-2 group-hover/fp:border-forest/30 transition-colors">
                              {featuredImage ? (
                                <Image
                                  src={featuredImage}
                                  alt={getFeaturedName(featuredProduct)}
                                  fill
                                  className="object-contain p-3 group-hover/fp:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-soft text-xs">
                                  Bez obrázku
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-charcoal group-hover/fp:text-forest transition-colors line-clamp-2 mb-1">
                              {getFeaturedName(featuredProduct)}
                            </p>
                            <p className="text-sm font-bold text-forest">{fmt(featuredProduct.price)}</p>
                          </Link>
                        ) : (
                          <div className="aspect-square rounded-xl bg-cream border border-cream-dark animate-pulse" />
                        )}

                        <Link
                          href={`/${locale}/obchod`}
                          onClick={() => setMegaOpen(false)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-dark transition-colors mt-auto"
                        >
                          Zobrazit celý obchod <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href={`/${locale}/blog`}
                className="px-3 py-2 text-sm font-medium hover:text-forest transition-colors rounded-lg hover:bg-sage/30"
              >
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
                        router.push(`/${locale}/obchod?hledat=${encodeURIComponent(searchQuery)}`)
                        setSearchOpen(false)
                        setSearchQuery('')
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
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg hover:bg-sage/30 text-charcoal hover:text-forest transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Language */}
              <div
                className="relative hidden md:block"
                onMouseEnter={() => setLangDropdown(true)}
                onMouseLeave={() => setLangDropdown(false)}
              >
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
              <Link
                href={`/${locale}/kosik`}
                className="relative p-2 rounded-lg hover:bg-sage/30 text-charcoal hover:text-forest transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-gold text-charcoal text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu toggle */}
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
          <div className="md:hidden bg-white border-t border-cream-dark max-h-[75vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-0.5">
              <Link
                href={`/${locale}/obchod`}
                className="block px-3 py-2.5 text-sm font-medium hover:bg-sage/30 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {t('shop')}
              </Link>

              {/* Mobile categories tree */}
              {categories.map(root => (
                <div key={root.id}>
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium hover:bg-sage/30 rounded-lg"
                    onClick={() => setMobileExpanded(mobileExpanded === root.id ? null : root.id)}
                  >
                    <span>{getCatName(root)}</span>
                    {root.children.length > 0 && (
                      <ChevronDown className={cn('w-4 h-4 text-gray-soft transition-transform', mobileExpanded === root.id && 'rotate-180')} />
                    )}
                  </button>
                  {/* Quick link to root category */}
                  {mobileExpanded === root.id && (
                    <div className="ml-3 border-l-2 border-sage pl-2 space-y-0.5 mb-1">
                      <Link
                        href={`/${locale}/obchod?kategorie=${root.slug}`}
                        className="block px-3 py-1.5 text-xs font-semibold text-forest hover:bg-sage/30 rounded-lg"
                        onClick={() => setMobileOpen(false)}
                      >
                        Vše v {getCatName(root)} →
                      </Link>
                      {root.children.map(child => (
                        <Link
                          key={child.id}
                          href={`/${locale}/obchod?kategorie=${child.slug}`}
                          className="block px-3 py-1.5 text-sm text-gray-soft hover:text-forest hover:bg-sage/30 rounded-lg"
                          onClick={() => setMobileOpen(false)}
                        >
                          {getCatName(child)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <Link
                href={`/${locale}/blog`}
                className="block px-3 py-2.5 text-sm font-medium hover:bg-sage/30 rounded-lg"
                onClick={() => setMobileOpen(false)}
              >
                {t('blog')}
              </Link>

              <div className="flex gap-2 pt-3 mt-2 border-t border-cream-dark">
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
          </div>
        )}
      </header>
    </>
  )
}
