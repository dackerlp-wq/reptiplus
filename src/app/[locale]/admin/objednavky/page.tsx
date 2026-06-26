'use client'
import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

interface Order {
  id: string; orderNumber: string; email: string; firstName: string; lastName: string
  total: number; status: string; paymentStatus: string; shippingMethod: string
  createdAt: string; paymentMethod: string
}

const STATUS_OPTIONS = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700', paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700', shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Čeká', paid: 'Zaplaceno', processing: 'Zpracovává se',
  shipped: 'Odesláno', delivered: 'Doručeno', cancelled: 'Zrušeno',
}

export default function AdminOrdersPage() {
  const locale = useLocale()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/orders').then(r => r.json()).then(data => {
      setOrders(data.orders || [])
      setLoading(false)
    })
  }, [])

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.orderNumber.includes(search) || o.email.includes(search)
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Objednávky</h1>

      <div className="bg-white rounded-xl border border-cream-dark">
        <div className="px-4 py-3 border-b border-cream-dark flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-gray-soft" />
            <input type="text" placeholder="Číslo objednávky nebo e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="text-sm outline-none flex-1 placeholder-gray-soft" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-cream-dark rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-forest">
            <option value="">Všechny stavy</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <span className="text-xs text-gray-soft">{filtered.length} objednávek</span>
        </div>

        {loading ? <div className="py-16 text-center text-gray-soft">Načítám...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-gray-soft text-xs">
                  <th className="px-4 py-3 text-left">Číslo</th>
                  <th className="px-4 py-3 text-left">Zákazník</th>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Stav</th>
                  <th className="px-4 py-3 text-left">Platba</th>
                  <th className="px-4 py-3 text-right">Celkem</th>
                  <th className="px-4 py-3 text-right">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id} className="border-b border-cream-dark hover:bg-cream/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div>{order.firstName} {order.lastName}</div>
                      <div className="text-xs text-gray-soft">{order.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-soft text-xs">{formatDate(order.createdAt || '', locale as Locale)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-soft capitalize">{order.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/${locale}/admin/objednavky/${order.id}`} className="text-forest hover:underline text-xs">Detail →</Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-soft">Žádné objednávky</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
