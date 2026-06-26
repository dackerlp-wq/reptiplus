import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { Calendar } from 'lucide-react'

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('blog')

  const { data: posts } = await supabaseAdmin
    .from('blog_posts')
    .select('*, users(first_name, last_name)')
    .eq('is_published', 1)
    .order('published_at')

  const getTitle = (post: Record<string, string | null>) => {
    const map: Record<string, string | null | undefined> = { cs: post.title_cs, en: post.title_en, de: post.title_de }
    return map[locale] || post.title_cs
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-charcoal mb-8">{t('title')}</h1>

      {!posts?.length ? (
        <p className="text-gray-soft text-center py-16">{t('no_posts')}</p>
      ) : (
        <div className="space-y-6">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {posts.map((post: any) => (
            <article key={post.id} className="bg-white rounded-2xl border border-cream-dark overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-gray-soft mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.published_at || post.created_at || '', locale as Locale)}
                  </span>
                  {post.users && <span>{post.users.first_name} {post.users.last_name}</span>}
                </div>
                <h2 className="text-xl font-bold mb-2 hover:text-forest transition-colors">
                  <Link href={`/${locale}/blog/${post.slug}`}>{getTitle(post)}</Link>
                </h2>
                {post.excerpt && <p className="text-gray-soft text-sm line-clamp-3 mb-4">{post.excerpt}</p>}
                <Link href={`/${locale}/blog/${post.slug}`} className="text-sm text-forest font-medium hover:underline">
                  {t('read_more')} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
