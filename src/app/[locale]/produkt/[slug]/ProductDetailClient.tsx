'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ShoppingCart, Heart, Share2, Star, Minus, Plus, ChevronRight, Package, X, ChevronLeft, ZoomIn } from 'lucide-react'
import { usePriceFmt } from '@/hooks/usePriceFmt'
import { useCartStore } from '@/store/cart'
import { toast } from '@/components/ui/Toaster'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import ProductCard, { type Product as ProductCardType } from '@/components/shop/ProductCard'

type Product = {
  id: string; slug: string; sku: string; nameCs: string; nameEn: string; nameDe: string
  descriptionCs?: string | null; descriptionEn?: string | null; descriptionDe?: string | null
  price: number; priceExcl: number; comparePrice?: number | null; vatRate: number
  stock: number; lowStockThreshold?: number | null; images: string | null; parameters: string | null
  isNew?: number | null; isSale?: number | null; isFeatured?: number | null
}

type Variant = {
  id: string
  nameCs: string
  nameEn: string
  nameDe: string
  sku: string | null
  price: number | null  // null = použij cenu produktu
  stock: number
  attributes: Record<string, string>
  parameters: Record<string, string>
  restockDate: string | null
  sortOrder: number
}

type Category = { nameCs: string; nameEn: string; nameDe: string; slug: string } | null
type Review = { id: string; authorName: string; rating: number; title?: string | null; body?: string | null; createdAt?: string | null }
type BlogPost = { id: string; slug: string; title_cs: string; title_en: string; title_de: string; image: string | null; published_at: string | null }

function getName(p: Product, locale: string) {
  const map: Record<string, string> = { cs: p.nameCs, en: p.nameEn, de: p.nameDe }
  return map[locale] || p.nameCs
}

function getDescription(p: Product, locale: string) {
  const map: Record<string, string | null | undefined> = { cs: p.descriptionCs, en: p.descriptionEn, de: p.descriptionDe }
  return map[locale] || p.descriptionCs || ''
}

function getCatName(cat: Category, locale: string) {
  if (!cat) return null
  const map: Record<string, string> = { cs: cat.nameCs, en: cat.nameEn, de: cat.nameDe }
  return map[locale] || cat.nameCs
}

function getVariantName(v: Variant, locale: string) {
  const map: Record<string, string> = { cs: v.nameCs, en: v.nameEn, de: v.nameDe }
  return map[locale] || v.nameCs
}

