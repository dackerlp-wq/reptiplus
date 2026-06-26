'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'

interface Category { id: string; name_cs: string }
interface ProductData {
  id?: string; nameCs?: string; nameEn?: string; nameDe?: string
  descriptionCs?: string; descriptionEn?: string; descriptionDe?: string
  sku?: string; price?: number; vatRate?: number; comparePrice?: number | null
  stock?: number; lowStockThreshold?: number; categoryId?: string | null
  images?: string[]; parameters?: Record<string, string>
  isActive?: number; isFeatured?: number; isNew?: number; isSale?: number; weight?: number | null
}

export default function ProductForm({ initialData }: { initialData?: ProductData }) {
  const locale = useLocale()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [paramKey, setParamKey] = useState('')
  const [paramValue, setParamValue] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const [form, setForm] = useState({
    nameCs: initialData?.nameCs || '',
    nameEn: initialData?.nameEn || '',
    nameDe: initialData?.nameDe || '',
    descriptionCs: initialData?.descriptionCs || '',
    descriptionEn: initialData?.descriptionEn || '',
    descriptionDe: initialData?.descriptionDe || '',
    sku: initialData?.sku || '',
    price: String(initialData?.price || ''),
    vatRate: String(initialData?.vatRate || '21'),
    comparePrice: String(initialData?.comparePrice || ''),
    stock: String(initialData?.stock ?? '0'),
    lowStockThreshold: String(initialData?.lowStockThreshold ?? '5'),
    categoryId: initialData?.categoryId || '',
    weight: String(initialData?.weight || ''),
    isActive: initialData?.isActive !== 0,
    isFeatured: !!initialData?.isFeatured,
    isNew: !!initialData?.isNew,
    isSale: !!initialData?.isSale,
    images: initialData?.images || [] as string[],
    parameters: initialData?.parameters || {} as Record<string, string>,
  })

  useEffect(() => {
    fetch('/api/admin/products').then(r => r.json()).then(() => {})
    fetch('/api/products?strana=1').then(r => r.json()).then(() => {})
    // Load categories
    fetch('/api/categories').then(r => r.json()).then(data => setCategories(data.categories || [])).catch(() => {})
  }, [])

  const addParam = () => {
    if (!paramKey || !paramValue) return
    setForm(f => ({ ...f, parameters: { ...f.parameters, [paramKey]: paramValue } }))
    setParamKey(''); setParamValue('')
  }

  const removeParam = (key: string) => {
    setForm(f => {
      const p = { ...f.parameters }
      delete p[key]
      return { ...f, parameters: p }
    })
  }

  const addImage = () => {
    if (!imageUrl.trim()) return
    setForm(f => ({ ...f, images: [...f.images, imageUrl.trim()] }))
    setImageUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nameCs || !form.price) { toast('Název a cena jsou povinné', 'error'); return }
    setLoading(true)

    const body = {
      ...form,
      isActive: form.isActive ? 1 : 0,
      isFeatured: form.isFeatured ? 1 : 0,
      isNew: form.isNew ? 1 : 0,
      isSale: form.isSale ? 1 : 0,
      categoryId: form.categoryId || null,
      comparePrice: form.comparePrice || null,
      weight: form.weight || null,
    }

    const url = initialData?.id ? `/api/admin/products/${initialData.id}` : '/api/admin/products'
    const method = initialData?.id ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      toast(initialData?.id ? 'Produkt upraven' : 'Produkt vytvořen', 'success')
      router.push(`/${locale}/admin/produkty`)
    } else {
      const data = await res.json()
      toast(data.error || 'Chyba', 'error')
    }
    setLoading(false)
  }

  const field = (key: keyof typeof form) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  })

  const checkbox = (key: 'isActive' | 'isFeatured' | 'isNew' | 'isSale') => ({
    checked: form[key] as boolean,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.checked }))
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Základní informace</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input id="nameCs" label="Název (CZ) *" {...field('nameCs')} required className="col-span-2" />
          <Input id="nameEn" label="Název (EN)" {...field('nameEn')} />
          <Input id="nameDe" label="Název (DE)" {...field('nameDe')} />
          <Input id="sku" label="SKU / kód" {...field('sku')} />
          <div>
            <label className="block text-sm font-medium mb-1">Kategorie</label>
            <select
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest"
            >
              <option value="">— bez kategorie —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_cs}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Descriptions */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Popis</h2>
        {['Cs', 'En', 'De'].map(lang => (
          <div key={lang} className="mb-4">
            <label className="block text-sm font-medium mb-1">Popis ({lang.toUpperCase()})</label>
            <textarea
              {...field(`description${lang}` as keyof typeof form)}
              rows={4}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none"
            />
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Cena & sklad</h2>
        <div className="grid grid-cols-3 gap-4">
          <Input id="price" label="Cena vč. DPH (Kč) *" type="number" step="0.01" {...field('price')} required />
          <Input id="comparePrice" label="Původní cena (Kč)" type="number" step="0.01" {...field('comparePrice')} />
          <Input id="vatRate" label="DPH (%)" type="number" {...field('vatRate')} />
          <Input id="stock" label="Skladem (ks)" type="number" {...field('stock')} />
          <Input id="lowStockThreshold" label="Min. sklad (varování)" type="number" {...field('lowStockThreshold')} />
          <Input id="weight" label="Hmotnost (kg)" type="number" step="0.001" {...field('weight')} />
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Obrázky</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="URL obrázku..."
            className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest"
          />
          <Button type="button" variant="outline" size="sm" onClick={addImage}>Přidat</Button>
        </div>
        {form.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.images.map((img, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg border border-cream-dark overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-contain p-1" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                  className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-soft mt-2">Vložte URL obrázku (https://...). Nahráváni souborů bude dostupné po konfiguraci úložiště.</p>
      </div>

      {/* Parameters */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Parametry</h2>
        <div className="flex gap-2 mb-3">
          <input value={paramKey} onChange={e => setParamKey(e.target.value)} placeholder="Název parametru" className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
          <input value={paramValue} onChange={e => setParamValue(e.target.value)} placeholder="Hodnota" className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
          <Button type="button" variant="outline" size="sm" onClick={addParam}>+</Button>
        </div>
        {Object.entries(form.parameters).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-sm py-1">
            <span className="font-medium w-32 shrink-0">{k}:</span>
            <span className="flex-1">{v}</span>
            <button type="button" onClick={() => removeParam(k)} className="text-gray-soft hover:text-red-500">✕</button>
          </div>
        ))}
      </div>

      {/* Flags */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Štítky & viditelnost</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { key: 'isActive', label: 'Aktivní (zobrazit)' },
            { key: 'isFeatured', label: 'Doporučený' },
            { key: 'isNew', label: 'Novinka' },
            { key: 'isSale', label: 'Ve slevě' },
          ] as const).map(flag => (
            <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...checkbox(flag.key)} className="w-4 h-4 accent-forest" />
              <span className="text-sm">{flag.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/admin/produkty`)}>Zrušit</Button>
        <Button type="submit" loading={loading}>
          {initialData?.id ? 'Uložit změny' : 'Vytvořit produkt'}
        </Button>
      </div>
    </form>
  )
}
