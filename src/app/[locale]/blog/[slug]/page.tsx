import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { ArrowLeft, Calendar, User } from 'lucide-react'

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*, users(first_name, last_name)')
    .eq('slug', slug)
    .single()

  if (!post || !post.is_published) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const author = (post as any).users

  const titleMap: Record<string, string | null | undefined> = { cs: post.title_cs, en: post.title_en, de: post.title_de }
  const contentMap: Record<string, string | null | undefined> = { cs: post.content_cs, en: post.content_en, de: post.content_de }
  const title = titleMap[locale] || post.title_cs
  const content = contentMap[locale] || post.content_cs

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link href={`/${locale}/blog`} className="flex items-center gap-2 text-sm text-gray-soft hover:text-forest mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zpět na blog
      </Link>

      <article>
        <h1 className="text-3xl font-bold text-charcoal mb-4">{title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-soft mb-8">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(post.published_at || post.created_at || '', locale as Locale)}
          </span>
          {author && (
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {author.first_name} {author.last_name}
            </span>
          )}
        </div>

        {content ? (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p className="text-gray-soft">Obsah tohoto článku není dostupný.</p>
        )}
      </article>
    </div>
  )
}
