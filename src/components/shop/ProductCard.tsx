'use client'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { formatPrice, cn } from '@/lib/utils'
import { useCartStore } from '@/store/cart'
import { toast } from '@/components/ui/Toaster'
import { Badge } from '@/components/ui/Badge'
import type { Locale } from '@/lib/i18n'

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

  const images = JSON.parse(product.images || '[]') as string[]
  const image = images[0] || '/images/placeholder.svg'
  const name = getName(product, locale)
  const isOutOfStock = product.stock <= 0
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 5)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isOutOfStock) return
    addItem({ productId: product.id, name, sku: product.slug, price: product.price, image, quantity: 1, stock: product.stock })
    toast(`${name} přidán do košíku`, 'success')
  }

  return (
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
            {product.isNew === 1 && <Badge variant="new">Novinka</Badge>}
            {product.isSale === 1 && product.comparePrice && <Badge variant="sale">Sleva</Badge>}
            {isOutOfStock && <Badge variant="outofstock">{t('out_of_stock')}</Badge>}
            {isLowStock && !isOutOfStock && <Badge variant="lowstock">{t('low_stock')}</Badge>}
          </div>
          <button
            onClick={(e) => { e.preventDefault(); toast('Přidáno do oblíbených', 'info') }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
          >
            <Heart className="w-4 h-4" />
          </button>
          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              className="absolute bottom-0 left-0 right-0 bg-forest text-white py-2.5 text-sm font-medium flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200"
            >
              <ShoppingCart className="w-4 h-4" />
              {t('add_to_cart')}
            </button>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-forest transition-colors min-h-[2.5rem]">
            {name}
          </h3>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-lg font-bold text-forest">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-gray-soft line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
          <p className="text-xs text-gray-soft mt-0.5">{formatPrice(product.priceExcl)} {t('excl_vat')}</p>
          <div className={cn('text-xs mt-1', isOutOfStock ? 'text-gray-400' : isLowStock ? 'text-amber-600' : 'text-sage-dark font-medium')}>
            {isOutOfStock ? t('out_of_stock') : isLowStock ? `${t('low_stock')} (${product.stock} ks)` : t('in_stock')}
          </div>
        </div>
      </div>
    </Link>
  )
}
