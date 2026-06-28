'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import {
  Upload, X, Wand2, Plus, Trash2, ChevronDown, ChevronUp,
  GripVertical, Package, Tag, Eye, EyeOff, Star, Percent, Layers,
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Category = { id: string; name_cs: string; parent_id: string | null; sort_order: number }

type Variant = {
  id?: string
  name_cs: string
  name_en: string
  name_de: string
  sku: string
  price: string         // '' = inherit from product
  stock: string
  attributes: Record<string, string>   // co ji odlišuje (Barva: Červená) — zobrazí se jako výběrové tlačítko
  parameters: Record<string, string>   // technické parametry specifické pro tuto variantu
  // UI-only
  expanded: boolean
  newAttrKey: string; newAttrVal: string
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

function newVariant(expanded = true): Variant {
  return {
    name_cs: '', name_en: '', name_de: '', sku: '', price: '', stock: '0',
    attributes: {}, parameters: {}, expanded,
    newAttrKey: '', newAttrVal: '', newParamKey: '', newParamVal: '',
  }
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

  // global product parameters
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
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})

    if (initialData?.id) {
      fetch(`/api/admin/products/${initialData.id}/variants`)
        .then(r => r.json())
        .then(d => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setVariants((d.variants || []).map((v: any, idx: number) => ({
            id: v.id,
            name_cs: v.name_cs || '',
            name_en: v.name_en || '',
            name_de: v.name_de || '',
            sku: v.sku || '',
            price: v.price !== null && v.price !== undefined ? String(v.price) : '',
            stock: String(v.stock ?? 0),
            attributes: v.attributes || {},
            parameters: v.parameters || {},
            expanded: idx === 0,   // první varianta rozbalená
            newAttrKey: '', newAttrVal: '',
            newParamKey: '', newParamVal: '',
          })))
        })
        .catch(() => {})
    }
  }, [initialData?.id])

  // ── Category helpers ──────────────────────────────────────
  const buildCategoryOptions = () => {
    const roots = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
    const result: { id: string; label: string }[] = []
    for (const root of roots) {
      result.push({ id: root.id, label: root.name_cs })
      categories.filter(c => c.parent_id === root.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach(child => result.push({ id: child.id, label: `↳ ${child.name_cs}` }))
    }
    return result
  }

  // ── AI translate ───────────────────────────────────────────
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
      setForm(f => ({
        ...f,
        nameEn: data.nameEn || f.nameEn,
        nameDe: data.nameDe || f.nameDe,
        descriptionEn: data.descriptionEn || f.descriptionEn,
        descriptionDe: data.descriptionDe || f.descriptionDe,
      }))
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
      setVariants(vs => vs.map((vv, i) => i === idx
        ? { ...vv, name_en: data.nameEn || vv.name_en, name_de: data.nameDe || vv.name_de }
        : vv))
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
    const uploaded: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: false })
      if (error) { toast(`Chyba: ${file.name}`, 'error'); continue }
      const { data } = supabase.storage.from('images').getPublicUrl(path)
      uploaded.push(data.publicUrl)
    }
    setForm(f => ({ ...f, images: [...f.images, ...uploaded] }))
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const removeImage = (i: number) => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))
  const moveImage = (from: number, to: number) => {
    setForm(f => {
      const imgs = [...f.images]; const [item] = imgs.splice(from, 1); imgs.splice(to, 0, item)
      return { ...f, images: imgs }
    })
  }

  // ── Variant helpers ───────────────────────────────────────
  const addVariant = () => setVariants(vs => [...vs, newVariant(true)])
  const removeVariant = (i: number) => {
    if (!confirm(`Smazat variantu "${variants[i].name_cs || 'bez názvu'}"?`)) return
    setVariants(vs => vs.filter((_, j) => j !== i))
  }
  const setV = (i: number, patch: Partial<Variant>) =>
    setVariants(vs => vs.map((v, j) => j === i ? { ...v, ...patch } : v))
  const toggleVariant = (i: number) =>
    setVariants(vs => vs.map((v, j) => j === i ? { ...v, expanded: !v.expanded } : v))

  const addVariantAttr = (i: number) => {
    const v = variants[i]
    if (!v.newAttrKey || !v.newAttrVal) return
    setV(i, { attributes: { ...v.attributes, [v.newAttrKey]: v.newAttrVal }, newAttrKey: '', newAttrVal: '' })
  }
  const removeVariantAttr = (i: number, key: string) => {
    const attrs = { ...variants[i].attributes }; delete attrs[key]
    setV(i, { attributes: attrs })
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

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nameCs || !form.price) { toast('Název (CZ) a cena jsou povinné', 'error'); return }
    if (variants.some(v => !v.name_cs)) { toast('Každá varianta musí mít český název', 'error'); return }
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
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    if (res.ok) {
      const responseData = await res.json()
      const productId = initialData?.id || responseData.id

      await fetch(`/api/admin/products/${productId}/variants`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variants: variants.map((v, i) => ({
            name_cs: v.name_cs,
            name_en: v.name_en || v.name_cs,
            name_de: v.name_de || v.name_cs,
            sku: v.sku || null,
            price: v.price ? parseFloat(v.price) : null,
            stock: parseInt(v.stock || '0'),
            attributes: v.attributes,
            parameters: v.parameters,
            sort_order: i,
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

  // ── Render ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="pb-24">

      {/* Two-column layout: main + sidebar */}
      <div className="grid grid-cols-3 gap-6 mb-6">

        {/* ── LEFT: main content ── */}
        <div className="col-span-2 space-y-5">

          {/* Název */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2"><Package className="w-4 h-4 text-forest" />Název produktu</h2>
              <Button type="button" variant="outline" size="sm" onClick={autoTranslate} loading={translating}>
                <Wand2 className="w-4 h-4" /> Přeložit AI
              </Button>
            </div>

            {/* Language tab for names */}
            <div className="flex gap-1 mb-3">
              {(['cs', 'en', 'de'] as const).map(lang => (
                <button key={lang} type="button"
                  onClick={() => setNameLang(lang)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${nameLang === lang ? 'bg-forest text-white' : 'bg-cream-dark text-gray-soft hover:text-charcoal'}`}>
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <div className={nameLang !== 'cs' ? 'hidden' : ''}>
              <Input id="nameCs" label="Název (CZ) *" value={form.nameCs} required
                onChange={e => setForm(f => ({ ...f, nameCs: e.target.value }))}
                placeholder="Název produktu v češtině..." />
            </div>
            <div className={nameLang !== 'en' ? 'hidden' : ''}>
              <Input id="nameEn" label="Název (EN)" value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                placeholder="Product name in English..." />
            </div>
            <div className={nameLang !== 'de' ? 'hidden' : ''}>
              <Input id="nameDe" label="Název (DE)" value={form.nameDe}
                onChange={e => setForm(f => ({ ...f, nameDe: e.target.value }))}
                placeholder="Produktname auf Deutsch..." />
            </div>

            <div className="mt-3">
              <Input id="sku" label="SKU / kód produktu" value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                placeholder="Např. REP-001" />
            </div>
          </div>

          {/* Popis */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Popis</h2>
              <div className="flex gap-1">
                {(['cs', 'en', 'de'] as const).map(lang => (
                  <button key={lang} type="button"
                    onClick={() => setDescLang(lang)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${descLang === lang ? 'bg-forest text-white' : 'bg-cream-dark text-gray-soft hover:text-charcoal'}`}>
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className={descLang !== 'cs' ? 'hidden' : ''}>
              <RichEditor value={form.descriptionCs}
                onChange={val => setForm(f => ({ ...f, descriptionCs: val }))}
                placeholder="Popis produktu v češtině..." />
            </div>
            <div className={descLang !== 'en' ? 'hidden' : ''}>
              <RichEditor value={form.descriptionEn}
                onChange={val => setForm(f => ({ ...f, descriptionEn: val }))}
                placeholder="Product description in English..." />
            </div>
            <div className={descLang !== 'de' ? 'hidden' : ''}>
              <RichEditor value={form.descriptionDe}
                onChange={val => setForm(f => ({ ...f, descriptionDe: val }))}
                placeholder="Produktbeschreibung auf Deutsch..." />
            </div>
          </div>

          {/* Obrázky */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <h2 className="font-bold mb-4">Obrázky</h2>
            <div
              className="border-2 border-dashed border-cream-dark rounded-xl p-8 text-center cursor-pointer hover:border-forest/50 hover:bg-sage/10 transition-colors mb-4"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                if (e.dataTransfer.files.length)
                  handleImageUpload({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>)
              }}>
              <Upload className="w-8 h-8 text-gray-soft mx-auto mb-2" />
              <p className="text-sm text-gray-soft">Přetáhni sem nebo <span className="text-forest font-medium">klikni pro výběr</span></p>
              <p className="text-xs text-gray-soft mt-1">JPG, PNG, WebP · max 5 MB / soubor · lze vybrat více najednou</p>
              {uploading && <p className="text-sm text-forest mt-2 animate-pulse">Nahrávám...</p>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            {form.images.length > 0 && (
              <>
                <p className="text-xs text-gray-soft mb-2">
                  <strong>První obrázek = hlavní.</strong> Šipkami změníte pořadí.
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {form.images.map((img, i) => (
                    <div key={img + i} className="relative group">
                      {i === 0 && (
                        <span className="absolute top-1 left-1 z-10 bg-forest text-white text-[10px] px-1 py-0.5 rounded leading-tight">
                          Hlavní
                        </span>
                      )}
                      <div className="aspect-square rounded-lg border-2 border-cream-dark overflow-hidden bg-cream">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                        {i > 0 && (
                          <button type="button" onClick={() => moveImage(i, i - 1)}
                            className="bg-white/90 text-charcoal rounded px-1.5 py-0.5 text-xs font-bold hover:bg-white">←</button>
                        )}
                        <button type="button" onClick={() => removeImage(i)}
                          className="bg-red-500 text-white rounded p-1 hover:bg-red-600">
                          <X className="w-3 h-3" />
                        </button>
                        {i < form.images.length - 1 && (
                          <button type="button" onClick={() => moveImage(i, i + 1)}
                            className="bg-white/90 text-charcoal rounded px-1.5 py-0.5 text-xs font-bold hover:bg-white">→</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Parametry produktu */}
          <div className="bg-white rounded-xl border border-cream-dark p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold">Parametry produktu</h2>
              <span className="text-xs text-gray-soft">Pro překlad klikněte "Přeložit AI" v sekci Název</span>
            </div>
            <p className="text-xs text-gray-soft mb-4">
              Společné technické parametry pro všechny varianty. Pokud se parametry liší variantu od varianty, přidejte je přímo ke každé variantě níže.
            </p>
            <div className="flex gap-2 mb-3">
              <input value={paramKey} onChange={e => setParamKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addParam())}
                placeholder="Název (CZ), např. Výkon"
                className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
              <input value={paramValue} onChange={e => setParamValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addParam())}
                placeholder="Hodnota, např. 35W"
                className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
              <Button type="button" variant="outline" size="sm" onClick={addParam}>
                <Plus className="w-4 h-4" /> Přidat
              </Button>
            </div>
            {Object.keys(form.parameters).length > 0 ? (
              <div className="rounded-lg border border-cream-dark overflow-hidden">
                {Object.entries(form.parameters).map(([k, v], idx) => (
                  <div key={k} className={`flex items-center gap-3 px-3 py-2 text-sm ${idx % 2 === 0 ? '' : 'bg-cream/50'}`}>
                    <span className="font-medium w-36 shrink-0 text-charcoal">{k}</span>
                    <span className="flex-1 text-gray-soft">{v}</span>
                    <button type="button" onClick={() => removeParam(k)}
                      className="text-gray-soft hover:text-red-500 transition-colors ml-2 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-soft italic">Žádné parametry.</p>
            )}
          </div>
        </div>

        {/* ── RIGHT: sidebar ── */}
        <div className="space-y-4">

          {/* Stav */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-forest" /> Stav produktu
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-sm">{form.isActive ? 'Aktivní' : 'Neaktivní'}</p>
                <p className="text-xs text-gray-soft">{form.isActive ? 'Zobrazuje se v obchodě' : 'Skryto, zákazníci nevidí'}</p>
              </div>
              <div
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.isActive ? 'bg-forest' : 'bg-cream-dark'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isActive ? 'left-7' : 'left-1'}`} />
              </div>
            </label>
          </div>

          {/* Štítky */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-forest" /> Štítky
            </h3>
            <div className="space-y-2.5">
              {([
                { key: 'isNew' as const, label: 'Novinka', desc: 'Badge "Nový" na kartě', color: 'bg-forest' },
                { key: 'isSale' as const, label: 'Ve slevě', desc: 'Badge "Sleva" na kartě', color: 'bg-gold' },
                { key: 'isFeatured' as const, label: 'Doporučený', desc: 'Zobrazí se v menu a na HP', color: 'bg-purple-500' },
              ]).map(flag => (
                <label key={flag.key} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setForm(f => ({ ...f, [flag.key]: !f[flag.key] }))}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${form[flag.key] ? `${flag.color} border-transparent` : 'border-cream-dark group-hover:border-forest/50'}`}>
                    {form[flag.key] && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="currentColor"><path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{flag.label}</p>
                    <p className="text-xs text-gray-soft mt-0.5">{flag.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Organizace */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3">Organizace</h3>
            <label className="block text-xs font-medium text-gray-soft mb-1">Kategorie</label>
            <select value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest">
              <option value="">— bez kategorie —</option>
              {catOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {/* Cena */}
          <div className="bg-white rounded-xl border border-cream-dark p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Percent className="w-4 h-4 text-forest" /> Cena
            </h3>
            <div className="space-y-3">
              <Input id="price" label="Prodejní cena (Kč vč. DPH) *"
                type="number" step="0.01" required
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <Input id="comparePrice" label="Původní / přeškrtnutá cena (Kč)"
                type="number" step="0.01"
                value={form.comparePrice} onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value }))} />
              <div>
                <label className="block text-xs font-medium text-gray-soft mb-1">Sazba DPH</label>
                <select value={form.vatRate}
                  onChange={e => setForm(f => ({ ...f, vatRate: e.target.value }))}
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
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-forest" /> Sklad & logistika
            </h3>
            <div className="space-y-3">
              <Input id="stock" label="Počet kusů skladem" type="number"
                value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              <Input id="lowStockThreshold" label="Varovat při nízké zásobě (ks)" type="number"
                value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
              <Input id="weight" label="Hmotnost (kg)" type="number" step="0.001"
                value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            {variants.length > 0 && (
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg p-2">
                ⚠ Tento produkt má varianty. Sklad se řídí podle každé varianty zvlášť — výše slouží jako záloha.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Varianty (full-width) ── */}
      <div className="bg-white rounded-xl border border-cream-dark p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold flex items-center gap-2">
              <Star className="w-4 h-4 text-forest" /> Varianty produktu
            </h2>
            <p className="text-xs text-gray-soft mt-0.5">
              Různé provedení stejného produktu — velikost, barva, výkon atd. Každá varianta má vlastní cenu, sklad, atributy a parametry.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            <Plus className="w-4 h-4" /> Přidat variantu
          </Button>
        </div>

        {variants.length === 0 ? (
          <div className="border-2 border-dashed border-cream-dark rounded-xl p-8 text-center mt-4">
            <Layers className="w-8 h-8 text-cream-dark mx-auto mb-2" />
            <p className="text-sm text-gray-soft">Produkt nemá varianty.</p>
            <p className="text-xs text-gray-soft mt-1">Přidejte varianty pokud prodáváte např. různé velikosti nebo barvy.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {variants.map((v, i) => (
              <div key={i} className="border border-cream-dark rounded-xl overflow-hidden">

                {/* Variant header — always visible */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${v.expanded ? 'bg-forest/5 border-b border-cream-dark' : 'hover:bg-cream/60'}`}
                  onClick={() => toggleVariant(i)}>
                  <GripVertical className="w-4 h-4 text-gray-soft shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-sm">
                        {v.name_cs || <span className="text-gray-soft italic">bez názvu</span>}
                      </span>
                      {/* Attribute badges */}
                      {Object.entries(v.attributes).map(([k, val]) => (
                        <span key={k} className="text-xs bg-sage/40 text-forest px-2 py-0.5 rounded-full">
                          {k}: {val}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-soft">
                      {v.price ? <span className="font-medium text-forest">{v.price} Kč</span> : <span className="italic">cena z produktu</span>}
                      <span>Sklad: <strong className={parseInt(v.stock) <= 0 ? 'text-red-500' : parseInt(v.stock) <= 5 ? 'text-amber-600' : 'text-sage-dark'}>{v.stock} ks</strong></span>
                      {v.sku && <span>SKU: {v.sku}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={e => { e.stopPropagation(); removeVariant(i) }}
                      className="p-1.5 text-gray-soft hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {v.expanded ? <ChevronUp className="w-4 h-4 text-gray-soft" /> : <ChevronDown className="w-4 h-4 text-gray-soft" />}
                  </div>
                </div>

                {/* Variant body — expanded only */}
                {v.expanded && (
                  <div className="p-4 space-y-5">

                    {/* Basic fields row */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-gray-soft uppercase tracking-wider">Základní údaje</p>
                        <Button type="button" variant="outline" size="sm"
                          onClick={() => translateVariant(i)} loading={translating}>
                          <Wand2 className="w-3 h-3" /> Přeložit AI
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-soft mb-1">Název (CZ) *</label>
                          <input value={v.name_cs} onChange={e => setV(i, { name_cs: e.target.value })}
                            placeholder="Název varianty v CZ"
                            className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-soft mb-1">Název (EN)</label>
                          <input value={v.name_en} onChange={e => setV(i, { name_en: e.target.value })}
                            placeholder="Variant name in English"
                            className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-soft mb-1">Název (DE)</label>
                          <input value={v.name_de} onChange={e => setV(i, { name_de: e.target.value })}
                            placeholder="Variantenname auf Deutsch"
                            className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-soft mb-1">SKU / kód varianty</label>
                          <input value={v.sku} onChange={e => setV(i, { sku: e.target.value })}
                            placeholder="Např. REP-001-L"
                            className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-soft mb-1">Cena (Kč vč. DPH)</label>
                          <input type="number" step="0.01" value={v.price} onChange={e => setV(i, { price: e.target.value })}
                            placeholder="Prázdné = z produktu"
                            className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-soft mb-1">Počet kusů skladem</label>
                          <input type="number" value={v.stock} onChange={e => setV(i, { stock: e.target.value })}
                            className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        </div>
                      </div>
                    </div>

                    {/* Attributes — what makes this variant distinct */}
                    <div>
                      <div className="mb-2">
                        <p className="text-xs font-bold text-gray-soft uppercase tracking-wider">Atributy varianty</p>
                        <p className="text-xs text-gray-soft mt-0.5">
                          Co tuto variantu odlišuje — zobrazí se zákazníkovi jako výběrové tlačítko (např. Barva: Červená, Velikost: L)
                        </p>
                      </div>
                      {Object.keys(v.attributes).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {Object.entries(v.attributes).map(([k, val]) => (
                            <div key={k} className="flex items-center gap-1.5 bg-sage/20 border border-sage-dark/20 rounded-lg px-3 py-1.5 text-sm">
                              <span className="text-gray-soft text-xs">{k}:</span>
                              <span className="font-medium text-forest">{val}</span>
                              <button type="button" onClick={() => removeVariantAttr(i, k)}
                                className="text-gray-soft hover:text-red-500 transition-colors ml-1">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input value={v.newAttrKey} onChange={e => setV(i, { newAttrKey: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariantAttr(i))}
                          placeholder="Název (např. Barva)"
                          className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        <input value={v.newAttrVal} onChange={e => setV(i, { newAttrVal: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariantAttr(i))}
                          placeholder="Hodnota (např. Červená)"
                          className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        <Button type="button" variant="outline" size="sm" onClick={() => addVariantAttr(i)}>
                          <Plus className="w-4 h-4" /> Přidat
                        </Button>
                      </div>
                    </div>

                    {/* Parameters — technical specs specific to this variant */}
                    <div>
                      <div className="mb-2">
                        <p className="text-xs font-bold text-gray-soft uppercase tracking-wider">Specifické parametry</p>
                        <p className="text-xs text-gray-soft mt-0.5">
                          Technické parametry platné jen pro tuto variantu — zobrazí se místo nebo navíc k parametrům produktu
                        </p>
                      </div>
                      {Object.keys(v.parameters).length > 0 && (
                        <div className="rounded-lg border border-cream-dark overflow-hidden mb-3">
                          {Object.entries(v.parameters).map(([k, val], idx) => (
                            <div key={k} className={`flex items-center gap-3 px-3 py-2 text-sm ${idx % 2 === 0 ? '' : 'bg-cream/50'}`}>
                              <span className="font-medium w-36 shrink-0 text-charcoal">{k}</span>
                              <span className="flex-1 text-gray-soft">{val}</span>
                              <button type="button" onClick={() => removeVariantParam(i, k)}
                                className="text-gray-soft hover:text-red-500 transition-colors p-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input value={v.newParamKey} onChange={e => setV(i, { newParamKey: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariantParam(i))}
                          placeholder="Parametr (např. Výkon)"
                          className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        <input value={v.newParamVal} onChange={e => setV(i, { newParamVal: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariantParam(i))}
                          placeholder="Hodnota (např. 35W)"
                          className="flex-1 border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest" />
                        <Button type="button" variant="outline" size="sm" onClick={() => addVariantParam(i)}>
                          <Plus className="w-4 h-4" /> Přidat
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky footer save bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-cream-dark shadow-2xl px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="text-sm text-gray-soft">
            {form.nameCs ? (
              <span>
                <strong className="text-charcoal">{form.nameCs}</strong>
                {form.price && <> · {form.price} Kč</>}
                {variants.length > 0 && <> · {variants.length} varianty</>}
              </span>
            ) : (
              <span className="italic">Nový produkt</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline"
              onClick={() => router.push(`/${locale}/admin/produkty`)}>
              Zrušit
            </Button>
            <Button type="submit" loading={loading}>
              {initialData?.id ? 'Uložit změny' : 'Vytvořit produkt'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
