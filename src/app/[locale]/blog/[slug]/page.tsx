import { getDb } from '@/lib/db'
import { blogPosts, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { ArrowLeft, Calendar, User } from 'lucide-react'

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params
  const db = getDb()

  const results = await db.select({ post: blogPosts, author: { firstName: users.firstName, lastName: users.lastName } })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.slug, slug))

  if (!results.length || !results[0].post.isPublished) notFound()

  const { post, author } = results[0]
  const titleMap: Record<string, string | null | undefined> = { cs: post.titleCs, en: post.titleEn, de: post.titleDe }
  const contentMap: Record<string, string | null | undefined> = { cs: post.contentCs, en: post.contentEn, de: post.contentDe }
  const title = titleMap[locale] || post.titleCs
  const content = contentMap[locale] || post.contentCs

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
            {formatDate(post.publishedAt || post.createdAt || '', locale as Locale)}
          </span>
          {author && (
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {author.firstName} {author.lastName}
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
