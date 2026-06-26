'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { Package, CreditCard, Truck, CheckCircle } from 'lucide-react'
import Image from 'next/image'

const SHIPPING_OPTIONS = [
  { id: 'zasilkovna', label: 'Zásilkovna', price: 89, desc: 'Výdejní místo nebo Z-BOX', icon: '📦' },
  { id: 'ppl', label: 'PPL Parcel', price: 129, desc: 'Doručení na adresu', icon: '🚚' },
  { id: 'personal_pickup', label: 'Osobní odběr', price: 0, desc: 'Praha — po domluvě', icon: '🏪' },
]

const PAYMENT_OPTIONS = [
  { id: 'card', label: 'Platební karta', desc: 'Visa, Mastercard — přes Comgate', icon: '💳' },
  { id: 'bank_transfer', label: 'Bankovní převod', desc: 'Na náš účet — platba předem', icon: '🏦' },
  { id: 'cash_on_delivery', label: 'Dobírka', desc: 'Platba při převzetí (+30 Kč)', icon: '💵' },
]

export default function CheckoutPage() {
  const t = useTranslations('checkout')
  const locale = useLocale()
  const router = useRouter()
  const { items, total, clearCart } = useCartStore()

  const [shippingMethod, setShippingMethod] = useState('zasilkovna')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    street: '', city: '', zip: '', country: 'CZ',
    company: '', ico: '', dic: '', note: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const subtotal = total()
  const shipping = SHIPPING_OPTIONS.find(s => s.id === shippingMethod)
  const shippingPrice = subtotal >= 2000 ? 0 : (shipping?.price || 89)
  const codFee = paymentMethod === 'cash_on_delivery' ? 30 : 0
  const orderTotal = subtotal + shippingPrice + codFee

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.firstName) e.firstName = 'Povinné'
    if (!form.lastName) e.lastName = 'Povinné'
    if (!form.email) e.email = 'Povinné'
    if (!form.street) e.street = 'Povinné'
    if (!form.city) e.city = 'Povinné'
    if (!form.zip) e.zip = 'Povinné'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (items.length === 0) { toast('Košík je prázdný', 'error'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shippingMethod,
          paymentMethod,
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast(data.error || 'Chyba při objednávce', 'error')
        return
      }

      clearCart()
      router.push(`/${locale}/objednavka/${data.orderNumber}`)
    } catch {
      toast('Chyba sítě', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-soft">Váš košík je prázdný.</p>
        <Button className="mt-4" onClick={() => router.push(`/${locale}/obchod`)}>Do obchodu</Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t('title')}</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact */}
            <div className="bg-white rounded-xl border border-cream-dark p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-forest text-white text-xs flex items-center justify-center font-bold">1</span>
                {t('contact')}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('first_name')} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} error={errors.firstName} required />
                <Input label={t('last_name')} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} error={errors.lastName} required />
                <Input label={t('email')} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} error={errors.email} required />
                <Input label={t('phone')} type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>

            {/* Shipping address */}
            <div className="bg-white rounded-xl border border-cream-dark p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-forest text-white text-xs flex items-center justify-center font-bold">2</span>
                {t('shipping_address')}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Input label={t('street')} value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} error={errors.street} required className="col-span-2" />
                <Input label={t('city')} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} error={errors.city} required />
                <Input label={t('zip')} value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} error={errors.zip} required />
                <Input label={t('company')} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="col-span-2" />
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">{t('note')}</label>
                  <textarea
                    value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    rows={3}
                    className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none"
                    placeholder="Poznámka k doručení..."
                  />
                </div>
              </div>
            </div>

            {/* Shipping method */}
            <div className="bg-white rounded-xl border border-cream-dark p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-forest text-white text-xs flex items-center justify-center font-bold">3</span>
                {t('shipping_method')}
              </h2>
              <div className="space-y-2">
                {SHIPPING_OPTIONS.map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-colors ${shippingMethod === opt.id ? 'border-forest bg-sage/10' : 'border-cream-dark hover:border-forest/30'}`}
                  >
                    <input type="radio" name="shipping" value={opt.id} checked={shippingMethod === opt.id} onChange={() => setShippingMethod(opt.id)} className="sr-only" />
                    <span className="text-xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-soft">{opt.desc}</p>
                    </div>
                    <span className="font-bold text-sm">
                      {subtotal >= 2000 ? <span className="text-forest">Zdarma</span> : opt.price === 0 ? 'Zdarma' : formatPrice(opt.price)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-xl border border-cream-dark p-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-forest text-white text-xs flex items-center justify-center font-bold">4</span>
                {t('payment_method')}
              </h2>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-4 p-3 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === opt.id ? 'border-forest bg-sage/10' : 'border-cream-dark hover:border-forest/30'}`}
                  >
                    <input type="radio" name="payment" value={opt.id} checked={paymentMethod === opt.id} onChange={() => setPaymentMethod(opt.id)} className="sr-only" />
                    <span className="text-xl">{opt.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-soft">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: summary */}
          <div>
            <div className="bg-white rounded-xl border border-cream-dark p-4 sticky top-24">
              <h3 className="font-bold mb-4">{t('summary')}</h3>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 rounded-lg bg-cream shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.jpg' }} />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-forest text-white text-[10px] rounded-full flex items-center justify-center font-bold">{item.quantity}</span>
                    </div>
                    <p className="text-xs font-medium flex-1 line-clamp-2">{item.name}</p>
                    <p className="text-sm font-bold shrink-0">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-cream-dark pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-soft">Zboží</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-soft">Doprava</span>
                  <span>{shippingPrice === 0 ? 'Zdarma' : formatPrice(shippingPrice)}</span>
                </div>
                {codFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-soft">Poplatek za dobírku</span>
                    <span>{formatPrice(codFee)}</span>
                  </div>
                )}
                <div className="border-t border-cream-dark pt-2 flex justify-between font-bold text-base">
                  <span>Celkem</span>
                  <span className="text-forest">{formatPrice(orderTotal)}</span>
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full mt-4" size="lg">
                <CreditCard className="w-5 h-5" />
                {t('place_order')}
              </Button>

              <p className="text-xs text-gray-soft text-center mt-3">
                Kliknutím souhlasíte s <a href={`/${locale}/podminky`} className="underline">obchodními podmínkami</a>.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
