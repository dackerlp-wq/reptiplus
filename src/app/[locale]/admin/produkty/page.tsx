'use client'
import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { toast } from '@/components/ui/Toaster'
import { Button } from '@/components/ui/Button'

interface Product {
  id: string; sku: string; name_cs: string; price: number; stock: number
  is_active: number; is_featured: number; is_new: number; is_sale: number
  category_id: string | null; images: string
}

export default function AdminProductsPage() {
  const locale = useLocale()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/products').then(r => r.json()).then(data => {
      setProducts(data.products || [])
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Smazat produkt "${name}"?`)) return
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts(p => p.filter(x => x.id !== id))
      toast('Produkt deaktivován', 'success')
    }
  }

  const filtered = products.filter(p =>
    p.name_cs.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produkty</h1>
        <Link href={`/${locale}/admin/produkty/novy`}>
          <Button>
            <Plus className="w-4 h-4" /> Přidat produkt
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-cream-dark">
        {/* Search */}
        <div className="px-4 py-3 border-b border-cream-dark flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-soft" />
          <input
            type="text"
            placeholder="Hledat produkt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm outline-none flex-1 placeholder-gray-soft"
          />
          <span className="text-xs text-gray-soft">{filtered.length} produktů</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-soft">Načítám...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-gray-soft text-xs">
                  <th className="px-4 py-3 text-left">Produkt</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-right">Cena</th>
                  <th className="px-4 py-3 text-right">Sklad</th>
                  <th className="px-4 py-3 text-center">Štítky</th>
                  <th className="px-4 py-3 text-right">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const images = JSON.parse(p.images || '[]') as string[]
                  return (
                    <tr key={p.id} className="border-b border-cream-dark hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cream rounded-lg flex items-center justify-center shrink-0">
                            {images[0] ? (
                              <img src={images[0]} alt="" className="w-10 h-10 object-contain rounded-lg p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            ) : (
                              <Package className="w-5 h-5 text-gray-soft" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{p.name_cs}</p>
                            {!p.is_active && <span className="text-xs text-red-500">Neaktivní</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-soft">{p.sku}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatPrice(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${p.stock <= 0 ? 'text-red-500' : p.stock <= 5 ? 'text-amber-600' : 'text-sage-dark'}`}>
                          {p.stock} ks
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {p.is_new === 1 && <span className="text-[10px] bg-forest text-white px-1.5 py-0.5 rounded-full">Nový</span>}
                          {p.is_sale === 1 && <span className="text-[10px] bg-gold text-charcoal px-1.5 py-0.5 rounded-full">Sleva</span>}
                          {p.is_featured === 1 && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Featured</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/${locale}/admin/produkty/${p.id}`} className="p-1.5 text-gray-soft hover:text-forest transition-colors">
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(p.id, p.name_cs)} className="p-1.5 text-gray-soft hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-soft">Žádné produkty</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
