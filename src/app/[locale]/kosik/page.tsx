'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Trash2, Minus, Plus, ShoppingBag, Tag, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'

const FREE_SHIPPING_THRESHOLD = 2000
const SHIPPING_PRICES = { zasilkovna: 89, ppl: 129, personal_pickup: 0 }

export default function CartPage() {
  const t = useTranslations('cart')
  const locale = useLocale()
  const { items, removeItem, updateQuantity, total } = useCartStore()
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const [shippingMethod] = useState<'zasilkovna' | 'ppl'>('zasilkovna')

  const subtotal = total()
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal
  const shippingPrice = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_PRICES[shippingMethod]
  const orderTotal = subtotal + shippingPrice - discount

  const applyCoupon = async () => {
    if (!coupon.trim()) return
    setCouponLoading(true)
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: coupon, subtotal }),
    })
    const data = await res.json()
    if (res.ok) {
      setDiscount(data.discount)
      setCouponApplied(true)
      toast(`Slevový kód uplatněn! Sleva ${formatPrice(data.discount)}`, 'success')
    } else {
      toast(data.error, 'error')
    }
    setCouponLoading(false)
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-cream-dark mb-4" />
        <h1 className="text-2xl font-bold mb-2">{t('empty')}</h1>
        <p className="text-gray-soft mb-6">Přidejte si produkty do košíku a nakupujte.</p>
        <Link href={`/${locale}/obchod`}><Button>{t('empty_cta')}</Button></Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {/* Free shipping bar */}
      {remaining > 0 && (
        <div className="bg-sage/30 border border-sage-dark/30 rounded-xl p-3 mb-6 flex items-center gap-3">
          <span className="text-sm">
            {t('free_shipping_info', { amount: remaining.toFixed(0) })} 🎁
          </span>
          <div className="flex-1 bg-white rounded-full h-2">
            <div
              className="bg-forest rounded-full h-2 transition-all"
              style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={item.productId} className="flex items-center gap-4 bg-white rounded-xl border border-cream-dark p-4">
              <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-cream">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-contain p-1"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://sntwqjbvqxogtqrvoyme.supabase.co/storage/v1/object/public/images/placeholder.png' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/${locale}/produkt/${item.productId}`} className="font-medium text-sm hover:text-forest transition-colors line-clamp-2">
                  {item.name}
                </Link>
                <p className="text-xs text-gray-soft mt-0.5">SKU: {item.sku}</p>
              </div>
              <div className="flex items-center border border-cream-dark rounded-lg overflow-hidden">
                <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="px-2 py-1.5 hover:bg-cream-dark transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-sm font-medium min-w-[2.5rem] text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.productId, Math.min(item.stock, item.quantity + 1))} className="px-2 py-1.5 hover:bg-cream-dark transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-forest">{formatPrice(item.price * item.quantity)}</p>
                <p className="text-xs text-gray-soft">{formatPrice(item.price)} / ks</p>
              </div>
              <button onClick={() => removeItem(item.productId)} className="p-1.5 text-gray-soft hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <Link href={`/${locale}/obchod`} className="text-sm text-forest hover:underline flex items-center gap-1">
              ← {t('continue_shopping')}
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {/* Coupon */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> {t('coupon')}
            </h3>
            {couponApplied ? (
              <div className="flex items-center gap-2 text-sm text-forest">
                <span>✓ Kód uplatněn • Sleva {formatPrice(discount)}</span>
                <button className="text-gray-soft hover:text-charcoal text-xs" onClick={() => { setDiscount(0); setCouponApplied(false); setCoupon('') }}>Odstranit</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value.toUpperCase())}
                  placeholder="KÓDSLEVA"
                  className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest"
                />
                <Button variant="outline" size="sm" loading={couponLoading} onClick={applyCoupon}>
                  {t('apply_coupon')}
                </Button>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-semibold mb-4">{t('total')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-soft">{t('subtotal')}</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-soft">{t('shipping')} (Zásilkovna)</span>
                <span className="font-medium">{shippingPrice === 0 ? 'Zdarma' : formatPrice(shippingPrice)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-forest">
                  <span>{t('discount')}</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="border-t border-cream-dark pt-2 mt-2 flex justify-between font-bold text-base">
                <span>{t('total')}</span>
                <span className="text-forest">{formatPrice(orderTotal)}</span>
              </div>
            </div>
            <Link href={`/${locale}/pokladna`}>
              <Button className="w-full mt-4" size="lg">
                {t('checkout')} <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
