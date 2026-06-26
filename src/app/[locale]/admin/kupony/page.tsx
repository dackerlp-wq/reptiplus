'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { formatDate } from '@/lib/utils'

interface Coupon {
  id: string; code: string; type: string; value: number
  minOrderAmount: number; maxUses: number | null; usedCount: number
  isActive: number; expiresAt: string | null; createdAt: string
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ code: '', type: 'percent', value: '', minOrderAmount: '0', maxUses: '', expiresAt: '' })

  useEffect(() => {
    fetch('/api/admin/coupons').then(r => r.json()).then(data => {
      setCoupons(data.coupons || [])
      setLoading(false)
    })
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        value: parseFloat(form.value),
        minOrderAmount: parseFloat(form.minOrderAmount || '0'),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setCoupons(c => [data.coupon, ...c])
      toast('Kupón vytvořen', 'success')
      setShowForm(false)
      setForm({ code: '', type: 'percent', value: '', minOrderAmount: '0', maxUses: '', expiresAt: '' })
    } else {
      const data = await res.json()
      toast(data.error, 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Smazat kupón?')) return
    const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' })
    if (res.ok) { setCoupons(c => c.filter(x => x.id !== id)); toast('Kupón smazán', 'success') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kupóny</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> Nový kupón
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-cream-dark p-6 mb-6">
          <h2 className="font-bold mb-4">Vytvořit kupón</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="Kód *" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
            <div>
              <label className="block text-sm font-medium mb-1">Typ slevy</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-cream-dark rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-forest">
                <option value="percent">Procento (%)</option>
                <option value="fixed">Pevná částka (Kč)</option>
              </select>
            </div>
            <Input label="Hodnota slevy *" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required />
            <Input label="Min. hodnota objednávky" type="number" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} />
            <Input label="Max. použití (prázdné = neomezeno)" type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
            <Input label="Platný do (datum)" type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            <div className="col-span-2 md:col-span-3 flex gap-3">
              <Button type="submit">Vytvořit</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Zrušit</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? <div className="py-16 text-center text-gray-soft">Načítám...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark text-gray-soft text-xs">
                <th className="px-4 py-3 text-left">Kód</th>
                <th className="px-4 py-3 text-left">Typ</th>
                <th className="px-4 py-3 text-right">Sleva</th>
                <th className="px-4 py-3 text-right">Použití</th>
                <th className="px-4 py-3 text-left">Platnost</th>
                <th className="px-4 py-3 text-center">Aktivní</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-b border-cream-dark hover:bg-cream/40">
                  <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3">{c.type === 'percent' ? 'Procento' : 'Pevná'}</td>
                  <td className="px-4 py-3 text-right font-medium">{c.type === 'percent' ? `${c.value}%` : `${c.value} Kč`}</td>
                  <td className="px-4 py-3 text-right">{c.usedCount}/{c.maxUses ?? '∞'}</td>
                  <td className="px-4 py-3 text-xs">{c.expiresAt ? formatDate(c.expiresAt, 'cs') : 'Bez omezení'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`w-2 h-2 rounded-full inline-block ${c.isActive ? 'bg-forest' : 'bg-red-400'}`} />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(c.id)} className="text-gray-soft hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-gray-soft">Žádné kupóny</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
