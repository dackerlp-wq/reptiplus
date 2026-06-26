'use client'
import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import type { Locale } from '@/lib/i18n'

interface Order {
  id: string; orderNumber: string; email: string; firstName: string; lastName: string
  phone: string; street: string; city: string; zip: string; country: string
  company: string; note: string; total: number; subtotal: number; shippingPrice: number
  discount: number; status: string; paymentStatus: string; paymentMethod: string
  shippingMethod: string; trackingNumber: string; couponCode: string; createdAt: string
}
interface OrderItem {
  id: string; productName: string; productSku: string; quantity: number; price: number; total: number
}

const STATUS_OPTIONS = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']
const PAYMENT_STATUS_OPTIONS = ['unpaid', 'paid', 'refunded']

export default function AdminOrderDetailPage() {
  const locale = useLocale()
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/orders/${params.id}`).then(r => r.json()).then(data => {
      setOrder(data.order)
      setItems(data.items)
      setStatus(data.order.status)
      setPaymentStatus(data.order.paymentStatus)
      setTrackingNumber(data.order.trackingNumber || '')
    })
  }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/admin/orders/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, paymentStatus, trackingNumber }),
    })
    if (res.ok) toast('Objednávka uložena', 'success')
    else toast('Chyba při ukládání', 'error')
    setSaving(false)
  }

  if (!order) return <div className="text-gray-soft">Načítám...</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/admin/objednavky`} className="text-gray-soft hover:text-charcoal">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Objednávka #{order.orderNumber}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <h2 className="font-bold mb-4">Položky objednávky</h2>
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-cream-dark last:border-0">
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-gray-soft">SKU: {item.productSku} × {item.quantity} ks</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(item.total)}</p>
                    <p className="text-xs text-gray-soft">{formatPrice(item.price)} / ks</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-cream-dark space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-soft">Zboží</span><span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-soft">Doprava</span><span>{formatPrice(order.shippingPrice)}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-forest"><span>Sleva</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-cream-dark">
                <span>Celkem</span><span className="text-forest">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <h2 className="font-bold mb-4">Zákazník & doručení</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-soft text-xs">Jméno</p>
                <p className="font-medium">{order.firstName} {order.lastName}</p>
              </div>
              <div>
                <p className="text-gray-soft text-xs">E-mail</p>
                <p className="font-medium">{order.email}</p>
              </div>
              <div>
                <p className="text-gray-soft text-xs">Telefon</p>
                <p className="font-medium">{order.phone || '—'}</p>
              </div>
              <div>
                <p className="text-gray-soft text-xs">Doručení</p>
                <p className="font-medium capitalize">{order.shippingMethod}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-soft text-xs">Adresa</p>
                <p className="font-medium">{order.street}, {order.city} {order.zip}, {order.country}</p>
              </div>
              {order.note && (
                <div className="col-span-2">
                  <p className="text-gray-soft text-xs">Poznámka</p>
                  <p className="font-medium">{order.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <h2 className="font-bold mb-4">Stav objednávky</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-soft mb-1">Stav objednávky</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-soft mb-1">Stav platby</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest">
                  {PAYMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-soft mb-1">Tracking číslo</label>
                <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Číslo zásilky..." className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
              </div>
              <Button className="w-full" loading={saving} onClick={handleSave}>Uložit změny</Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-cream-dark p-5 text-sm space-y-2">
            <h2 className="font-bold mb-3">Informace</h2>
            <div><span className="text-gray-soft">Datum:</span> <span className="font-medium">{formatDate(order.createdAt || '', locale as Locale)}</span></div>
            <div><span className="text-gray-soft">Platba:</span> <span className="font-medium capitalize">{order.paymentMethod}</span></div>
            {order.couponCode && <div><span className="text-gray-soft">Kupón:</span> <span className="font-medium">{order.couponCode}</span></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
