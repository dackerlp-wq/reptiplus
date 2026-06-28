'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import {
  Upload, X, Wand2, Plus, Trash2, ChevronDown, ChevronUp,
  Package, Tag, Percent, Layers, Zap, GripVertical,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Category = { id: string; name_cs: string; parent_id: string | null; sort_order: number }

type Axis = { name: string; values: string[]; newVal: string }

type Variant = {
  id?: string
  name_cs: string; name_en: string; name_de: string
  sku: string; price: string; compare_price: string; stock: string; restock_date: string
  attributes: Record<string, string>
  parameters: Record<string, string>
  expanded: boolean
  newParamKey: string; newParamVal: string
}

interface ProductData {
  id?: string; nameCs?: string; nameEn?: string; nameDe?: string
  descriptionCs?: string; descriptionEn?: string; descriptionDe?: string
  sku?: string; price?: number; vatRate?: number; comparePrice?: number | null
  stock?: number; lowStockThreshold?: number; categoryId?: string | null
  images?: string[]; parameters?: Record<string, string>
  isActive?: number; isFeatured?: number; isNew?: number; isSale?: number; weight?: number | null
}

function makeVariant(attrs: Record<string, string> = {}, expanded = true): Variant {
  return {
    name_cs: Object.values(attrs).join(' / '),
    name_en: '', name_de: '', sku: '', price: '', compare_price: '', stock: '0', restock_date: '',
    attributes: attrs, parameters: {},
    expanded, newParamKey: '', newParamVal: '',
  }
}

function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]]
  const [first, ...rest] = arrays
  const restCombos = cartesian(rest)
  return first.flatMap(item => restCombos.map(combo => [item, ...combo]))
}

// Format date to Czech locale
function fmtDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return dateStr }
}

