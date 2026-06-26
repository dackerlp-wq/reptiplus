'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { Wand2 } from 'lucide-react'

type PostData = {
  id?: string
  titleCs?: string; titleEn?: string; titleDe?: string
  contentCs?: string; contentEn?: string; contentDe?: string
  excerpt?: string; image?: string; isPublished?: boolean
}

export default function BlogForm({ initialData }: { initialData?: PostData }) {
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
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
  })

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  const autoTranslate = async () => {
    if (!form.titleCs) { toast('Nejdřív vyplňte český název', 'error'); return }
    setTranslating(true)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleCs: form.titleCs,
          contentCs: form.contentCs,
          excerpt: form.excerpt,
        }),
      })
      const data = await res.json()
      setForm(f => ({
        ...f,
        titleEn: data.titleEn || f.titleEn,
        titleDe: data.titleDe || f.titleDe,
        contentEn: data.contentEn || f.contentEn,
        contentDe: data.contentDe || f.contentDe,
      }))
      toast('Přeloženo', 'success')
    } catch {
      toast('Překlad selhal', 'error')
    }
    setTranslating(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titleCs) { toast('Název (CZ) je povinný', 'error'); return }
    setLoading(true)

    const url = initialData?.id ? `/api/admin/blog/${initialData.id}` : '/api/admin/blog'
    const method = initialData?.id ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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
            <label className="block text-sm font-medium mb-1">Obsah (CZ)</label>
            <textarea value={form.contentCs} onChange={set('contentCs')} rows={12}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none font-mono" />
          </div>
        </div>
      </div>

      {/* English */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">English</h2>
        <div className="space-y-4">
          <Input id="titleEn" label="Title (EN)" value={form.titleEn} onChange={set('titleEn')} />
          <div>
            <label className="block text-sm font-medium mb-1">Content (EN)</label>
            <textarea value={form.contentEn} onChange={set('contentEn')} rows={8}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none font-mono" />
          </div>
        </div>
      </div>

      {/* German */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Deutsch</h2>
        <div className="space-y-4">
          <Input id="titleDe" label="Titel (DE)" value={form.titleDe} onChange={set('titleDe')} />
          <div>
            <label className="block text-sm font-medium mb-1">Inhalt (DE)</label>
            <textarea value={form.contentDe} onChange={set('contentDe')} rows={8}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none font-mono" />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-cream-dark p-6">
        <h2 className="font-bold mb-4">Nastavení</h2>
        <div className="space-y-4">
          <Input id="image" label="URL obrázku (cover)" value={form.image} onChange={set('image')} placeholder="https://..." />
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
