'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import ProductCard from '@/components/shop/ProductCard'
import { SlidersHorizontal, X, ChevronDown, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Product } from '@/components/shop/ProductCard'

type Category = { id: string; slug: string; name_cs: string; name_en: string; name_de: string; parent_id: string | null; sort_order: number }

export default function ShopPage() {
  const t = useTranslations('shop')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('hledat') || '')

  const category = searchParams.get('kategorie') || ''
  const search = searchParams.get('hledat') || ''
  const sort = searchParams.get('seradit') || 'newest'
  const filter = searchParams.get('filtr') || ''
  const minParam = searchParams.get('min') || ''
  const maxParam = searchParams.get('max') || ''

  // Sync price inputs with URL params on load
  useEffect(() => {
    setMinPrice(minParam)
    setMaxPrice(maxParam)
  }, [minParam, maxParam])

  // Sync search input with URL params
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (d.categories || []).map((c: any) => ({
        id: c.id, slug: c.slug, name_cs: c.nameCs || c.name_cs,
        name_en: c.nameEn || c.name_en, name_de: c.nameDe || c.name_de,
        parent_id: c.parentId ?? c.parent_id, sort_order: c.sortOrder ?? c.sort_order ?? 0,
      }))
      setCategories(raw)
    }).catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('kategorie', category)
    if (search) params.set('hledat', search)
    if (sort) params.set('seradit', sort)
    if (filter) params.set('filtr', filter)
    if (minParam) params.set('min', minParam)
    if (maxParam) params.set('max', maxParam)
    params.set('strana', String(page))

    const res = await fetch(`/api/products?${params}`)
    const data = await res.json()
    setProducts(data.products || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [category, search, sort, filter, minParam, maxParam, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value); else p.delete(key)
    p.delete('strana')
    setPage(1)
    router.push(`?${p}`)
  }

  const applyPriceFilter = () => {
    const p = new URLSearchParams(searchParams.toString())
    if (minPrice) p.set('min', minPrice); else p.delete('min')
    if (maxPrice) p.set('max', maxPrice); else p.delete('max')
    p.delete('strana'); setPage(1)
    router.push(`?${p}`)
  }

  const applySearch = () => setParam('hledat', searchInput)

  const getCatName = (c: Category) => {
    const map: Record<string, string> = { cs: c.name_cs, en: c.name_en, de: c.name_de }
    return map[locale] || c.name_cs
  }

  // Build tree: roots + children
  const roots = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
  const getChildren = (parentId: string) =>
    categories.filter(c => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)

  const activeCategory = categories.find(c => c.slug === category)

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
          {/* Search bar */}
          <div className="relative hidden md:flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-soft pointer-events-none" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applySearch()}
              placeholder="Hledat produkt..."
              className="pl-9 pr-3 py-2 border border-cream-dark rounded-lg text-sm focus:outline-none focus:border-forest w-52" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setParam('hledat', '') }} className="absolute right-3 text-gray-soft hover:text-charcoal">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <select value={sort} onChange={e => setParam('seradit', e.target.value)}
              className="appearance-none bg-white border border-cream-dark rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:border-forest">
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
          <div className="bg-white rounded-xl border border-cream-dark p-4 sticky top-24 space-y-5">

            {/* Categories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{t('category')}</h3>
                {category && <button onClick={() => setParam('kategorie', '')} className="text-gray-soft hover:text-charcoal"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <ul className="space-y-0.5">
                <li>
                  <button onClick={() => setParam('kategorie', '')}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${!category ? 'bg-forest text-white' : 'hover:bg-sage/30'}`}>
                    {t('all_categories')}
                  </button>
                </li>
                {roots.map(root => {
                  const children = getChildren(root.id)
                  const isActive = category === root.slug || children.some(c => c.slug === category)
                  return (
                    <li key={root.id}>
                      <button onClick={() => setParam('kategorie', root.slug)}
                        className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors flex items-center justify-between ${category === root.slug ? 'bg-forest text-white' : isActive ? 'bg-sage/30 font-medium' : 'hover:bg-sage/30'}`}>
                        <span>{getCatName(root)}</span>
                        {children.length > 0 && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                      {children.length > 0 && isActive && (
                        <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-cream-dark pl-2">
                          {children.map(child => (
                            <li key={child.id}>
                              <button onClick={() => setParam('kategorie', child.slug)}
                                className={`w-full text-left px-2 py-1 text-xs rounded-lg transition-colors ${category === child.slug ? 'bg-forest/80 text-white' : 'hover:bg-sage/30'}`}>
                                {getCatName(child)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Price range */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Cena (Kč)</h3>
              <div className="flex gap-2 mb-2">
                <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Od"
                  className="w-full border border-cream-dark rounded px-2 py-1.5 text-xs focus:outline-none focus:border-forest" />
                <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Do"
                  className="w-full border border-cream-dark rounded px-2 py-1.5 text-xs focus:outline-none focus:border-forest" />
              </div>
              <button onClick={applyPriceFilter}
                className="w-full py-1.5 text-xs font-medium bg-forest text-white rounded-lg hover:bg-forest-dark transition-colors">
                Použít filtr ceny
              </button>
              {(minParam || maxParam) && (
                <button onClick={() => { setMinPrice(''); setMaxPrice(''); const p = new URLSearchParams(searchParams.toString()); p.delete('min'); p.delete('max'); router.push(`?${p}`) }}
                  className="w-full mt-1 py-1 text-xs text-gray-soft hover:text-charcoal transition-colors">
                  × Zrušit filtr ceny
                </button>
              )}
            </div>

            {/* Flags */}
            <div>
              <h3 className="font-semibold text-sm mb-2">{t('filter_label')}</h3>
              <div className="space-y-1">
                {[
                  { key: 'novinka', label: t('filter_new') },
                  { key: 'sleva', label: t('filter_sale') },
                  { key: 'doporucene', label: t('filter_featured') },
                  { key: 'dostupne', label: 'Skladem' },
                ].map(f => (
                  <button key={f.key} onClick={() => setParam('filtr', filter === f.key ? '' : f.key)}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors ${filter === f.key ? 'bg-gold text-charcoal font-medium' : 'hover:bg-sage/30'}`}>
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
          {(category || search || filter || minParam || maxParam) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {category && activeCategory && (
                <span className="inline-flex items-center gap-1 bg-forest/10 text-forest text-xs px-3 py-1 rounded-full">
                  {getCatName(activeCategory)}<button onClick={() => setParam('kategorie', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 bg-forest/10 text-forest text-xs px-3 py-1 rounded-full">
                  Hledat: {search}<button onClick={() => { setSearchInput(''); setParam('hledat', '') }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filter && (
                <span className="inline-flex items-center gap-1 bg-gold/20 text-earth text-xs px-3 py-1 rounded-full">
                  {filter}<button onClick={() => setParam('filtr', '')}><X className="w-3 h-3" /></button>
                </span>
              )}
              {(minParam || maxParam) && (
                <span className="inline-flex items-center gap-1 bg-gold/20 text-earth text-xs px-3 py-1 rounded-full">
                  Cena: {minParam || '0'} – {maxParam || '∞'} Kč
                  <button onClick={() => { setMinPrice(''); setMaxPrice(''); const p = new URLSearchParams(searchParams.toString()); p.delete('min'); p.delete('max'); router.push(`?${p}`) }}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-cream-dark animate-pulse">
                  <div className="aspect-square bg-cream-dark rounded-t-xl" />
                  <div className="p-3 space-y-2"><div className="h-4 bg-cream-dark rounded w-3/4" /><div className="h-4 bg-cream-dark rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-gray-soft">
              <p className="text-lg">{t('no_products')}</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push(`/${locale}/obchod`)}>Zobrazit vše</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} locale={locale} />)}
              </div>
              {total > 20 && (
                <div className="flex justify-center gap-2 mt-8">
                  {page > 1 && <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)}>← Předchozí</Button>}
                  <span className="px-4 py-2 text-sm text-gray-soft">Strana {page} z {Math.ceil(total / 20)}</span>
                  {page < Math.ceil(total / 20) && <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Další →</Button>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
