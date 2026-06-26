'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { Wand2, X, Search, Tag, Upload } from 'lucide-react'
import dynamic from 'next/dynamic'

const RichEditor = dynamic(() => import('@/components/admin/RichEditor'), { ssr: false })

type PostData = {
  id?: string
  titleCs?: string; titleEn?: string; titleDe?: string
  contentCs?: string; contentEn?: string; contentDe?: string
  excerpt?: string; image?: string; isPublished?: boolean
  blogAuthorId?: string; blogCategoryId?: string
  productLinks?: { product_id: string; products: { id: string; name_cs: string; sku: string; images: string } }[]
  categoryLinks?: { category_id: string; categories: { id: string; name_cs: string } }[]
  tagLinks?: { tag_id: string; blog_tags: { id: string; name_cs: string; name_en: string | null; name_de: string | null } }[]
}

type BlogCategory = { id: string; name_cs: string; name_en: string | null; name_de: string | null; slug: string }

type Author = { id: string; name: string; is_default: number }
type Product = { id: string; slug: string; name_cs: string; sku: string; images: string }
type Category = { id: string; name_cs: string }
type BlogTag = { id: string; name_cs: string; name_en: string | null; name_de: string | null }

export default function BlogForm({ initialData }: { initialData?: PostData }) {
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [generatingTags, setGeneratingTags] = useState(false)
  const [authors, setAuthors] = useState<Author[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [allTags, setAllTags] = useState<BlogTag[]>([])
  const [allBlogCategories, setAllBlogCategories] = useState<BlogCategory[]>([])
  const [tagSearch, setTagSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    titleCs: initialData?.titleCs || '',
    titleEn: initialData?.titleEn || '',
    titleDe: initialData?.titleDe || '',
    contentCs: initialData?.contentCs || '',
    contentEn: initialData?.contentEn || '',
    contentDe: initialData?.contentDe || '',
    excerpt: initialData?.excerpt || '',
    image: initialData?.image || '',
    isPublished: initialData?.isPublished ?? false,
    blogAuthorId: initialData?.blogAuthorId || '',
    blogCategoryId: initialData?.blogCategoryId || '',
  })

  const [selectedProducts, setSelectedProducts] = useState<Product[]>(
    (initialData?.productLinks || []).map(l => ({
      id: l.product_id,
      slug: (l.products as unknown as { slug?: string })?.slug || '',
      name_cs: l.products?.name_cs || '',
      sku: l.products?.sku || '',
      images: l.products?.images || '[]',
    }))
  )
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    (initialData?.categoryLinks || []).map(l => ({
      id: l.category_id,
      name_cs: l.categories?.name_cs || '',
    }))
  )
  const [selectedTags, setSelectedTags] = useState<BlogTag[]>(
    (initialData?.tagLinks || []).map(l => ({
      id: l.tag_id,
      name_cs: l.blog_tags?.name_cs || '',
      name_en: l.blog_tags?.name_en || null,
      name_de: l.blog_tags?.name_de || null,
    }))
  )

  useEffect(() => {
    fetch('/api/admin/blog/authors').then(r => r.json()).then(d => setAuthors(d.authors || []))
    fetch('/api/admin/products').then(r => r.json()).then(d => setAllProducts(d.products || []))
    fetch('/api/categories').then(r => r.json()).then(d => setAllCategories(d.categories || []))
    fetch('/api/admin/blog/tags').then(r => r.json()).then(d => setAllTags(d.tags || []))
    fetch('/api/admin/blog/categories').then(r => r.json()).then(d => setAllBlogCategories(d.categories || []))
  }, [])

  useEffect(() => {
    if (authors.length && !form.blogAuthorId) {
      const def = authors.find(a => a.is_default) || authors[0]
      if (def) setForm(f => ({ ...f, blogAuthorId: def.id }))
    }
  }, [authors, form.blogAuthorId])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const autoTranslate = async () => {
    if (!form.titleCs) { toast('Nejdřív vyplňte český název', 'error'); return }
    setTranslating(true)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleCs: form.titleCs, contentCs: form.contentCs, excerpt: form.excerpt }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Překlad selhal', 'error'); return }
      setForm(f => ({
        ...f,
        titleEn: data.titleEn || f.titleEn,
        titleDe: data.titleDe || f.titleDe,
        contentEn: data.contentEn || f.contentEn,
        contentDe: data.contentDe || f.contentDe,
      }))
      toast('Přeloženo ✓', 'success')
    } catch {
      toast('Překlad selhal', 'error')
    }
    setTranslating(false)
  }

  const generateTags = async () => {
    if (!initialData?.id) { toast('Nejdříve článek uložte, pak generujte štítky', 'error'); return }
    if (!form.titleCs) { toast('Nejdřív vyplňte název', 'error'); return }
    setGeneratingTags(true)
    try {
      const res = await fetch(`/api/admin/blog/${initialData.id}/generate-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleCs: form.titleCs, contentCs: form.contentCs, excerpt: form.excerpt }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Generování selhalo', 'error'); return }
      setSelectedTags(data.tags || [])
      // refresh all tags in case new ones were created
      fetch('/api/admin/blog/tags').then(r => r.json()).then(d => setAllTags(d.tags || []))
      toast(`Vygenerováno ${data.tags?.length || 0} štítků ✓`, 'success')
    } catch {
      toast('Generování selhalo', 'error')
    }
    setGeneratingTags(false)
  }

  const uploadImage = async (file: File) => {
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Nahrávání selhalo', 'error'); return }
      setForm(f => ({ ...f, image: data.url }))
      toast('Obrázek nahrán ✓', 'success')
    } catch {
      toast('Nahrávání selhalo', 'error')
    }
    setImageUploading(false)
  }

  const addProduct = (p: Product) => {
    if (!selectedProducts.find(s => s.id === p.id)) setSelectedProducts(prev => [...prev, p])
    setProductSearch('')
  }
  const removeProduct = (id: string) => setSelectedProducts(prev => prev.filter(p => p.id !== id))

  const addCategory = (c: Category) => {
    if (!selectedCategories.find(s => s.id === c.id)) setSelectedCategories(prev => [...prev, c])
    setCategorySearch('')
  }
  const removeCategory = (id: string) => setSelectedCategories(prev => prev.filter(c => c.id !== id))

  const addTag = (t: BlogTag) => {
    if (!selectedTags.find(s => s.id === t.id)) setSelectedTags(prev => [...prev, t])
    setTagSearch('')
  }
  const removeTag = (id: string) => setSelectedTags(prev => prev.filter(t => t.id !== id))

  const filteredProducts = productSearch.length > 1
    ? allProducts.filter(p =>
        p.name_cs.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 8)
    : []

  const filteredCategories = categorySearch.length > 0
    ? allCategories.filter(c => c.name_cs.toLowerCase().includes(categorySearch.toLowerCase())).slice(0, 6)
    : []

  const filteredTags = tagSearch.length > 0
    ? allTags.filter(t =>
        t.name_cs.toLowerCase().includes(tagSearch.toLowerCase()) &&
        !selectedTags.find(s => s.id === t.id)
      ).slice(0, 8)
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titleCs) { toast('Název (CZ) je povinný', 'error'); return }
    setLoading(true)

    const url = initialData?.id ? `/api/admin/blog/${initialData.id}` : '/api/admin/blog'
    const method = initialData?.id ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        blogAuthorId: form.blogAuthorId || null,
        blogCategoryId: form.blogCategoryId || null,
        productIds: selectedProducts.map(p => p.id),
        categoryIds: selectedCategories.map(c => c.id),
        tagIds: selectedTags.map(t => t.id),
      }),
    })

    if (res.ok) {
      toast(initialData?.id ? 'Článek uložen' : 'Článek vytvořen', 'success')
      router.push(`/${locale}/admin/blog`)
    } else {
      const data = await res.json()
      toast(data.error || 'Chyba', 'error')
    }
    setLoading(false)
  }

  const getFirstImage = (images: string) => {
    try { return JSON.parse(images)?.[0] || null } catch { return null }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Czech content */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Obsah (čeština)</h2>
          <Button type="button" variant="outline" size="sm" onClick={autoTranslate} loading={translating}>
            <Wand2 className="w-4 h-4" /> Přeložit do EN & DE pomocí AI
          </Button>
        </div>
        <div className="space-y-4">
          <Input id="titleCs" label="Název (CZ) *" value={form.titleCs} onChange={set('titleCs')} required />
          <div>
            <label className="block text-sm font-medium mb-1">Perex (krátký úvod)</label>
            <textarea value={form.excerpt} onChange={set('excerpt')} rows={2}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Obsah (CZ)</label>
            <RichEditor value={form.contentCs} onChange={val => setForm(f => ({ ...f, contentCs: val }))} placeholder="Začněte psát článek v češtině..." products={allProducts} onProductMention={p => addProduct({ id: p.id, slug: p.slug, name_cs: p.name_cs, sku: p.sku, images: p.images })} />
          </div>
        </div>
      </div>

      {/* English */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">English</h2>
        <div className="space-y-4">
          <Input id="titleEn" label="Title (EN)" value={form.titleEn} onChange={set('titleEn')} />
          <div>
            <label className="block text-sm font-medium mb-2">Content (EN)</label>
            <RichEditor value={form.contentEn} onChange={val => setForm(f => ({ ...f, contentEn: val }))} placeholder="Write or paste the English translation..." />
          </div>
        </div>
      </div>

      {/* German */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Deutsch</h2>
        <div className="space-y-4">
          <Input id="titleDe" label="Titel (DE)" value={form.titleDe} onChange={set('titleDe')} />
          <div>
            <label className="block text-sm font-medium mb-2">Inhalt (DE)</label>
            <RichEditor value={form.contentDe} onChange={val => setForm(f => ({ ...f, contentDe: val }))} placeholder="Deutschen Text eintragen oder einfügen..." />
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold flex items-center gap-2"><Tag className="w-4 h-4" /> Štítky</h2>
          <Button type="button" variant="outline" size="sm" onClick={generateTags} loading={generatingTags}>
            <Wand2 className="w-4 h-4" /> Generovat pomocí AI
          </Button>
        </div>
        <p className="text-sm text-gray-soft mb-4">Štítky pomáhají čtenářům orientovat se v tématech článků.</p>

        {/* Selected tag chips */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedTags.map(t => (
              <div key={t.id} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full"
                style={{ background: 'rgba(232,163,61,0.15)', border: '1px solid rgba(232,163,61,0.4)', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {t.name_cs}
                <button type="button" onClick={() => removeTag(t.id)} className="opacity-60 hover:opacity-100 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tag search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-soft pointer-events-none" />
          <input
            type="text"
            value={tagSearch}
            onChange={e => setTagSearch(e.target.value)}
            placeholder="Hledat nebo přidat štítek..."
            className="w-full pl-9 pr-3 py-2 border border-cream-dark rounded-lg text-sm focus:outline-none focus:border-forest"
          />
          {filteredTags.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 bg-white border border-cream-dark rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredTags.map(t => (
                <button key={t.id} type="button" onClick={() => addTag(t)}
                  className="w-full px-3 py-2 hover:bg-cream text-left text-sm border-b border-cream-dark last:border-0">
                  {t.name_cs}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product linking */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-1">Propojené produkty</h2>
        <p className="text-sm text-gray-soft mb-4">Produkty a kategorie zobrazené v boxu „Zmíněné produkty" v článku; obráceně se článek zobrazí na stránce produktu.</p>

        <div className="space-y-4">
          {/* Product autocomplete */}
          <div>
            <label className="block text-sm font-medium mb-1">Přidat produkt</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-soft pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                placeholder="Hledat název nebo SKU..."
                className="w-full pl-9 pr-3 py-2 border border-cream-dark rounded-lg text-sm focus:outline-none focus:border-forest"
              />
              {filteredProducts.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-cream-dark rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                  {filteredProducts.map(p => (
                    <button key={p.id} type="button" onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-cream text-left text-sm border-b border-cream-dark last:border-0">
                      {getFirstImage(p.images) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getFirstImage(p.images)} alt="" className="w-8 h-8 object-cover rounded shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">{p.name_cs}</div>
                        <div className="text-xs text-gray-soft">{p.sku}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-cream border border-cream-dark rounded-lg px-3 py-1.5 text-sm">
                    {getFirstImage(p.images) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFirstImage(p.images)} alt="" className="w-6 h-6 object-cover rounded" />
                    )}
                    <span className="font-medium">{p.name_cs}</span>
                    <button type="button" onClick={() => removeProduct(p.id)} className="text-gray-soft hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category search */}
          <div>
            <label className="block text-sm font-medium mb-1">Přidat celou kategorii</label>
            <div className="relative">
              <input
                type="text"
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                placeholder="Hledat kategorii..."
                className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm focus:outline-none focus:border-forest"
              />
              {filteredCategories.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border border-cream-dark rounded-lg shadow-lg mt-1">
                  {filteredCategories.map(c => (
                    <button key={c.id} type="button" onClick={() => addCategory(c)}
                      className="w-full px-3 py-2 hover:bg-cream text-left text-sm border-b border-cream-dark last:border-0">
                      {c.name_cs}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedCategories.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-sage/30 border border-sage-dark rounded-lg px-3 py-1.5 text-sm">
                    <span className="font-medium">{c.name_cs}</span>
                    <span className="text-xs text-gray-soft">kategorie</span>
                    <button type="button" onClick={() => removeCategory(c.id)} className="text-gray-soft hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Nastavení</h2>
        <div className="space-y-4">
          {/* Cover image upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Obrázek (cover)</label>
            {form.image && (
              <div className="relative mb-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="h-32 w-auto object-cover rounded-lg border border-cream-dark" />
                <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}
              />
              <Button type="button" variant="outline" size="sm" loading={imageUploading}
                onClick={() => imageInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                {form.image ? 'Změnit obrázek' : 'Nahrát obrázek'}
              </Button>
            </div>
          </div>

          {allBlogCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Kategorie článku</label>
              <select
                value={form.blogCategoryId}
                onChange={set('blogCategoryId')}
                className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest"
              >
                <option value="">— bez kategorie —</option>
                {allBlogCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name_cs}</option>
                ))}
              </select>
            </div>
          )}

          {authors.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Podpis autora</label>
              <select
                value={form.blogAuthorId}
                onChange={set('blogAuthorId')}
                className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest"
              >
                {authors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.is_default ? ' (výchozí)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
              className="w-4 h-4 accent-forest" />
            <span className="text-sm font-medium">Publikovat ihned</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/admin/blog`)}>Zrušit</Button>
        <Button type="submit" loading={loading}>{initialData?.id ? 'Uložit změny' : 'Vytvořit článek'}</Button>
      </div>
    </form>
  )
}
