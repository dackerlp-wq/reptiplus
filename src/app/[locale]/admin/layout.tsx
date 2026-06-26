'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag, BookOpen,
  Settings, Menu, X, LogOut, ChevronRight
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/produkty', label: 'Produkty', icon: Package },
  { href: '/admin/objednavky', label: 'Objednávky', icon: ShoppingBag },
  { href: '/admin/zakaznici', label: 'Zákazníci', icon: Users },
  { href: '/admin/kupony', label: 'Kupóny', icon: Tag },
  { href: '/admin/blog', label: 'Blog', icon: BookOpen },
  { href: '/admin/nastaveni', label: 'Nastavení', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState<{ firstName: string; role: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (!data.user || data.user.role !== 'admin') {
        router.push(`/${locale}/prihlaseni`)
      } else {
        setUser(data.user)
      }
    })
  }, [locale, router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}`)
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-soft">Načítám...</div></div>
  }

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-forest text-white flex flex-col transition-all duration-200 shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-forest-light/30">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center shrink-0">
            <span className="text-charcoal font-bold">R</span>
          </div>
          {sidebarOpen && <span className="font-bold">Admin</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(item => {
            const href = `/${locale}${item.href}`
            const isActive = pathname === href || (item.href !== '/admin' && pathname.startsWith(href))
            return (
              <Link
                key={item.href}
                href={href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-forest-light/30 text-gold' : 'text-sage hover:text-white hover:bg-forest-light/20'}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-forest-light/30">
          <button onClick={handleLogout} className="flex items-center gap-3 text-sage hover:text-white transition-colors text-sm w-full">
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Odhlásit se</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-cream-dark px-4 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(o => !o)} className="text-gray-soft hover:text-charcoal">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-soft">
            <Link href={`/${locale}`} className="hover:text-forest">Reptiplus</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Admin</span>
          </div>
          <div className="ml-auto text-sm text-gray-soft">
            Přihlášen: <strong className="text-charcoal">{user.firstName}</strong>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
