'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ProductCard, { type Product } from '@/components/shop/ProductCard'

type Tab = 'featured' | 'new' | 'sale'

interface Props {
  featured: Product[]
  newProds: Product[]
  saleProds: Product[]
  locale: string
  labels: { featured: string; new: string; sale: string; viewAll: string }
}

export default function HomeProductTabs({ featured, newProds, saleProds, locale, labels }: Props) {
  const [active, setActive] = useState<Tab>('featured')

  const tabs: { key: Tab; label: string; products: Product[]; href: string }[] = [
    { key: 'featured', label: labels.featured, products: featured, href: `/${locale}/obchod?filtr=doporucene` },
    { key: 'new',      label: labels.new,      products: newProds,   href: `/${locale}/obchod?filtr=novinka` },
    { key: 'sale',     label: labels.sale,     products: saleProds,  href: `/${locale}/obchod?filtr=sleva` },
  ]

  const current = tabs.find(t => t.key === active)!

  return (
    <section className="max-w-7xl mx-auto px-4 pb-12">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex gap-1 bg-cream-dark rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active === tab.key
                  ? 'bg-white text-forest shadow-sm'
                  : 'text-gray-soft hover:text-charcoal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Link href={current.href} className="flex items-center gap-1 text-sm text-forest font-medium hover:underline">
          Zobrazit vše <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {current.products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {current.products.map(p => (
            <ProductCard key={p.id} product={p} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="text-gray-soft text-sm py-8 text-center">Žádné produkty v této kategorii.</p>
      )}
    </section>
  )
}
