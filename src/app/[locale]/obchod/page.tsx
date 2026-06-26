'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import ProductCard from '@/components/shop/ProductCard'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const CATEGORIES = [
  { slug: 'osvetleni', cs: 'Osvětlení', en: 'Lighting', de: 'Beleuchtung' },
  { slug: 'vyhrivani', cs: 'Vyhřívání', en: 'Heating', de: 'Heizung' },
  { slug: 'terraria', cs: 'Terária', en: 'Terrariums', de: 'Terrarien' },
  { slug: 'krmivo', cs: 'Krmivo', en: 'Food', de: 'Futter' },
  { slug: 'vitaminy', cs: 'Vitamíny & doplňky', en: 'Vitamins & Supplements', de: 'Vitamine' },
  { slug: 'dekorace', cs: 'Dekorace', en: 'Decoration', de: 'Dekoration' },
  { slug: 'doplnky', cs: 'Doplňky', en: 'Accessories', de: 'Zubehör' },
]

import type { Product } from '@/components/shop/ProductCard'

export default function ShopPage() {
  const t = useTranslations('shop')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)

  const category = searchParams.get('kategorie') || ''
  const search = searchParams.get('hledat') || ''
  const sort = searchParams.get('seradit') || 'newest'
  const filter = searchParams.get('filtr') || ''

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('kategorie', category)
    if (search) params.set('hledat', search)
    if (sort) params.set('seradit', sort)
    if (filter) params.set('filtr', filter)
    params.set('strana', String(page))

    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(data.products || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [category, search, sort, filter, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value); else p.delete(key)
    router.push(`?${p}`)
  }

  const getCatName = (cat: typeof CATEGORIES[0]) => {
    const map: Record<string, string> = { cs: cat.cs, en: cat.en, de: cat.de }
    return map[locale] || cat.cs
  }

  const activeCategory = CATEGORIES.find(c => c.slug === category)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">
            {activeCategory ? getCatName(activeCategory) : t('title')}
          </h1>
          {!loading && <p className="text-sm text-gray-soft mt-1">{total} produktů</p>}
        </div>

        <div className="flex gap-2 items-center">
          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={e => setParam('seradit', e.target.value)}
              className="appearance-none bg-white border border-cream-dark rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:border-forest"
            >
              <option value="newest">{t('sort_newest')}</option>
              <option value="price_asc">{t('sort_price_asc')}</option>
              <option value="price_desc">{t('sort_price_desc')}</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 pointer-events-none text-gray-soft" />
          </div>

          <Button variant="outline" size="sm" onClick={() => setFilterOpen(!filterOpen)}>
            <SlidersHorizontal className="w-4 h-4" />
            {t('filter')}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className={`${filterOpen ? 'block' : 'hidden'} md:block w-56 shrink-0`}>
          <div className="bg-white rounded-xl border border-cream-dark p-4 sticky top-24">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{t('category')}</h3>
              {category && (
                <button onClick={() => setParam('kategorie', '')} className="text-gray-soft hover:text-charcoal">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setParam('kategorie', '')}
                  className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${!category ? 'bg-forest text-white' : 'hover:bg-sage/30'}`}
                >
                  {t('all_categories')}
                </button>
              </li>
              {CATEGORIES.map(cat => (
                <li key={cat.slug}>
                  <button
                    onClick={() => setParam('kategorie', cat.slug)}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${category === cat.slug ? 'bg-forest text-white' : 'hover:bg-sage/30'}`}
                  >
                    {getCatName(cat)}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-4 border-t border-cream-dark">
              <h3 className="font-semibold text-sm mb-3">Filtr</h3>
              <div className="space-y-1.5">
                {[
                  { key: 'novinka', label: '✨ Novinky' },
                  { key: 'sleva', label: '🏷️ Ve slevě' },
                  { key: 'doporucene', label: '⭐ Doporučené' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setParam('filtr', filter === f.key ? '' : f.key)}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${filter === f.key ? 'bg-gold text-charcoal font-medium' : 'hover:bg-sage/30'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {/* Active filters */}
          {(category || search || filter) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {category && activeCategory && (
                <span className="inline-flex items-center gap-1 bg-forest/10 text-forest text-xs px-3 py-1 rounded-full">
                  {getCatName(activeCategory)}
                  <button onClick={() => setParam('kategorie', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 bg-forest/10 text-forest text-xs px-3 py-1 rounded-full">
                  Hledat: {search}
                  <button onClick={() => setParam('hledat', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filter && (
                <span className="inline-flex items-center gap-1 bg-gold/20 text-earth text-xs px-3 py-1 rounded-full">
                  {filter}
                  <button onClick={() => setParam('filtr', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-cream-dark animate-pulse">
                  <div className="aspect-square bg-cream-dark rounded-t-xl" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-cream-dark rounded w-3/4" />
                    <div className="h-4 bg-cream-dark rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-soft">
              <p className="text-lg">{t('no_products')}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push(`/${locale}/obchod`)}>
                Zobrazit vše
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} locale={locale} />
                ))}
              </div>

              {/* Pagination */}
              {total > 20 && (
                <div className="flex justify-center gap-2 mt-8">
                  {page > 1 && (
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)}>
                      ← Předchozí
                    </Button>
                  )}
                  <span className="px-4 py-2 text-sm text-gray-soft">
                    Strana {page} z {Math.ceil(total / 20)}
                  </span>
                  {page < Math.ceil(total / 20) && (
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>
                      Další →
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