export default function ProductDetailClient({
  product, category, reviews, related, locale, blogPosts = [], variants = []
}: {
  product: Product; category: Category; reviews: Review[]
  related: ProductCardType[]; locale: string; blogPosts?: BlogPost[]
  variants?: Variant[]
}) {
  const t = useTranslations('product')
  const tShop = useTranslations('shop')
  const tCommon = useTranslations('common')
  const addItem = useCartStore(s => s.addItem)
  const { fmt, fmtSecondary } = usePriceFmt()

  const [qty, setQty] = useState(1)
  const [activeTab, setActiveTab] = useState<'description' | 'parameters' | 'reviews'>('description')
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants.length > 0 ? variants[0] : null
  )

  const cartBtnRef = useRef<HTMLDivElement>(null)

  const images = JSON.parse(product.images || '[]') as string[]
  if (!images.length) images.push('https://sntwqjbvqxogtqrvoyme.supabase.co/storage/v1/object/public/images/placeholder.png')

  const name = getName(product, locale)
  const description = getDescription(product, locale)
  const catName = getCatName(category, locale)
  const productParameters = JSON.parse(product.parameters || '{}') as Record<string, string>
  const parameters = selectedVariant
    ? { ...productParameters, ...selectedVariant.parameters }
    : productParameters
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  // Active price and stock — variant overrides product if set
  const activePrice = selectedVariant?.price ?? product.price
  const activeStock = selectedVariant?.stock ?? product.stock
  const activeSku = selectedVariant?.sku || product.sku
  const isOutOfStock = activeStock <= 0
  const isLowStock = activeStock > 0 && activeStock <= (product.lowStockThreshold ?? 5)

  // Reset qty when variant changes
  useEffect(() => {
    setQty(1)
  }, [selectedVariant?.id])

  const handleAddToCart = () => {
    if (isOutOfStock) return
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      variantName: selectedVariant ? getVariantName(selectedVariant, locale) : undefined,
      name,
      sku: activeSku,
      price: activePrice,
      image: images[0],
      quantity: qty,
      stock: activeStock,
    })
    toast(`${name}${selectedVariant ? ` (${getVariantName(selectedVariant, locale)})` : ''} ${tShop('added_to_cart')}`, 'success')
  }

  // Sticky add-to-cart: show when the cart button row scrolls out of view
  useEffect(() => {
    const el = cartBtnRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Lightbox keyboard navigation
  const lightboxPrev = useCallback(() => setActiveImage(i => (i - 1 + images.length) % images.length), [images.length])
  const lightboxNext = useCallback(() => setActiveImage(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') lightboxPrev()
      if (e.key === 'ArrowRight') lightboxNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, lightboxPrev, lightboxNext])

  // Group variants by attribute key for a nicer display (e.g. "Barva", "Velikost")
  const attributeKeys = variants.length > 0
    ? Array.from(new Set(variants.flatMap(v => Object.keys(v.attributes))))
    : []
  const hasAttributes = attributeKeys.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-soft mb-6">
        <Link href={`/${locale}`} className="hover:text-forest">{tCommon('home')}</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/${locale}/obchod`} className="hover:text-forest">{tShop('title')}</Link>
        {catName && (
          <>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/${locale}/obchod?kategorie=${category?.slug}`} className="hover:text-forest">{catName}</Link>
          </>
        )}
        <ChevronRight className="w-4 h-4" />
        <span className="text-charcoal truncate max-w-xs">{name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 mb-12">
        {/* Images */}
        <div>
          <div
            className="relative aspect-square rounded-2xl overflow-hidden bg-cream border border-cream-dark mb-3 cursor-zoom-in group"
            onClick={() => setLightboxOpen(true)}
          >
            <Image src={images[activeImage]} alt={name} fill className="object-contain p-6" priority />
            {product.isNew === 1 && <Badge variant="new" className="absolute top-3 left-3">{tShop('badge_new')}</Badge>}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/30 rounded-full p-3">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImage ? 'border-forest' : 'border-cream-dark'}`}>
                  <Image src={img} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {catName && (
            <Link href={`/${locale}/obchod?kategorie=${category?.slug}`} className="text-sm text-forest font-medium hover:underline">
              {catName}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mt-1 mb-3">{name}</h1>

          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-gold text-gold' : 'text-cream-dark'}`} />)}
              </div>
              <span className="text-sm text-gray-soft">({reviews.length} hodnocení)</span>
            </div>
          )}

          {/* Price — updates with variant */}
          <div className="flex items-end gap-3 mb-1">
            <span className="text-3xl font-bold text-forest">{fmt(activePrice)}</span>
            {product.comparePrice && product.comparePrice > activePrice && (
              <>
                <span className="text-xl text-gray-soft line-through">{fmt(product.comparePrice)}</span>
                <Badge variant="sale">-{Math.round((1 - activePrice / product.comparePrice) * 100)}%</Badge>
              </>
            )}
          </div>
          {fmtSecondary(activePrice) && <p className="text-sm text-gray-soft">{fmtSecondary(activePrice)}</p>}
          <p className="text-sm text-gray-soft mb-4">{fmt(product.priceExcl)} {tShop('excl_vat')} • DPH {product.vatRate}%</p>

          {/* Variant selector */}
          {variants.length > 0 && (
            <div className="mb-5">
              {hasAttributes ? (
                // If variants have attribute keys, group by first attribute key
                attributeKeys.map(attrKey => {
                  const valuesForKey = Array.from(new Set(variants.map(v => v.attributes[attrKey]).filter(Boolean)))
                  return (
                    <div key={attrKey} className="mb-3">
                      <p className="text-xs font-semibold text-gray-soft uppercase tracking-wider mb-2">
                        {attrKey}
                        {selectedVariant && selectedVariant.attributes[attrKey] && (
                          <span className="ml-2 text-charcoal normal-case font-normal">
                            {selectedVariant.attributes[attrKey]}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {valuesForKey.map(val => {
                          // Only show this value if it exists in combination with all other currently selected attrs
                          const currentAttrs = selectedVariant?.attributes ?? {}
                          const compatibleVariants = variants.filter(v => {
                            if (v.attributes[attrKey] !== val) return false
                            // Must match every other currently selected attribute
                            return attributeKeys
                              .filter(k => k !== attrKey)
                              .every(k => !currentAttrs[k] || v.attributes[k] === currentAttrs[k])
                          })
                          // Hide entirely if no compatible combination exists
                          if (compatibleVariants.length === 0) return null

                          const isSelected = selectedVariant?.attributes[attrKey] === val
                          const allOutOfStock = compatibleVariants.every(v => v.stock <= 0)
                          const restockDt = allOutOfStock ? compatibleVariants[0]?.restockDate : null
                          return (
                            <div key={val} className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => {
                                  const desired = { ...currentAttrs, [attrKey]: val }
                                  const scored = compatibleVariants.map(v => {
                                    const score = Object.entries(desired).filter(
                                      ([k, dv]) => v.attributes[k] === dv
                                    ).length
                                    return { v, score }
                                  })
                                  scored.sort((a, b) => b.score - a.score)
                                  const match = scored[0]?.v
                                  if (match) setSelectedVariant(match)
                                }}
                                disabled={allOutOfStock}
                                title={allOutOfStock && restockDt ? `Čekáme dodání do: ${new Date(restockDt).toLocaleDateString('cs-CZ')}` : undefined}
                                className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all font-medium
                                  ${isSelected
                                    ? 'border-forest bg-forest text-white'
                                    : allOutOfStock
                                      ? 'border-cream-dark bg-cream text-gray-soft line-through cursor-not-allowed'
                                      : 'border-cream-dark hover:border-forest hover:text-forest'
                                  }`}
                              >
                                {val}
                              </button>
                              {allOutOfStock && (
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {restockDt
                                    ? new Date(restockDt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
                                    : 'Vyprodáno'}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              ) : (
                // Plain variant buttons (just names)
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-soft uppercase tracking-wider mb-2">
                    Varianta
                    {selectedVariant && (
                      <span className="ml-2 text-charcoal normal-case font-normal">
                        {getVariantName(selectedVariant, locale)}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map(v => {
                      const isSelected = selectedVariant?.id === v.id
                      const outOfStock = v.stock <= 0
                      return (
                        <div key={v.id} className="flex flex-col items-center gap-0.5">
                          <button
                            onClick={() => setSelectedVariant(v)}
                            disabled={outOfStock}
                            title={outOfStock && v.restockDate ? `Čekáme dodání do: ${new Date(v.restockDate).toLocaleDateString('cs-CZ')}` : undefined}
                            className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-all font-medium
                              ${isSelected
                                ? 'border-forest bg-forest text-white'
                                : outOfStock
                                  ? 'border-cream-dark bg-cream text-gray-soft line-through cursor-not-allowed'
                                  : 'border-cream-dark hover:border-forest hover:text-forest'
                              }`}
                          >
                            {getVariantName(v, locale)}
                            {v.price !== null && v.price !== product.price && (
                              <span className="ml-1.5 text-xs opacity-80">{fmt(v.price)}</span>
                            )}
                          </button>
                          {outOfStock && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              {v.restockDate
                                ? new Date(v.restockDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
                                : 'Vyprodáno'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stock status — reflects selected variant */}
          <div className={`flex items-center gap-2 mb-5 text-sm font-medium ${isOutOfStock ? 'text-gray-400' : isLowStock ? 'text-amber-600' : 'text-sage-dark'}`}>
            <Package className="w-4 h-4" />
            {isOutOfStock
              ? selectedVariant?.restockDate
                ? `Čekáme dodání do: ${new Date(selectedVariant.restockDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : t('out_of_stock')
              : isLowStock
                ? `${tShop('low_stock')} — zbývá ${activeStock} ks`
                : `${t('in_stock')} (${activeStock} ks)`}
          </div>

          <p className="text-xs text-gray-soft mb-4">{t('sku')}: {activeSku}</p>

          {/* Cart button — observed for sticky bar */}
          <div ref={cartBtnRef}>
            {!isOutOfStock && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center border border-cream-dark rounded-lg overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-cream-dark transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(activeStock, q + 1))} className="px-3 py-2 hover:bg-cream-dark transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <Button onClick={handleAddToCart} size="lg" className="flex-1">
                  <ShoppingCart className="w-5 h-5" /> {t('add_to_cart')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => toast('Přidáno do oblíbených', 'info')}>
              <Heart className="w-4 h-4" /> {t('add_to_wishlist')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Odkaz zkopírován', 'success') }}>
              <Share2 className="w-4 h-4" /> {t('share')}
            </Button>
          </div>

          {Object.keys(parameters).length > 0 && (
            <div className="mt-6 p-4 bg-cream rounded-xl border border-cream-dark">
              <h3 className="font-semibold text-sm mb-3">{t('parameters')}</h3>
              <dl className="grid grid-cols-2 gap-2">
                {Object.entries(parameters).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-gray-soft">{k}</dt><dd className="text-sm font-medium">{v}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-12">
        <div className="flex border-b border-cream-dark">
          {(['description', 'parameters', 'reviews'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab ? 'border-forest text-forest' : 'border-transparent text-gray-soft hover:text-charcoal'}`}>
              {t(tab)} {tab === 'reviews' && reviews.length > 0 && `(${reviews.length})`}
            </button>
          ))}
        </div>
        <div className="py-6">
          {activeTab === 'description' && (
            <div className="prose prose-sm max-w-none text-charcoal" dangerouslySetInnerHTML={{ __html: description || '<p>Popis není k dispozici.</p>' }} />
          )}
          {activeTab === 'parameters' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(parameters).map(([k, v]) => (
                <div key={k} className="p-3 bg-white rounded-lg border border-cream-dark">
                  <dt className="text-xs text-gray-soft">{k}</dt>
                  <dd className="text-sm font-semibold mt-0.5">{v}</dd>
                </div>
              ))}
              {!Object.keys(parameters).length && <p className="text-gray-soft text-sm col-span-3">Žádné parametry.</p>}
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {!reviews.length ? <p className="text-gray-soft text-sm">{t('no_reviews')}</p> : reviews.map(r => (
                <div key={r.id} className="p-4 bg-white rounded-xl border border-cream-dark">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'fill-gold text-gold' : 'text-cream-dark'}`} />)}</div>
                    <span className="font-medium text-sm">{r.authorName}</span>
                  </div>
                  {r.title && <p className="font-semibold text-sm mb-1">{r.title}</p>}
                  {r.body && <p className="text-sm text-gray-soft">{r.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* From blog */}
      {blogPosts.length > 0 && (
        <div className="mb-12">
          <div className="p-5" style={{ border: '1.5px solid var(--color-ink)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
              Z blogu
            </h4>
            <div className="space-y-0 divide-y" style={{ borderColor: 'rgba(27,31,23,0.08)' }}>
              {blogPosts.slice(0, 3).map(bp => {
                const bpTitle = ({ cs: bp.title_cs, en: bp.title_en, de: bp.title_de } as Record<string, string>)[locale] || bp.title_cs
                return (
                  <Link key={bp.id} href={`/${locale}/blog/${bp.slug}`}
                    className="flex items-center gap-3 py-3 hover:opacity-70 transition-opacity first:pt-0 last:pb-0">
                    <div className="w-11 h-11 shrink-0" style={{ background: 'var(--color-moss)', border: '1px solid var(--color-ink)' }}>
                      {bp.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bp.image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-snug truncate" style={{ color: 'var(--color-ink)' }}>{bpTitle}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Related */}
      {related.filter(p => p.id !== product.id).length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">{t('related')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.filter(p => p.id !== product.id).slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                onClick={e => { e.stopPropagation(); lightboxPrev() }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                onClick={e => { e.stopPropagation(); lightboxNext() }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <div
            className="relative w-full max-w-3xl max-h-[85vh] aspect-square mx-8"
            onClick={e => e.stopPropagation()}
          >
            <Image src={images[activeImage]} alt={name} fill className="object-contain" />
          </div>
          {images.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setActiveImage(i) }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === activeImage ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sticky add-to-cart bar */}
      {!isOutOfStock && stickyVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cream-dark shadow-2xl px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-cream border border-cream-dark shrink-0">
              <Image src={images[0]} alt={name} fill className="object-contain p-1" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{name}</p>
              {selectedVariant && (
                <p className="text-xs text-gray-soft truncate">{getVariantName(selectedVariant, locale)}</p>
              )}
              <p className="text-forest font-bold">{fmt(activePrice)}</p>
            </div>
            {/* Show variant selector in sticky bar if variants exist */}
            {variants.length > 0 && (
              <div className="hidden sm:flex gap-1.5 flex-wrap max-w-xs">
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    disabled={v.stock <= 0}
                    className={`px-2 py-1 text-xs rounded border transition-all
                      ${selectedVariant?.id === v.id
                        ? 'border-forest bg-forest text-white'
                        : v.stock <= 0
                          ? 'border-cream-dark text-gray-soft line-through cursor-not-allowed'
                          : 'border-cream-dark hover:border-forest'
                      }`}
                  >
                    {getVariantName(v, locale)}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center border border-cream-dark rounded-lg overflow-hidden shrink-0">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-2 py-1.5 hover:bg-cream-dark transition-colors"><Minus className="w-3.5 h-3.5" /></button>
              <span className="px-3 py-1.5 font-medium text-sm min-w-[2rem] text-center">{qty}</span>
              <button onClick={() => setQty(q => Math.min(activeStock, q + 1))} className="px-2 py-1.5 hover:bg-cream-dark transition-colors"><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <Button onClick={handleAddToCart} size="sm">
              <ShoppingCart className="w-4 h-4" /> {t('add_to_cart')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
