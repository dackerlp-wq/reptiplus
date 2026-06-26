import { getDb } from '@/lib/db'
import { orders, orderItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { CheckCircle, Package, Mail } from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

export default async function OrderConfirmPage({ params }: { params: Promise<{ number: string; locale: string }> }) {
  const { number, locale } = await params
  const db = getDb()
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, number))
  if (!order) notFound()
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))

  const statusLabels: Record<string, string> = {
    pending: 'Čeká na zpracování',
    paid: 'Zaplaceno',
    processing: 'Zpracovává se',
    shipped: 'Odesláno',
    delivered: 'Doručeno',
    cancelled: 'Zrušeno',
  }

  const paymentLabels: Record<string, string> = {
    card: 'Platební karta (Comgate)',
    bank_transfer: 'Bankovní převod',
    cash_on_delivery: 'Dobírka',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-sage rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-forest" />
      </div>
      <h1 className="text-3xl font-bold text-charcoal mb-2">Objednávka přijata!</h1>
      <p className="text-gray-soft mb-2">Číslo objednávky: <strong>{order.orderNumber}</strong></p>
      <p className="text-sm text-gray-soft mb-8">
        Potvrzení zašleme na <strong>{order.email}</strong>
      </p>

      <div className="bg-white rounded-xl border border-cream-dark p-6 text-left mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-forest" /> Přehled objednávky</h2>
        <div className="space-y-2 mb-4">
          {items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.productName} × {item.quantity}</span>
              <span className="font-medium">{formatPrice(item.total)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-cream-dark pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-soft">Doprava</span>
            <span>{order.shippingPrice === 0 ? 'Zdarma' : formatPrice(order.shippingPrice!)}</span>
          </div>
          {(order.discount || 0) > 0 && (
            <div className="flex justify-between text-forest">
              <span>Sleva</span>
              <span>-{formatPrice(order.discount!)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1">
            <span>Celkem</span>
            <span className="text-forest">{formatPrice(order.total)}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-cream-dark text-sm text-gray-soft space-y-1">
          <p><strong>Platba:</strong> {paymentLabels[order.paymentMethod || 'card'] || order.paymentMethod}</p>
          <p><strong>Doručení:</strong> {order.street}, {order.city} {order.zip}</p>
        </div>

        {order.paymentMethod === 'bank_transfer' && (
          <div className="mt-4 p-3 bg-sage/30 rounded-lg text-sm">
            <p className="font-semibold text-forest mb-1">Pokyny k platbě:</p>
            <p>Číslo účtu: <strong>1234567890/0800</strong></p>
            <p>Variabilní symbol: <strong>{order.orderNumber}</strong></p>
            <p>Částka: <strong>{formatPrice(order.total)}</strong></p>
          </div>
        )}
      </div>

      <Link href={`/${locale}/obchod`} className="inline-flex items-center gap-2 bg-forest text-white font-semibold px-6 py-3 rounded-xl hover:bg-forest-dark transition-colors">
        Pokračovat v nákupu
      </Link>
    </div>
  )
}
