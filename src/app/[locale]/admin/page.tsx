'use client'
import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { TrendingUp, ShoppingBag, Users, Package, ArrowRight, Clock } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

interface Stats {
  revenue: number; orders: number; customers: number; products: number
  recentOrders: Array<{ id: string; orderNumber: string; email: string; total: number; status: string; createdAt: string }>
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Čeká', paid: 'Zaplaceno', processing: 'Zpracovává se',
  shipped: 'Odesláno', delivered: 'Doručeno', cancelled: 'Zrušeno',
}

export default function AdminDashboard() {
  const locale = useLocale()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) {
    return <div className="text-gray-soft">Načítám statistiky...</div>
  }

  const statCards = [
    { label: 'Tržby (zaplaceno)', value: formatPrice(stats.revenue), icon: TrendingUp, color: 'bg-forest', link: null },
    { label: 'Objednávky celkem', value: stats.orders, icon: ShoppingBag, color: 'bg-blue-600', link: `/${locale}/admin/objednavky` },
    { label: 'Zákazníci', value: stats.customers, icon: Users, color: 'bg-purple-600', link: `/${locale}/admin/zakaznici` },
    { label: 'Aktivní produkty', value: stats.products, icon: Package, color: 'bg-amber-600', link: `/${locale}/admin/produkty` },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href={`/${locale}/admin/produkty/novy`} className="bg-forest text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-forest-dark transition-colors flex items-center gap-2">
          + Přidat produkt
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-cream-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              {card.link && (
                <Link href={card.link} className="text-gray-soft hover:text-forest">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-gray-soft mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-cream-dark">
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-dark">
          <h2 className="font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-forest" /> Poslední objednávky
          </h2>
          <Link href={`/${locale}/admin/objednavky`} className="text-sm text-forest hover:underline">
            Všechny →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark text-gray-soft text-xs">
                <th className="px-5 py-3 text-left">Číslo</th>
                <th className="px-5 py-3 text-left">Zákazník</th>
                <th className="px-5 py-3 text-left">Datum</th>
                <th className="px-5 py-3 text-left">Stav</th>
                <th className="px-5 py-3 text-right">Celkem</th>
                <th className="px-5 py-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map(order => (
                <tr key={order.id} className="border-b border-cream-dark hover:bg-cream/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-5 py-3">{order.email}</td>
                  <td className="px-5 py-3 text-gray-soft">{formatDate(order.createdAt || '', locale as Locale)}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold">{formatPrice(order.total)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/${locale}/admin/objednavky/${order.id}`} className="text-forest hover:underline text-xs">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-soft">Žádné objednávky</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
