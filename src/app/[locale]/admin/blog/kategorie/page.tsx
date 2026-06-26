'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'

type BlogCategory = { id: string; name_cs: string; name_en: string | null; name_de: string | null; slug: string }

export default function BlogCategoriesAdminPage() {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ nameCs: '', nameEn: '', nameDe: '' })
  const [newForm, setNewForm] = useState({ nameCs: '', nameEn: '', nameDe: '' })
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch('/api/admin/blog/categories')
    const d = await r.json()
    setCategories(d.categories || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startEdit = (c: BlogCategory) => {
    setEditId(c.id)
    setEditForm({ nameCs: c.name_cs, nameEn: c.name_en || '', nameDe: c.name_de || '' })
  }

  const saveEdit = async (id: string) => {
    setSaving(true)
    const r = await fetch(`/api/admin/blog/categories/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nameCs: editForm.nameCs, nameEn: editForm.nameEn, nameDe: editForm.nameDe }),
    })
    if (r.ok) { toast('Uloženo ✓', 'success'); setEditId(null); load() }
    else { const d = await r.json(); toast(d.error || 'Chyba', 'error') }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Smazat kategorii „${name}"? Články v ní zůstanou bez kategorie.`)) return
    const r = await fetch(`/api/admin/blog/categories/${id}`, { method: 'DELETE' })
    if (r.ok) { toast('Smazáno', 'success'); load() }
    else { const d = await r.json(); toast(d.error || 'Chyba', 'error') }
  }

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newForm.nameCs) { toast('Název (CZ) je povinný', 'error'); return }
    setSaving(true)
    const r = await fetch('/api/admin/blog/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nameCs: newForm.nameCs, nameEn: newForm.nameEn, nameDe: newForm.nameDe }),
    })
    if (r.ok) {
      toast('Kategorie vytvořena ✓', 'success')
      setNewForm({ nameCs: '', nameEn: '', nameDe: '' })
      setShowNew(false)
      load()
    } else { const d = await r.json(); toast(d.error || 'Chyba', 'error') }
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kategorie článků</h1>
          <p className="text-sm text-gray-soft mt-1">Kategorie pro třídění blogových článků (nezávislé na kategoriích produktů)</p>
        </div>
        <Button onClick={() => setShowNew(v => !v)}>
          {showNew ? <><X className="w-4 h-4" /> Zrušit</> : <><Plus className="w-4 h-4" /> Nová kategorie</>}
        </Button>
      </div>

      {showNew && (
        <form onSubmit={createCategory} className="bg-white rounded-xl border border-cream-dark p-6 mb-6">
          <h2 className="font-bold mb-4">Nová kategorie</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Input label="Název (CZ) *" value={newForm.nameCs} onChange={e => setNewForm(f => ({ ...f, nameCs: e.target.value }))} required />
            <Input label="Name (EN)" value={newForm.nameEn} onChange={e => setNewForm(f => ({ ...f, nameEn: e.target.value }))} />
            <Input label="Name (DE)" value={newForm.nameDe} onChange={e => setNewForm(f => ({ ...f, nameDe: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Zrušit</Button>
            <Button type="submit" loading={saving}>Vytvořit</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-soft">Načítám…</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-soft">Žádné kategorie. Vytvořte první pomocí tlačítka výše.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark bg-cream">
                <th className="px-4 py-3 text-left font-semibold">Název (CZ)</th>
                <th className="px-4 py-3 text-left font-semibold">EN</th>
                <th className="px-4 py-3 text-left font-semibold">DE</th>
                <th className="px-4 py-3 text-left font-semibold">Slug</th>
                <th className="px-4 py-3 text-right font-semibold">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {categories.map(c => (
                <tr key={c.id} className="hover:bg-cream/50">
                  {editId === c.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editForm.nameCs} onChange={e => setEditForm(f => ({ ...f, nameCs: e.target.value }))}
                          className="w-full px-2 py-1 border border-cream-dark rounded text-sm focus:outline-none focus:border-forest" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.nameEn} onChange={e => setEditForm(f => ({ ...f, nameEn: e.target.value }))}
                          className="w-full px-2 py-1 border border-cream-dark rounded text-sm focus:outline-none focus:border-forest" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.nameDe} onChange={e => setEditForm(f => ({ ...f, nameDe: e.target.value }))}
                          className="w-full px-2 py-1 border border-cream-dark rounded text-sm focus:outline-none focus:border-forest" />
                      </td>
                      <td className="px-4 py-2 text-gray-soft text-xs">{c.slug}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => saveEdit(c.id)} disabled={saving}
                            className="p-1.5 rounded hover:bg-green-100 text-green-600" title="Uložit">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1.5 rounded hover:bg-cream text-gray-soft" title="Zrušit">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{c.name_cs}</td>
                      <td className="px-4 py-3 text-gray-soft">{c.name_en || '—'}</td>
                      <td className="px-4 py-3 text-gray-soft">{c.name_de || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-soft font-mono">{c.slug}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => startEdit(c)} className="p-1.5 rounded hover:bg-cream text-gray-soft hover:text-forest" title="Upravit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id, c.name_cs)} className="p-1.5 rounded hover:bg-red-50 text-gray-soft hover:text-red-600" title="Smazat">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
