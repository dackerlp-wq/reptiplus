'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toaster'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

type Post = { id: string; slug: string; title_cs: string; title_en?: string; is_published: number; published_at?: string; created_at: string }

export default function AdminBlogPage() {
  const locale = useLocale()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/blog')
    const data = await res.json()
    setPosts(data.posts || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const deletePost = async (id: string) => {
    if (!confirm('Opravdu smazat článek?')) return
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' })
    toast('Článek smazán', 'success')
    load()
  }

  const togglePublish = async (post: Post) => {
    await fetch(`/api/admin/blog/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titleCs: post.title_cs, titleEn: post.title_en,
        isPublished: !post.is_published,
      }),
    })
    toast(post.is_published ? 'Skryt' : 'Publikován', 'success')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Blog</h1>
        <Link href={`/${locale}/admin/blog/novy`}>
          <Button size="sm"><Plus className="w-4 h-4" /> Nový článek</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-cream-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-soft">Načítám...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-soft">Žádné články. <Link href={`/${locale}/admin/blog/novy`} className="text-forest font-medium">Vytvořte první.</Link></div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream border-b border-cream-dark text-xs text-gray-soft">
              <tr>
                <th className="text-left px-4 py-3">Název</th>
                <th className="text-left px-4 py-3">Datum</th>
                <th className="text-left px-4 py-3">Stav</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{post.title_cs}</p>
                    {post.title_en && <p className="text-xs text-gray-soft">{post.title_en}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-soft">
                    {formatDate(post.published_at || post.created_at, locale as Locale)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${post.is_published ? 'bg-sage text-forest' : 'bg-cream-dark text-gray-soft'}`}>
                      {post.is_published ? 'Publikován' : 'Koncept'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => togglePublish(post)} title={post.is_published ? 'Skrýt' : 'Publikovat'} className="text-gray-soft hover:text-forest transition-colors">
                        {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Link href={`/${locale}/admin/blog/${post.id}`} className="text-gray-soft hover:text-forest transition-colors">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button onClick={() => deletePost(post.id)} className="text-gray-soft hover:text-red-500 transition-colors">
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
