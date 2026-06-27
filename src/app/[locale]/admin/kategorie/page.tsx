'use client'
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'

type Category = {
  id: string; slug: string
  name_cs: string; name_en: string | null; name_de: string | null
  description_cs: string | null; parent_id: string | null; sort_order: number
}

type TreeNode = Category & { children: TreeNode[] }

function buildTree(cats: Category[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  cats.forEach(c => map.set(c.id, { ...c, children: [] }))
  const roots: TreeNode[] = []
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function flattenTree(nodes: TreeNode[], depth = 0): { node: TreeNode; depth: number }[] {
  const result: { node: TreeNode; depth: number }[] = []
  for (const n of nodes) {
    result.push({ node: n, depth })
    result.push(...flattenTree(n.children, depth + 1))
  }
  return result
}

const EMPTY_FORM = { nameCs: '', nameEn: '', nameDe: '', descriptionCs: '', parentId: '', sortOrder: 0 }

export default function AdminKategoriePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (c: Category) => {
    setEditId(c.id)
    setForm({ nameCs: c.name_cs, nameEn: c.name_en || '', nameDe: c.name_de || '', descriptionCs: c.description_cs || '', parentId: c.parent_id || '', sortOrder: c.sort_order })
    setShowForm(true)
  }

  const autoTranslate = async () => {
    if (!form.nameCs) { toast('Nejdřív vyplňte název (CZ)', 'error'); return }
    setTranslating(true)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameCs: form.nameCs, descriptionCs: form.descriptionCs }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error || 'Překlad selhal', 'error'); return }
      setForm(f => ({ ...f, nameEn: data.nameEn || f.nameEn, nameDe: data.nameDe || f.nameDe }))
      toast('Přeloženo ✓', 'success')
    } catch { toast('Překlad selhal', 'error') }
    setTranslating(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nameCs) { toast('Název (CZ) je povinný', 'error'); return }
    setSaving(true)
    const url = editId ? `/api/admin/categories/${editId}` : '/api/admin/categories'
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, parentId: form.parentId || null }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error || 'Chyba', 'error'); setSaving(false); return }
    toast(editId ? 'Kategorie uložena' : 'Kategorie vytvořena', 'success')
    setShowForm(false); setEditId(null); setForm(EMPTY_FORM)
    load()
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Smazat kategorii "${name}"?`)) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast(data.error, 'error'); return }
    toast('Kategorie smazána', 'success')
    load()
  }

  const tree = buildTree(categories)
  const flat = flattenTree(tree)
  const parentOptions = categories.filter(c => c.id !== editId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kategorie produktů</h1>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Nová kategorie</Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-cream-dark p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">{editId ? 'Upravit kategorii' : 'Nová kategorie'}</h2>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={autoTranslate} loading={translating}>
                <Wand2 className="w-4 h-4" /> Přeložit AI
              </Button>
              <button onClick={() => setShowForm(false)} className="text-gray-soft hover:text-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input id="nameCs" label="Název (CZ) *" value={form.nameCs} onChange={e => setForm(f => ({ ...f, nameCs: e.target.value }))} required />
              <Input id="nameEn" label="Název (EN)" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} />
              <Input id="nameDe" label="Název (DE)" value={form.nameDe} onChange={e => setForm(f => ({ ...f, nameDe: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nadřazená kategorie</label>
                <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                  className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest">
                  <option value="">— kořenová kategorie —</option>
                  {parentOptions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? `  ↳ ${c.name_cs}` : c.name_cs}
                    </option>
                  ))}
                </select>
              </div>
              <Input id="sortOrder" label="Pořadí" type="number" value={String(form.sortOrder)} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Popis (CZ)</label>
              <textarea value={form.descriptionCs} onChange={e => setForm(f => ({ ...f, descriptionCs: e.target.value }))} rows={2}
                className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none" />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Zrušit</Button>
              <Button type="submit" loading={saving}>{editId ? 'Uložit' : 'Vytvořit'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* Tree table */}
      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-soft">Načítám...</div>
        ) : flat.length === 0 ? (
          <div className="p-8 text-center text-gray-soft">Žádné kategorie. <button onClick={openCreate} className="text-forest font-medium">Vytvořte první.</button></div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream border-b border-cream-dark text-xs text-gray-soft">
              <tr>
                <th className="text-left px-4 py-3">Název</th>
                <th className="text-left px-4 py-3">EN / DE</th>
                <th className="text-left px-4 py-3">Pořadí</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {flat.map(({ node, depth }) => (
                <tr key={node.id} className="hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
                      {depth > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-soft shrink-0" />}
                      <span className="font-medium text-sm">{node.name_cs}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-soft">
                    {node.name_en || '—'} / {node.name_de || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-soft">{node.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-soft">{node.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(node)} className="text-gray-soft hover:text-forest transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(node.id, node.name_cs)} className="text-gray-soft hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
