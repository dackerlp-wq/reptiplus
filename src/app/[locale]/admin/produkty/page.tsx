'use client'
import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Plus, Edit, Trash2, Search, Package, Download, Percent, Eye, EyeOff, CheckSquare, Square } from 'lucide-react'
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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [priceModal, setPriceModal] = useState(false)
  const [pricePercent, setPricePercent] = useState('0')
  const [bulkLoading, setBulkLoading] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/products').then(r => r.json()).then(data => {
      setProducts(data.products || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Smazat produkt "${name}"?`)) return
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) { setProducts(p => p.filter(x => x.id !== id)); toast('Produkt deaktivován', 'success') }
  }

  const filtered = products.filter(p =>
    p.name_cs.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id))
  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
  }
  const toggleOne = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const selectedIds = [...selected]

  const bulkAction = async (action: string, value?: number) => {
    if (selectedIds.length === 0) return
    setBulkLoading(true)
    try {
      if (action === 'export_csv') {
        const res = await fetch('/api/admin/products/bulk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ids: selectedIds }),
        })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'produkty.csv'; a.click()
        URL.revokeObjectURL(url)
      } else {
        const res = await fetch('/api/admin/products/bulk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ids: selectedIds, value }),
        })
        const data = await res.json()
        if (!res.ok) { toast(data.error || 'Chyba', 'error'); return }
        toast(`Hotovo — ${data.affected} produktů`, 'success')
        setSelected(new Set())
        load()
      }
    } catch { toast('Chyba', 'error') }
    setBulkLoading(false)
    setPriceModal(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Produkty</h1>
        <Link href={`/${locale}/admin/produkty/novy`}>
          <Button><Plus className="w-4 h-4" /> Přidat produkt</Button>
        </Link>
      </div>

      {/* Bulk toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-forest text-white rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">{selectedIds.length} vybráno</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" loading={bulkLoading}
              onClick={() => bulkAction('activate')}>
              <Eye className="w-4 h-4" /> Aktivovat
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" loading={bulkLoading}
              onClick={() => bulkAction('deactivate')}>
              <EyeOff className="w-4 h-4" /> Skrýt
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10"
              onClick={() => setPriceModal(true)}>
              <Percent className="w-4 h-4" /> Změnit cenu
            </Button>
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" loading={bulkLoading}
              onClick={() => bulkAction('export_csv')}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>
      )}

      {/* Price modal */}
      {priceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-lg mb-4">Změnit cenu ({selectedIds.length} produktů)</h3>
            <p className="text-sm text-gray-soft mb-3">Zadejte procento změny (kladné = zdražení, záporné = sleva)</p>
            <div className="flex items-center gap-2 mb-4">
              <input type="number" value={pricePercent} onChange={e => setPricePercent(e.target.value)}
                className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest"
                placeholder="Např. 10 = +10%" />
              <span className="text-sm font-medium">%</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPriceModal(false)}>Zrušit</Button>
              <Button loading={bulkLoading} onClick={() => bulkAction('price_percent', parseFloat(pricePercent || '0'))}>
                Použít
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-cream-dark">
        <div className="px-4 py-3 border-b border-cream-dark flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-soft" />
          <input type="text" placeholder="Hledat produkt..." value={search} onChange={e => setSearch(e.target.value)}
            className="text-sm outline-none flex-1 placeholder-gray-soft" />
          <span className="text-xs text-gray-soft">{filtered.length} produktů</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-soft">Načítám...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-gray-soft text-xs">
                  <th className="px-4 py-3 text-left w-10">
                    <button onClick={toggleAll} className="text-gray-soft hover:text-forest">
                      {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
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
                  const isSelected = selected.has(p.id)
                  return (
                    <tr key={p.id} className={`border-b border-cream-dark transition-colors ${isSelected ? 'bg-forest/5' : 'hover:bg-cream/40'}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleOne(p.id)} className="text-gray-soft hover:text-forest">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-forest" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cream rounded-lg flex items-center justify-center shrink-0">
                            {images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={images[0]} alt="" className="w-10 h-10 object-contain rounded-lg p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            ) : <Package className="w-5 h-5 text-gray-soft" />}
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
                  <tr><td colSpan={7} className="py-12 text-center text-gray-soft">Žádné produkty</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
