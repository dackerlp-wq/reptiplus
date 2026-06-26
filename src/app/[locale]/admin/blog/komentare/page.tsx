'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/Toaster'
import { CheckCircle, XCircle, AlertTriangle, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { useLocale } from 'next-intl'

type Comment = {
  id: string
  content: string
  status: 'pending' | 'approved' | 'spam' | 'rejected'
  created_at: string
  guest_name: string | null
  guest_email: string | null
  user_id: string | null
  blog_posts: { id: string; title_cs: string; slug: string } | null
  users: { first_name: string; last_name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  all: 'Vše',
  pending: 'Ke schválení',
  approved: 'Schváleno',
  spam: 'Spam',
  rejected: 'Zamítnuto',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  spam: 'bg-red-100 text-red-700',
  rejected: 'bg-gray-100 text-gray-600',
}

export default function KomentarePage() {
  const locale = useLocale()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [pendingCount, setPendingCount] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    const res = await fetch(`/api/admin/blog/comments?status=${filter}`)
    const data = await res.json()
    setComments(data.comments || [])
    setPendingCount(data.pendingCount || 0)
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (ids: string[], status: string) => {
    await fetch('/api/admin/blog/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    })
    toast(`Stav změněn na: ${STATUS_LABELS[status] || status}`, 'success')
    load()
  }

  const deleteComments = async (ids: string[]) => {
    if (!confirm(`Smazat ${ids.length} komentář(ů)?`)) return
    await fetch('/api/admin/blog/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    toast('Smazáno', 'success')
    load()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === comments.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(comments.map(c => c.id)))
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const authorName = (c: Comment) => c.users
    ? `${c.users.first_name} ${c.users.last_name}`
    : (c.guest_name || 'Neznámý')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Komentáře</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-gray-soft mt-0.5">{pendingCount} čeká na schválení</p>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-cream rounded-lg p-1 w-fit">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === key ? 'bg-white text-forest shadow-sm' : 'text-gray-soft hover:text-charcoal'}`}
          >
            {label}
            {key === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-forest/5 border border-forest/20 rounded-lg">
          <span className="text-sm font-medium text-forest">Vybráno: {selected.size}</span>
          <button onClick={() => updateStatus([...selected], 'approved')} className="flex items-center gap-1 text-sm text-green-700 hover:underline">
            <CheckCircle className="w-4 h-4" /> Schválit
          </button>
          <button onClick={() => updateStatus([...selected], 'rejected')} className="flex items-center gap-1 text-sm text-gray-600 hover:underline">
            <XCircle className="w-4 h-4" /> Zamítnout
          </button>
          <button onClick={() => updateStatus([...selected], 'spam')} className="flex items-center gap-1 text-sm text-amber-700 hover:underline">
            <AlertTriangle className="w-4 h-4" /> Spam
          </button>
          <button onClick={() => deleteComments([...selected])} className="flex items-center gap-1 text-sm text-red-600 hover:underline">
            <Trash2 className="w-4 h-4" /> Smazat
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-soft">Načítám...</div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-gray-soft">Žádné komentáře.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream border-b border-cream-dark text-xs text-gray-soft">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selected.size === comments.length && comments.length > 0}
                    onChange={toggleAll} className="w-4 h-4 accent-forest" />
                </th>
                <th className="text-left px-4 py-3">Autor</th>
                <th className="text-left px-4 py-3">Komentář</th>
                <th className="text-left px-4 py-3">Článek</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Stav</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {comments.map(c => (
                <>
                  <tr key={c.id} className={`hover:bg-cream/50 ${selected.has(c.id) ? 'bg-forest/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 accent-forest" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{authorName(c)}</div>
                      <div className="text-xs text-gray-soft">{c.user_id ? 'Přihlášen' : 'Host'}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <button onClick={() => toggleExpand(c.id)} className="flex items-start gap-1 text-sm text-left w-full">
                        {expanded.has(c.id) ? <ChevronDown className="w-4 h-4 shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" />}
                        <span className={expanded.has(c.id) ? '' : 'line-clamp-2'}>{c.content}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-soft">
                      {c.blog_posts?.title_cs || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-soft whitespace-nowrap">
                      {formatDate(c.created_at, locale as Locale)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {c.status !== 'approved' && (
                          <button onClick={() => updateStatus([c.id], 'approved')} title="Schválit" className="text-green-600 hover:text-green-700">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {c.status !== 'rejected' && (
                          <button onClick={() => updateStatus([c.id], 'rejected')} title="Zamítnout" className="text-gray-400 hover:text-gray-600">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {c.status !== 'spam' && (
                          <button onClick={() => updateStatus([c.id], 'spam')} title="Spam" className="text-amber-500 hover:text-amber-700">
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => deleteComments([c.id])} title="Smazat" className="text-gray-soft hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
