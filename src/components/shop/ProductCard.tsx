'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Heart, Eye, X, Layers } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import { toast } from '@/components/ui/Toaster'
import { Badge } from '@/components/ui/Badge'
import { usePriceFmt } from '@/hooks/usePriceFmt'
import { Button } from '@/components/ui/Button'

export interface Product {
  id: string
  slug: string
  nameCs: string
  nameEn: string
  nameDe: string
  price: number
  priceExcl: number
  comparePrice?: number | null
  stock: number
  images: string | null
  isNew?: number | null
  isSale?: number | null
  isFeatured?: number | null
  lowStockThreshold?: number | null
  hasVariants?: boolean
}

interface ProductCardProps {
  product: Product
  locale: string
}

function getName(p: Product, locale: string) {
  const map: Record<string, string> = { cs: p.nameCs, en: p.nameEn, de: p.nameDe }
  return map[locale] || p.nameCs
}

export default function ProductCard({ product, locale }: ProductCardProps) {
  const t = useTranslations('shop')
  const addItem = useCartStore(s => s.addItem)
  const { fmt, fmtSecondary, isEur } = usePriceFmt()
  const [previewOpen, setPreviewOpen] = useState(false)

  const images = JSON.parse(product.images || '[]') as string[]
  const image = images[0] || 'https://sntwqjbvqxogtqrvoyme.supabase.co/storage/v1/object/public/images/placeholder.png'
  const name = getName(product, locale)
  const isOutOfStock = product.stock <= 0
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 5)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isOutOfStock) return
    addItem({ productId: product.id, name, sku: product.slug, price: product.price, image, quantity: 1, stock: product.stock })
    toast(`${name} ${t('added_to_cart')}`, 'success')
  }

  const secondary = fmtSecondary(product.price)
  const secondaryExcl = fmtSecondary(product.priceExcl)

  return (
    <>
      <Link href={`/${locale}/produkt/${product.slug}`} className="group block">
        <div className="bg-white rounded-xl border border-cream-dark overflow-hidden hover:shadow-lg hover:border-forest/20 transition-all duration-200">
          <div className="relative aspect-square overflow-hidden bg-cream">
            <Image
              src={image}
              alt={name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isNew === 1 && <Badge variant="new">{t('badge_new')}</Badge>}
              {product.isSale === 1 && product.comparePrice && <Badge variant="sale">{t('badge_sale')}</Badge>}
              {isOutOfStock && <Badge variant="outofstock">{t('out_of_stock')}</Badge>}
              {isLowStock && !isOutOfStock && <Badge variant="lowstock">{t('low_stock')}</Badge>}
            </div>
            {/* Top-right actions */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.preventDefault(); toast('Přidáno do oblíbených', 'info') }}
                className="p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:text-red-500 transition-colors"
              >
                <Heart className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); setPreviewOpen(true) }}
                className="p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:text-forest transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            {!isOutOfStock && (
              product.hasVariants ? (
                <Link
                  href={`/${locale}/produkt/${product.slug}`}
                  onClick={e => e.stopPropagation()}
                  className="absolute bottom-0 left-0 right-0 bg-forest text-white py-2.5 text-sm font-medium flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200"
                >
                  <Layers className="w-4 h-4" />
                  Vybrat variantu
                </Link>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="absolute bottom-0 left-0 right-0 bg-forest text-white py-2.5 text-sm font-medium flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {t('add_to_cart')}
                </button>
              )
            )}
          </div>
          <div className="p-3">
            <h3 className="text-sm font-medium line-clamp-2 group-hover:text-forest transition-colors min-h-[2.5rem]">
              {name}
            </h3>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-lg font-bold text-forest">{fmt(product.price)}</span>
              {product.comparePrice && product.comparePrice > product.price && (
                <span className="text-sm text-gray-soft line-through">{fmt(product.comparePrice)}</span>
              )}
            </div>
            {secondary && <p className="text-xs text-gray-soft">{secondary}</p>}
            <p className="text-xs text-gray-soft mt-0.5">
              {isEur ? secondaryExcl : fmt(product.priceExcl)} {t('excl_vat')}
            </p>
            <div className={cn('text-xs mt-1', isOutOfStock ? 'text-gray-400' : isLowStock ? 'text-amber-600' : 'text-sage-dark font-medium')}>
              {isOutOfStock ? t('out_of_stock') : isLowStock ? `${t('low_stock')} (${product.stock} ks)` : t('in_stock')}
            </div>
          </div>
        </div>
      </Link>

      {/* Quick preview modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex">
              {/* Image */}
              <div className="relative w-52 shrink-0 bg-cream">
                <Image src={image} alt={name} fill className="object-contain p-6" />
              </div>
              {/* Info */}
              <div className="flex-1 p-5 flex flex-col">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-cream hover:bg-cream-dark transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="mb-1 flex gap-1">
                  {product.isNew === 1 && <Badge variant="new">{t('badge_new')}</Badge>}
                  {product.isSale === 1 && product.comparePrice && <Badge variant="sale">{t('badge_sale')}</Badge>}
                </div>
                <h3 className="font-bold text-charcoal leading-snug mb-2">{name}</h3>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-xl font-bold text-forest">{fmt(product.price)}</span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-sm text-gray-soft line-through">{fmt(product.comparePrice)}</span>
                  )}
                </div>
                {secondary && <p className="text-xs text-gray-soft mb-1">{secondary}</p>}
                <p className="text-xs text-gray-soft mb-3">
                  {isEur ? secondaryExcl : fmt(product.priceExcl)} {t('excl_vat')}
                </p>
                <p className={cn('text-xs mb-4 font-medium', isOutOfStock ? 'text-gray-400' : isLowStock ? 'text-amber-600' : 'text-sage-dark')}>
                  {isOutOfStock ? t('out_of_stock') : isLowStock ? `${t('low_stock')} (${product.stock} ks)` : t('in_stock')}
                </p>
                <div className="mt-auto flex flex-col gap-2">
                  {!isOutOfStock && (
                    product.hasVariants ? (
                      <Link
                        href={`/${locale}/produkt/${product.slug}`}
                        onClick={() => setPreviewOpen(false)}
                        className="w-full"
                      >
                        <Button size="sm" className="w-full">
                          <Layers className="w-4 h-4" /> Vybrat variantu
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={(e) => { handleAddToCart(e); setPreviewOpen(false) }}
                        size="sm"
                        className="w-full"
                      >
                        <ShoppingCart className="w-4 h-4" /> {t('add_to_cart')}
                      </Button>
                    )
                  )}
                  <Link
                    href={`/${locale}/produkt/${product.slug}`}
                    className="text-center text-xs text-forest hover:underline"
                    onClick={() => setPreviewOpen(false)}
                  >
                    Zobrazit detail →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
