'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { Plus, Pencil, Trash2, Star, X } from 'lucide-react'

type Author = { id: string; name: string; avatar_initial: string | null; avatar_url: string | null; bio: string | null; is_default: number }

const emptyForm = { name: '', avatarInitial: '', avatarUrl: '', bio: '', isDefault: false }

export default function PodpisyPage() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Author | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/blog/authors')
    const data = await res.json()
    setAuthors(data.authors || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openEdit = (a: Author) => {
    setEditing(a)
    setShowNew(false)
    setForm({
      name: a.name,
      avatarInitial: a.avatar_initial || '',
      avatarUrl: a.avatar_url || '',
      bio: a.bio || '',
      isDefault: !!a.is_default,
    })
  }

  const openNew = () => {
    setEditing(null)
    setShowNew(true)
    setForm(emptyForm)
  }

  const cancel = () => { setEditing(null); setShowNew(false); setForm(emptyForm) }

  const save = async () => {
    if (!form.name) { toast('Jméno je povinné', 'error'); return }
    setSaving(true)

    const body = { ...form, avatarInitial: form.avatarInitial || form.name[0]?.toUpperCase() }

    if (editing) {
      const res = await fetch(`/api/admin/blog/authors/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { toast('Uloženo', 'success'); cancel(); load() }
      else { const d = await res.json(); toast(d.error || 'Chyba', 'error') }
    } else {
      const res = await fetch('/api/admin/blog/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { toast('Podpis vytvořen', 'success'); cancel(); load() }
      else { const d = await res.json(); toast(d.error || 'Chyba', 'error') }
    }
    setSaving(false)
  }

  const deleteAuthor = async (id: string) => {
    if (!confirm('Smazat tento podpis?')) return
    await fetch(`/api/admin/blog/authors/${id}`, { method: 'DELETE' })
    toast('Smazáno', 'success')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Podpisy autorů</h1>
          <p className="text-sm text-gray-soft mt-0.5">Jméno, avatar a bio zobrazené pod článkem</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Nový podpis</Button>
      </div>

      {/* Form (new or edit) */}
      {(showNew || editing) && (
        <div className="bg-white rounded-xl border border-cream-dark p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">{editing ? 'Upravit podpis' : 'Nový podpis'}</h2>
            <button onClick={cancel} className="text-gray-soft hover:text-charcoal"><X className="w-5 h-5" /></button>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-4 p-4 border border-cream-dark rounded-xl mb-4 bg-cream">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-xl font-bold text-white"
              style={{ background: '#33533C' }}>
              {form.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                : (form.avatarInitial || form.name[0] || 'A')}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ fontFamily: 'var(--font-mono)' }}>{form.name || 'Jméno autora'}</div>
              <div className="text-sm text-gray-soft">{form.bio || 'Bio autora…'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input id="name" label="Jméno *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Input id="avatarInitial" label="Iniciála (1 znak)" value={form.avatarInitial} onChange={e => setForm(f => ({ ...f, avatarInitial: e.target.value.slice(0, 1).toUpperCase() }))} placeholder="A" />
          </div>
          <div className="mb-4">
            <Input id="avatarUrl" label="URL avataru (volitelné)" value={form.avatarUrl} onChange={e => setForm(f => ({ ...f, avatarUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Bio (krátký popis)</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} maxLength={300}
              className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none" />
            <div className="text-xs text-gray-soft text-right">{form.bio.length}/300</div>
          </div>
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
              className="w-4 h-4 accent-forest" />
            <span className="text-sm font-medium">Výchozí podpis (použit jako výchozí u nových článků)</span>
          </label>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={cancel}>Zrušit</Button>
            <Button onClick={save} loading={saving}>Uložit</Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-soft py-8">Načítám...</div>
      ) : authors.length === 0 ? (
        <div className="text-center text-gray-soft py-8">Žádné podpisy.</div>
      ) : (
        <div className="space-y-3">
          {authors.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-cream-dark p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold text-white"
                style={{ background: '#33533C' }}>
                {a.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : (a.avatar_initial || a.name[0])}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{a.name}</span>
                  {a.is_default === 1 && (
                    <span className="flex items-center gap-1 text-xs text-gold font-medium">
                      <Star className="w-3 h-3 fill-current" /> výchozí
                    </span>
                  )}
                </div>
                {a.bio && <div className="text-sm text-gray-soft truncate">{a.bio}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(a)} className="text-gray-soft hover:text-forest">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => deleteAuthor(a.id)} className="text-gray-soft hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
