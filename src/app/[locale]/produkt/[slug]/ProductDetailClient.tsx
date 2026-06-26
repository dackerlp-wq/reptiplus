'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ShoppingCart, Heart, Share2, Star, Minus, Plus, ChevronRight, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import { toast } from '@/components/ui/Toaster'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import ProductCard, { type Product as ProductCardType } from '@/components/shop/ProductCard'
import type { Locale } from '@/lib/i18n'

type Product = {
  id: string; slug: string; sku: string; nameCs: string; nameEn: string; nameDe: string
  descriptionCs?: string | null; descriptionEn?: string | null; descriptionDe?: string | null
  price: number; priceExcl: number; comparePrice?: number | null; vatRate: number
  stock: number; lowStockThreshold?: number | null; images: string | null; parameters: string | null
  isNew?: number | null; isSale?: number | null; isFeatured?: number | null
}
type Category = { nameCs: string; nameEn: string; nameDe: string; slug: string } | null
type Review = { id: string; authorName: string; rating: number; title?: string | null; body?: string | null; createdAt?: string | null }

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

export default function ProductDetailClient({
  product, category, reviews, related, locale
}: {
  product: Product; category: Category; reviews: Review[]
  related: ProductCardType[]; locale: string
}) {
  const t = useTranslations('product')
  const tShop = useTranslations('shop')
  const tCommon = useTranslations('common')
  const addItem = useCartStore(s => s.addItem)
  const [qty, setQty] = useState(1)
  const [activeTab, setActiveTab] = useState<'description' | 'parameters' | 'reviews'>('description')
  const [activeImage, setActiveImage] = useState(0)

  const images = JSON.parse(product.images || '[]') as string[]
  if (!images.length) images.push('https://sntwqjbvqxogtqrvoyme.supabase.co/storage/v1/object/public/images/placeholder.png')

  const name = getName(product, locale)
  const description = getDescription(product, locale)
  const catName = getCatName(category, locale)
  const parameters = JSON.parse(product.parameters || '{}') as Record<string, string>
  const isOutOfStock = product.stock <= 0
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 5)
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const handleAddToCart = () => {
    if (isOutOfStock) return
    addItem({ productId: product.id, name, sku: product.sku, price: product.price, image: images[0], quantity: qty, stock: product.stock })
    toast(`${name} ${tShop('added_to_cart')}`, 'success')
  }

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
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-cream border border-cream-dark mb-3">
            <Image src={images[activeImage]} alt={name} fill className="object-contain p-6" priority />
            {product.isNew === 1 && <Badge variant="new" className="absolute top-3 left-3">{tShop('badge_new')}</Badge>}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
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

          <div className="flex items-end gap-3 mb-1">
            <span className="text-3xl font-bold text-forest">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <>
                <span className="text-xl text-gray-soft line-through">{formatPrice(product.comparePrice)}</span>
                <Badge variant="sale">-{Math.round((1 - product.price / product.comparePrice) * 100)}%</Badge>
              </>
            )}
          </div>
          <p className="text-sm text-gray-soft mb-4">{formatPrice(product.priceExcl)} {tShop('excl_vat')} • DPH {product.vatRate}%</p>

          <div className={`flex items-center gap-2 mb-6 text-sm font-medium ${isOutOfStock ? 'text-gray-400' : isLowStock ? 'text-amber-600' : 'text-sage-dark'}`}>
            <Package className="w-4 h-4" />
            {isOutOfStock ? t('out_of_stock') : isLowStock ? `${tShop('low_stock')} — zbývá ${product.stock} ks` : `${t('in_stock')} (${product.stock} ks)`}
          </div>

          <p className="text-xs text-gray-soft mb-4">{t('sku')}: {product.sku}</p>

          {!isOutOfStock && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-cream-dark rounded-lg overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-cream-dark transition-colors"><Minus className="w-4 h-4" /></button>
                <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{qty}</span>
                <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="px-3 py-2 hover:bg-cream-dark transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              <Button onClick={handleAddToCart} size="lg" className="flex-1">
                <ShoppingCart className="w-5 h-5" /> {t('add_to_cart')}
              </Button>
            </div>
          )}

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

      {/* Related */}
      {related.filter(p => p.id !== product.id).length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-6">{t('related')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.filter(p => p.id !== product.id).slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