export default function ProductForm({ initialData }: { initialData?: ProductData }) {
  const locale = useLocale()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [descLang, setDescLang] = useState<'cs' | 'en' | 'de'>('cs')
  const [nameLang, setNameLang] = useState<'cs' | 'en' | 'de'>('cs')
  const [variants, setVariants] = useState<Variant[]>([])
  const [showMatrix, setShowMatrix] = useState(true)
  const [axes, setAxes] = useState<Axis[]>([
    { name: 'Barva', values: [], newVal: '' },
  ])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')

  const [paramKey, setParamKey] = useState('')
  const [paramValue, setParamValue] = useState('')

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
    fetch('/api/admin/categories').then(r => r.json())
      .then(d => setCategories(d.categories || [])).catch(() => {})

    if (initialData?.id) {
      fetch(`/api/admin/products/${initialData.id}/variants`).then(r => r.json())
        .then(d => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const loaded = (d.variants || []).map((v: any, idx: number): Variant => ({
            id: v.id,
            name_cs: v.name_cs || '', name_en: v.name_en || '', name_de: v.name_de || '',
            sku: v.sku || '', price: v.price !== null ? String(v.price) : '',
            compare_price: v.compare_price !== null && v.compare_price !== undefined ? String(v.compare_price) : '',
            stock: String(v.stock ?? 0), restock_date: v.restock_date || '',
            attributes: v.attributes || {}, parameters: v.parameters || {},
            expanded: idx === 0, newParamKey: '', newParamVal: '',
          }))
          if (loaded.length > 0) { setVariants(loaded); setShowMatrix(false) }
        }).catch(() => {})
    }
  }, [initialData?.id])

  // ── Category helpers ──────────────────────────────────────
  const buildCategoryOptions = () => {
    const roots = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
    const result: { id: string; label: string }[] = []
    for (const root of roots) {
      result.push({ id: root.id, label: root.name_cs })
      categories.filter(c => c.parent_id === root.id).sort((a, b) => a.sort_order - b.sort_order)
        .forEach(child => result.push({ id: child.id, label: `↳ ${child.name_cs}` }))
    }
    return result
  }

  // ── AI translate ──────────────────────────────────────────
  const autoTranslate = async () => {
    if (!form.nameCs) { toast('Nejdřív vyplňte český název', 'error'); return }
    setTranslating(true)
    try {
      const paramJson = Object.keys(form.parameters).length > 0 ? JSON.stringify(form.parameters) : undefined
      const res = await fetch('/api/admin/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameCs: form.nameCs, descriptionCs: form.descriptionCs, ...(paramJson ? { parametersCs: paramJson } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Překlad selhal', 'error'); return }
      setForm(f => ({ ...f, nameEn: data.nameEn || f.nameEn, nameDe: data.nameDe || f.nameDe, descriptionEn: data.descriptionEn || f.descriptionEn, descriptionDe: data.descriptionDe || f.descriptionDe }))
      toast('Přeloženo ✓', 'success')
    } catch { toast('Překlad selhal', 'error') }
    setTranslating(false)
  }

  const translateVariant = async (idx: number) => {
    const v = variants[idx]
    if (!v.name_cs) { toast('Vyplňte český název varianty', 'error'); return }
    setTranslating(true)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameCs: v.name_cs }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Překlad selhal', 'error'); return }
      setV(idx, { name_en: data.nameEn || v.name_en, name_de: data.nameDe || v.name_de })
      toast('Přeloženo ✓', 'success')
    } catch { toast('Překlad selhal', 'error') }
    setTranslating(false)
  }

  // ── Product parameters ────────────────────────────────────
  const addParam = () => {
    if (!paramKey || !paramValue) return
    setForm(f => ({ ...f, parameters: { ...f.parameters, [paramKey]: paramValue } }))
    setParamKey(''); setParamValue('')
  }
  const removeParam = (key: string) =>
    setForm(f => { const p = { ...f.parameters }; delete p[key]; return { ...f, parameters: p } })

  // ── Images ────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: false })
      if (error) { toast(`Chyba: ${file.name}`, 'error'); continue }
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      setForm(f => ({ ...f, images: [...f.images, data.publicUrl] }))
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const removeImage = (i: number) => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))
  const moveImage = (from: number, to: number) => {
    setForm(f => { const imgs = [...f.images]; const [item] = imgs.splice(from, 1); imgs.splice(to, 0, item); return { ...f, images: imgs } })
  }

  // ── Matrix generator ──────────────────────────────────────
  const comboCount = axes.reduce((acc, ax) => acc * (ax.values.length || 1), axes.some(ax => ax.values.length > 0) ? 1 : 0)

  const addAxisValue = (i: number) => {
    const val = axes[i].newVal.trim()
    if (!val || axes[i].values.includes(val)) return
    setAxes(ax => ax.map((a, j) => j === i ? { ...a, values: [...a.values, val], newVal: '' } : a))
  }
  const removeAxisValue = (axIdx: number, val: string) =>
    setAxes(ax => ax.map((a, j) => j === axIdx ? { ...a, values: a.values.filter(v => v !== val) } : a))
  const updateAxis = (i: number, patch: Partial<Axis>) =>
    setAxes(ax => ax.map((a, j) => j === i ? { ...a, ...patch } : a))
  const removeAxis = (i: number) => setAxes(ax => ax.filter((_, j) => j !== i))
  const addAxis = () => setAxes(ax => [...ax, { name: '', values: [], newVal: '' }])

  const generateFromMatrix = () => {
    const validAxes = axes.filter(a => a.values.length > 0)
    if (validAxes.length === 0) { toast('Přidejte alespoň jednu osu s hodnotami', 'error'); return }
    const combos = cartesian(validAxes.map(a => a.values.map(v => ({ axis: a.name || 'Typ', val: v }))))
    const newVariants: Variant[] = combos.map(combo => {
      const attrs: Record<string, string> = {}
      combo.forEach(c => { attrs[c.axis] = c.val })
      return makeVariant(attrs, false)
    })
    setVariants(newVariants)
    setSelectedRows(new Set())
    setShowMatrix(false)
  }

  // ── Variant helpers ───────────────────────────────────────
  const setV = (i: number, patch: Partial<Variant>) =>
    setVariants(vs => vs.map((v, j) => j === i ? { ...v, ...patch } : v))
  const toggleExpand = (i: number) => setV(i, { expanded: !variants[i].expanded })
  const removeVariant = (i: number) => {
    if (!confirm(`Smazat variantu "${variants[i].name_cs || 'bez názvu'}"?`)) return
    setVariants(vs => vs.filter((_, j) => j !== i))
    setSelectedRows(s => { const n = new Set(s); n.delete(i); return n })
  }
  const addManualRow = () => {
    setVariants(vs => [...vs, makeVariant({}, true)])
    setShowMatrix(false)
  }

  const addVariantParam = (i: number) => {
    const v = variants[i]
    if (!v.newParamKey || !v.newParamVal) return
    setV(i, { parameters: { ...v.parameters, [v.newParamKey]: v.newParamVal }, newParamKey: '', newParamVal: '' })
  }
  const removeVariantParam = (i: number, key: string) => {
    const params = { ...variants[i].parameters }; delete params[key]
    setV(i, { parameters: params })
  }

  // ── Bulk actions ──────────────────────────────────────────
  const toggleRow = (i: number) => {
    setSelectedRows(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  }
  const toggleAll = () => {
    if (selectedRows.size === variants.length) setSelectedRows(new Set())
    else setSelectedRows(new Set(variants.map((_, i) => i)))
  }
  const targets = (sel: Set<number>) => sel.size > 0 ? [...sel] : variants.map((_, i) => i)

  const bulkSetPrice = () => {
    if (!bulkPrice) return
    targets(selectedRows).forEach(i => setV(i, { price: bulkPrice }))
  }
  const bulkSetStock = () => {
    if (!bulkStock) return
    targets(selectedRows).forEach(i => setV(i, { stock: bulkStock }))
  }
  const bulkDelete = () => {
    const sel = [...selectedRows]
    if (sel.length === 0) return
    if (!confirm(`Smazat ${sel.length} variant?`)) return
    setVariants(vs => vs.filter((_, i) => !sel.includes(i)))
    setSelectedRows(new Set())
  }

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nameCs || !form.price) { toast('Název (CZ) a cena jsou povinné', 'error'); return }
    if (variants.some(v => !v.name_cs)) { toast('Každá varianta musí mít český název', 'error'); return }
    setLoading(true)

    const body = {
      ...form,
      isActive: form.isActive ? 1 : 0, isFeatured: form.isFeatured ? 1 : 0,
      isNew: form.isNew ? 1 : 0, isSale: form.isSale ? 1 : 0,
      categoryId: form.categoryId || null, comparePrice: form.comparePrice || null, weight: form.weight || null,
    }
    const url = initialData?.id ? `/api/admin/products/${initialData.id}` : '/api/admin/products'
    const res = await fetch(url, { method: initialData?.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    if (res.ok) {
      const rd = await res.json()
      const productId = initialData?.id || rd.id
      await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: variants.map((v, i) => ({
            name_cs: v.name_cs, name_en: v.name_en || v.name_cs, name_de: v.name_de || v.name_cs,
            sku: v.sku || null, price: v.price ? parseFloat(v.price) : null,
            compare_price: v.compare_price ? parseFloat(v.compare_price) : null,
            stock: parseInt(v.stock || '0'), restock_date: v.restock_date || null,
            attributes: v.attributes, parameters: v.parameters, sort_order: i,
          })),
        }),
      }).catch(() => {})
      toast(initialData?.id ? 'Produkt uložen' : 'Produkt vytvořen', 'success')
      router.push(`/${locale}/admin/produkty`)
    } else {
      const d = await res.json()
      toast(d.error || 'Chyba při ukládání', 'error')
    }
    setLoading(false)
  }

  const catOptions = buildCategoryOptions()
  const stockStatus = (stock: string, restock: string) => {
    const n = parseInt(stock || '0')
    if (n > 5) return { dot: 'bg-emerald-500', label: `${n} ks`, cls: 'text-emerald-700' }
    if (n > 0) return { dot: 'bg-amber-400', label: `Málo — ${n} ks`, cls: 'text-amber-700' }
    return { dot: 'bg-red-400', label: restock ? `Dodání ${fmtDate(restock)}` : 'Vyprodáno', cls: 'text-red-600' }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="pb-24">
      <div className="grid grid-cols-3 gap-6 mb-6">

        {/* ── LEFT ── */}
        <div className="col-span-2 space-y-5">

          {/* Název */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2"><Package className="w-4 h-4 text-forest" />Název produktu</h2>
              <Button type="button" variant="outline" size="sm" onClick={autoTranslate} loading={translating}>
                <Wand2 className="w-4 h-4" /> Přeložit AI
              </Button>
            </div>
            <div className="flex gap-1 mb-3">
              {(['cs', 'en', 'de'] as const).map(lang => (
                <button key={lang} type="button" onClick={() => setNameLang(lang)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${nameLang === lang ? 'bg-forest text-white' : 'bg-cream-dark text-gray-soft hover:text-charcoal'}`}>
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <div className={nameLang !== 'cs' ? 'hidden' : ''}>
              <Input id="nameCs" label="Název (CZ) *" value={form.nameCs} required onChange={e => setForm(f => ({ ...f, nameCs: e.target.value }))} placeholder="Název produktu v češtině..." />
            </div>
            <div className={nameLang !== 'en' ? 'hidden' : ''}>
              <Input id="nameEn" label="Název (EN)" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} placeholder="Product name in English..." />
            </div>
            <div className={nameLang !== 'de' ? 'hidden' : ''}>
              <Input id="nameDe" label="Název (DE)" value={form.nameDe} onChange={e => setForm(f => ({ ...f, nameDe: e.target.value }))} placeholder="Produktname auf Deutsch..." />
            </div>
            <div className="mt-3">
              <Input id="sku" label="SKU / kód produktu" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Např. REP-001" />
            </div>
          </div>

          {/* Popis */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Popis</h2>
              <div className="flex gap-1">
                {(['cs', 'en', 'de'] as const).map(lang => (
                  <button key={lang} type="button" onClick={() => setDescLang(lang)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${descLang === lang ? 'bg-forest text-white' : 'bg-cream-dark text-gray-soft hover:text-charcoal'}`}>
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className={descLang !== 'cs' ? 'hidden' : ''}><RichEditor value={form.descriptionCs} onChange={val => setForm(f => ({ ...f, descriptionCs: val }))} placeholder="Popis v češtině..." /></div>
            <div className={descLang !== 'en' ? 'hidden' : ''}><RichEditor value={form.descriptionEn} onChange={val => setForm(f => ({ ...f, descriptionEn: val }))} placeholder="Description in English..." /></div>
            <div className={descLang !== 'de' ? 'hidden' : ''}><RichEditor value={form.descriptionDe} onChange={val => setForm(f => ({ ...f, descriptionDe: val }))} placeholder="Beschreibung auf Deutsch..." /></div>
          </div>

          {/* Obrázky */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <h2 className="font-bold mb-4">Obrázky</h2>
            <div className="border-2 border-dashed border-cream-dark rounded-xl p-8 text-center cursor-pointer hover:border-forest/50 hover:bg-sage/10 transition-colors mb-4"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) handleImageUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>) }}>
              <Upload className="w-8 h-8 text-gray-soft mx-auto mb-2" />
              <p className="text-sm text-gray-soft">Přetáhni sem nebo <span className="text-forest font-medium">klikni pro výběr</span></p>
              <p className="text-xs text-gray-soft mt-1">JPG, PNG, WebP · max 5 MB</p>
              {uploading && <p className="text-sm text-forest mt-2 animate-pulse">Nahrávám...</p>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            {form.images.length > 0 && (
              <>
                <p className="text-xs text-gray-soft mb-2"><strong>První obrázek = hlavní.</strong></p>
                <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                  {form.images.map((img, i) => (
                    <div key={img + i} className="relative group">
                      {i === 0 && <span className="absolute top-1 left-1 z-10 bg-forest text-white text-[10px] px-1 py-0.5 rounded leading-tight">Hlavní</span>}
                      <div className="aspect-square rounded-lg border-2 border-cream-dark overflow-hidden bg-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                        {i > 0 && <button type="button" onClick={() => moveImage(i, i - 1)} className="bg-white/90 text-charcoal rounded px-1.5 py-0.5 text-xs font-bold">←</button>}
                        <button type="button" onClick={() => removeImage(i)} className="bg-red-500 text-white rounded p-1"><X className="w-3 h-3" /></button>
                        {i < form.images.length - 1 && <button type="button" onClick={() => moveImage(i, i + 1)} className="bg-white/90 text-charcoal rounded px-1.5 py-0.5 text-xs font-bold">→</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Parametry produktu */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <h2 className="font-bold mb-1">Parametry produktu</h2>
            <p className="text-xs text-gray-soft mb-4">Společné pro všechny varianty. Odlišné parametry přidejte přímo ke každé variantě.</p>
            <div className="flex gap-2 mb-3">
              <input value={paramKey} onChange={e => setParamKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addParam())}
                placeholder="Název (např. Výkon)" className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
              <input value={paramValue} onChange={e => setParamValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addParam())}
                placeholder="Hodnota (např. 35W)" className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
              <Button type="button" variant="outline" size="sm" onClick={addParam}><Plus className="w-4 h-4" /> Přidat</Button>
            </div>
            {Object.keys(form.parameters).length > 0 ? (
              <div className="rounded-lg border border-cream-dark overflow-hidden">
                {Object.entries(form.parameters).map(([k, v], idx) => (
                  <div key={k} className={`flex items-center gap-3 px-3 py-2 text-sm ${idx % 2 === 0 ? '' : 'bg-cream/50'}`}>
                    <span className="font-medium w-36 shrink-0">{k}</span>
                    <span className="flex-1 text-gray-soft">{v}</span>
                    <button type="button" onClick={() => removeParam(k)} className="text-gray-soft hover:text-red-500 p-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-soft italic">Žádné parametry.</p>}
          </div>
        </div>

        {/* ── RIGHT sidebar ── */}
        <div className="space-y-4">
          {/* Stav */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3">Stav produktu</h3>
            <label className="flex items-center justify-between cursor-pointer" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}>
              <div>
                <p className="font-medium text-sm">{form.isActive ? 'Aktivní' : 'Neaktivní'}</p>
                <p className="text-xs text-gray-soft">{form.isActive ? 'Zobrazuje se v obchodě' : 'Skryto zákazníkům'}</p>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.isActive ? 'bg-forest' : 'bg-cream-dark'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? 'left-6' : 'left-1'}`} />
              </div>
            </label>
          </div>

          {/* Štítky */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-forest" />Štítky</h3>
            <div className="space-y-2.5">
              {([
                { key: 'isNew' as const, label: 'Novinka', desc: 'Badge "Nový"', color: 'bg-forest' },
                { key: 'isSale' as const, label: 'Ve slevě', desc: 'Badge "Sleva"', color: 'bg-gold' },
                { key: 'isFeatured' as const, label: 'Doporučený', desc: 'V menu a na HP', color: 'bg-purple-500' },
              ]).map(flag => (
                <label key={flag.key} className="flex items-center gap-3 cursor-pointer group" onClick={() => setForm(f => ({ ...f, [flag.key]: !f[flag.key] }))}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${form[flag.key] ? `${flag.color} border-transparent` : 'border-cream-dark group-hover:border-forest/50'}`}>
                    {form[flag.key] && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                  </div>
                  <div><p className="text-sm font-medium leading-none">{flag.label}</p><p className="text-xs text-gray-soft">{flag.desc}</p></div>
                </label>
              ))}
            </div>
          </div>

          {/* Organizace */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3">Kategorie</h3>
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest">
              <option value="">— bez kategorie —</option>
              {catOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {/* Cena */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Percent className="w-4 h-4 text-forest" />Cena</h3>
            <div className="space-y-3">
              <Input id="price" label="Prodejní cena (Kč vč. DPH) *" type="number" step="0.01" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <Input id="comparePrice" label="Přeškrtnutá cena (Kč)" type="number" step="0.01" value={form.comparePrice} onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value }))} />
              <div>
                <label className="block text-xs font-medium text-gray-soft mb-1">Sazba DPH</label>
                <select value={form.vatRate} onChange={e => setForm(f => ({ ...f, vatRate: e.target.value }))}
                  className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest">
                  <option value="21">21 % (standardní)</option>
                  <option value="12">12 % (snížená)</option>
                  <option value="0">0 % (osvobozeno)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sklad */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Layers className="w-4 h-4 text-forest" />Sklad & logistika</h3>
            <div className="space-y-3">
              <Input id="stock" label="Kusů skladem" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              <Input id="lowStockThreshold" label="Varovat při (ks)" type="number" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
              <Input id="weight" label="Hmotnost (kg)" type="number" step="0.001" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            {variants.length > 0 && (
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg p-2">⚠ Sklad se řídí podle každé varianty zvlášť.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Varianty (full-width) ── */}
      <div className="bg-white rounded-xl border border-cream-dark p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-forest" />Varianty produktu</h2>
            <p className="text-xs text-gray-soft mt-0.5">Různá provedení — barva, velikost, výkon… Každá varianta má vlastní cenu, sklad a parametry.</p>
          </div>
          {variants.length > 0 && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowMatrix(m => !m)}>
                <Zap className="w-4 h-4" /> {showMatrix ? 'Skrýt generátor' : 'Generovat z matice'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addManualRow}>
                <Plus className="w-4 h-4" /> Přidat ručně
              </Button>
            </div>
          )}
        </div>

        {/* ── Matrix generator ── */}
        {(showMatrix || variants.length === 0) && (
          <div className="mt-4 border border-cream-dark rounded-xl p-4 bg-cream/40">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-soft mb-3">⚡ Generátor kombinací</p>
            <div className="space-y-3 mb-4">
              {axes.map((axis, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-cream-dark">
                  <div className="w-28 shrink-0">
                    <label className="block text-[10px] font-bold text-gray-soft uppercase mb-1">Osa</label>
                    <input value={axis.name} onChange={e => updateAxis(i, { name: e.target.value })}
                      placeholder="Barva, Velikost…"
                      className="w-full border border-cream-dark rounded px-2 py-1.5 text-sm focus:outline-none focus:border-forest" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-soft uppercase mb-1">Hodnoty</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {axis.values.map(val => (
                        <span key={val} className="inline-flex items-center gap-1 bg-sage/40 text-forest text-xs font-semibold px-2 py-1 rounded-lg">
                          {val}
                          <button type="button" onClick={() => removeAxisValue(i, val)} className="hover:text-red-500 transition-colors leading-none">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={axis.newVal} onChange={e => updateAxis(i, { newVal: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAxisValue(i))}
                        placeholder="Hodnota + Enter"
                        className="flex-1 border border-cream-dark rounded px-2 py-1.5 text-sm focus:outline-none focus:border-forest" />
                      <button type="button" onClick={() => addAxisValue(i)}
                        className="px-3 py-1.5 bg-forest/10 text-forest text-xs font-bold rounded hover:bg-forest/20 transition-colors">
                        + Přidat
                      </button>
                    </div>
                  </div>
                  {axes.length > 1 && (
                    <button type="button" onClick={() => removeAxis(i)}
                      className="p-1.5 text-gray-soft hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 mt-5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={addAxis}
                  className="text-sm text-forest font-medium hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Přidat osu
                </button>
                {comboCount > 0 && (
                  <span className="text-xs text-gray-soft">
                    Vygeneruje <strong className="text-charcoal">{comboCount} variant</strong> ({axes.filter(a => a.values.length > 0).map(a => a.values.length).join(' × ')})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addManualRow}>Přidat ručně</Button>
                <Button type="button" size="sm" onClick={generateFromMatrix} disabled={comboCount === 0}>
                  <Zap className="w-4 h-4" /> Generovat {comboCount > 0 ? `(${comboCount})` : ''}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Variant table ── */}
        {variants.length > 0 && !showMatrix && (
          <div className="mt-4">
            {/* Bulk actions */}
            <div className="flex items-center gap-3 p-3 bg-cream/60 rounded-xl mb-3 flex-wrap">
              <span className="text-xs font-bold text-gray-soft uppercase tracking-wider">Hromadně:</span>
              <div className="flex items-center gap-2">
                <input value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} type="number" placeholder="Cena Kč"
                  className="border border-cream-dark rounded-lg px-2 py-1.5 text-sm w-24 focus:outline-none focus:border-forest bg-white" />
                <button type="button" onClick={bulkSetPrice}
                  className="text-xs font-semibold px-3 py-1.5 bg-white border border-cream-dark rounded-lg hover:border-forest hover:text-forest transition-colors">
                  Nastavit cenu
                </button>
              </div>
              <div className="w-px h-4 bg-cream-dark" />
              <div className="flex items-center gap-2">
                <input value={bulkStock} onChange={e => setBulkStock(e.target.value)} type="number" placeholder="Sklad ks"
                  className="border border-cream-dark rounded-lg px-2 py-1.5 text-sm w-24 focus:outline-none focus:border-forest bg-white" />
                <button type="button" onClick={bulkSetStock}
                  className="text-xs font-semibold px-3 py-1.5 bg-white border border-cream-dark rounded-lg hover:border-forest hover:text-forest transition-colors">
                  Nastavit sklad
                </button>
              </div>
              {selectedRows.size > 0 && (
                <>
                  <div className="w-px h-4 bg-cream-dark" />
                  <button type="button" onClick={bulkDelete}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3 inline mr-1" />Smazat vybrané ({selectedRows.size})
                  </button>
                </>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-cream-dark">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cream/60 border-b border-cream-dark">
                    <th className="px-3 py-2 w-8">
                      <input type="checkbox" className="accent-forest w-4 h-4 cursor-pointer"
                        checked={selectedRows.size === variants.length && variants.length > 0}
                        onChange={toggleAll} />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-soft uppercase tracking-wider">Varianta</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-soft uppercase tracking-wider w-28">Cena (Kč)</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-soft uppercase tracking-wider w-28">Přeškrt. cena</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-soft uppercase tracking-wider w-24">Sklad</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-soft uppercase tracking-wider">Stav zásoby</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-soft uppercase tracking-wider w-32">SKU</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-soft uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-dark">
                  {variants.map((v, i) => {
                    const st = stockStatus(v.stock, v.restock_date)
                    const isSelected = selectedRows.has(i)
                    return (
                      <>
                        <tr key={i} className={`transition-colors ${isSelected ? 'bg-forest/5' : 'hover:bg-cream/40'}`}>
                          <td className="px-3 py-2.5">
                            <input type="checkbox" className="accent-forest w-4 h-4 cursor-pointer"
                              checked={isSelected} onChange={() => toggleRow(i)} />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {Object.entries(v.attributes).length > 0
                                ? Object.entries(v.attributes).map(([k, val]) => (
                                    <span key={k} className="text-xs bg-sage/30 text-forest font-semibold px-2 py-0.5 rounded-lg">
                                      {val} <span className="font-normal opacity-60">{k}</span>
                                    </span>
                                  ))
                                : <span className="text-xs text-gray-soft italic">bez atributů</span>
                              }
                              <button type="button" onClick={() => toggleExpand(i)}
                                className="text-[10px] font-semibold text-gray-soft hover:text-forest transition-colors px-1.5 py-0.5 rounded bg-cream-dark hover:bg-sage/30 ml-1">
                                {v.expanded ? '▲ méně' : '▼ více'}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <input type="number" step="0.01" value={v.price}
                              onChange={e => setV(i, { price: e.target.value })}
                              placeholder="z produktu"
                              className="w-full border border-cream-dark rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-forest" />
                          </td>
                          <td className="px-3 py-2.5">
                            <input type="number" step="0.01" value={v.compare_price}
                              onChange={e => setV(i, { compare_price: e.target.value })}
                              placeholder="—"
                              className="w-full border border-cream-dark rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-forest" />
                          </td>
                          <td className="px-3 py-2.5">
                            <input type="number" value={v.stock}
                              onChange={e => setV(i, { stock: e.target.value })}
                              className="w-full border border-cream-dark rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-forest" />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                              <span className={`text-xs font-medium ${st.cls}`}>{st.label}</span>
                            </div>
                            {parseInt(v.stock || '0') <= 0 && (
                              <div className="mt-1">
                                <label className="text-[10px] text-gray-soft font-medium">Dodání</label>
                                <input type="date" value={v.restock_date}
                                  onChange={e => setV(i, { restock_date: e.target.value })}
                                  className="block w-full border border-cream-dark rounded px-1.5 py-1 text-xs focus:outline-none focus:border-forest mt-0.5" />
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <input type="text" value={v.sku}
                              onChange={e => setV(i, { sku: e.target.value })}
                              placeholder="REP-001"
                              className="w-full border border-cream-dark rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:border-forest" />
                          </td>
                          <td className="px-3 py-2.5">
                            <button type="button" onClick={() => removeVariant(i)}
                              className="p-1.5 text-gray-soft hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {v.expanded && (
                          <tr key={`exp-${i}`} className="bg-cream/30">
                            <td />
                            <td colSpan={6} className="px-4 py-4">
                              <div className="grid grid-cols-2 gap-6">
                                {/* Names */}
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-soft mb-2">Překlady názvu</p>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold w-6 text-gray-soft">CZ</span>
                                      <input value={v.name_cs} onChange={e => setV(i, { name_cs: e.target.value })}
                                        className="flex-1 border border-cream-dark rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-forest" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold w-6 text-gray-soft">EN</span>
                                      <input value={v.name_en} onChange={e => setV(i, { name_en: e.target.value })}
                                        className="flex-1 border border-cream-dark rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-forest" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold w-6 text-gray-soft">DE</span>
                                      <input value={v.name_de} onChange={e => setV(i, { name_de: e.target.value })}
                                        className="flex-1 border border-cream-dark rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-forest" />
                                    </div>
                                    <button type="button" onClick={() => translateVariant(i)} disabled={translating}
                                      className="text-xs text-forest font-medium hover:underline flex items-center gap-1 mt-1">
                                      <Wand2 className="w-3 h-3" /> Přeložit AI
                                    </button>
                                  </div>
                                </div>

                                {/* Variant-specific params */}
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-soft mb-2">Specifické parametry varianty</p>
                                  {Object.keys(v.parameters).length > 0 && (
                                    <div className="rounded-lg border border-cream-dark overflow-hidden mb-2">
                                      {Object.entries(v.parameters).map(([k, val], idx) => (
                                        <div key={k} className={`flex items-center gap-2 px-3 py-1.5 text-sm ${idx % 2 === 0 ? '' : 'bg-cream/50'}`}>
                                          <span className="font-medium w-28 shrink-0">{k}</span>
                                          <span className="flex-1 text-gray-soft">{val}</span>
                                          <button type="button" onClick={() => removeVariantParam(i, k)} className="text-gray-soft hover:text-red-500 p-1"><X className="w-3 h-3" /></button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <input value={v.newParamKey} onChange={e => setV(i, { newParamKey: e.target.value })}
                                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariantParam(i))}
                                      placeholder="Parametr"
                                      className="flex-1 border border-cream-dark rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-forest" />
                                    <input value={v.newParamVal} onChange={e => setV(i, { newParamVal: e.target.value })}
                                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariantParam(i))}
                                      placeholder="Hodnota"
                                      className="flex-1 border border-cream-dark rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-forest" />
                                    <button type="button" onClick={() => addVariantParam(i)}
                                      className="px-3 py-1.5 text-xs font-bold bg-forest/10 text-forest rounded-lg hover:bg-forest/20 transition-colors">
                                      + Přidat
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cream-dark shadow-2xl px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-soft">
            {form.nameCs
              ? <span><strong className="text-charcoal">{form.nameCs}</strong>{form.price && <> · {form.price} Kč</>}{variants.length > 0 && <> · <span className="text-forest font-medium">{variants.length} variant</span></>}</span>
              : <span className="italic">Nový produkt</span>}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/admin/produkty`)}>Zrušit</Button>
            <Button type="submit" loading={loading}>{initialData?.id ? 'Uložit změny' : 'Vytvořit produkt'}</Button>
          </div>
        </div>
      </div>
    </form>
  )
}
