import { getDb } from '@/lib/db'
import { blogPosts, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { Calendar } from 'lucide-react'

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('blog')
  const db = getDb()

  const posts = await db.select({
    post: blogPosts,
    author: { firstName: users.firstName, lastName: users.lastName },
  })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.isPublished, 1))
    .orderBy(blogPosts.publishedAt)

  const getTitle = (post: typeof posts[0]['post']) => {
    const map: Record<string, string | null | undefined> = { cs: post.titleCs, en: post.titleEn, de: post.titleDe }
    return map[locale] || post.titleCs
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-charcoal mb-8">{t('title')}</h1>

      {posts.length === 0 ? (
        <p className="text-gray-soft text-center py-16">{t('no_posts')}</p>
      ) : (
        <div className="space-y-6">
          {posts.map(({ post, author }) => (
            <article key={post.id} className="bg-white rounded-2xl border border-cream-dark overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-3 text-xs text-gray-soft mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.publishedAt || post.createdAt || '', locale as Locale)}
                  </span>
                  {author && <span>{author.firstName} {author.lastName}</span>}
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
