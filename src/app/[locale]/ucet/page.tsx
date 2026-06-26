'use client'
import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, User, Heart, MapPin, LogOut } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import type { Locale } from '@/lib/i18n'

interface Order {
  id: string; orderNumber: string; status: string; total: number; createdAt: string
  paymentStatus: string; shippingMethod: string
}

interface SessionUser {
  id: string; email: string; firstName: string; lastName: string; role: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AccountPage() {
  const t = useTranslations('account')
  const locale = useLocale()
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'wishlist'>('orders')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.user) { router.push(`/${locale}/prihlaseni`); return }
        setUser(data.user)
        return fetch('/api/orders').then(r => r.json())
      })
      .then(data => { if (data?.orders) setOrders(data.orders) })
      .finally(() => setLoading(false))
  }, [locale, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast('Odhlášení úspěšné', 'info')
    router.push(`/${locale}`)
    router.refresh()
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-soft">Načítám...</div>
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-gray-soft mt-1">{user.firstName} {user.lastName} • {user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === 'admin' && (
            <Link href={`/${locale}/admin`}>
              <Button variant="outline" size="sm">Admin panel</Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Odhlásit se
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cream-dark mb-6">
        {([
          { key: 'orders', icon: Package, label: t('orders') },
          { key: 'profile', icon: User, label: t('profile') },
          { key: 'wishlist', icon: Heart, label: t('wishlist') },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.key ? 'border-forest text-forest' : 'border-transparent text-gray-soft hover:text-charcoal'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {activeTab === 'orders' && (
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 mx-auto text-cream-dark mb-3" />
              <p className="text-gray-soft">{t('no_orders')}</p>
              <Link href={`/${locale}/obchod`}>
                <Button className="mt-4" variant="outline">{t('go_to_shop')}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'
                const statusLabel = t(`status_${order.status}` as Parameters<typeof t>[0]) || order.status
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-cream-dark p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm">#{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                      </div>
                      <p className="text-xs text-gray-soft">{formatDate(order.createdAt || '', locale as Locale)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-forest">{formatPrice(order.total)}</p>
                      <Link href={`/${locale}/objednavka/${order.orderNumber}`} className="text-xs text-forest hover:underline mt-0.5 block">
                        {t('order_detail')} →
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-cream-dark p-6 max-w-lg">
          <h2 className="font-bold mb-4">Osobní údaje</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-soft">Jméno:</span> <strong>{user.firstName} {user.lastName}</strong></div>
            <div><span className="text-gray-soft">E-mail:</span> <strong>{user.email}</strong></div>
          </div>
          <p className="text-xs text-gray-soft mt-6">Pro změnu údajů nás kontaktujte na info@reptiplus.cz</p>
        </div>
      )}

      {/* Wishlist */}
      {activeTab === 'wishlist' && (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 mx-auto text-cream-dark mb-3" />
          <p className="text-gray-soft">Oblíbené produkty se zobrazí zde.</p>
        </div>
      )}
    </div>
  )
}
