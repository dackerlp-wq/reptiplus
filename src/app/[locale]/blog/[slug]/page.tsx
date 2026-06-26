import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import BlogPostClient from './BlogPostClient'

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*, blog_authors(id, name, avatar_initial, avatar_url, bio)')
    .eq('slug', slug)
    .single()

  if (!post || !post.is_published) notFound()

  // Related blog posts (latest 2, excluding current)
  const { data: related } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title_cs, title_en, title_de, excerpt')
    .eq('is_published', 1)
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(2)

  const { data: productLinksRaw } = await supabaseAdmin
    .from('blog_post_products')
    .select('products(id, slug, name_cs, name_en, name_de, images, categories(name_cs, name_en, name_de))')
    .eq('blog_post_id', post.id)

  const { data: categoryLinksRaw } = await supabaseAdmin
    .from('blog_post_product_categories')
    .select('categories(id, name_cs)')
    .eq('blog_post_id', post.id)

  const { data: tagLinksRaw } = await supabaseAdmin
    .from('blog_post_tags')
    .select('blog_tags(id, name_cs, name_en, name_de)')
    .eq('blog_post_id', post.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = (tagLinksRaw || []).map((l: any) => l.blog_tags).filter(Boolean)

  const { count: likesCount } = await supabaseAdmin
    .from('blog_post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('blog_post_id', post.id)

  const { count: commentsCount } = await supabaseAdmin
    .from('blog_comments')
    .select('*', { count: 'exact', head: true })
    .eq('blog_post_id', post.id)
    .eq('status', 'approved')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productLinks = (productLinksRaw || []).map((l: any) => l.products).filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryLinks = (categoryLinksRaw || []).map((l: any) => l.categories).filter(Boolean)

  const titleMap: Record<string, string | null | undefined> = { cs: post.title_cs, en: post.title_en, de: post.title_de }
  const contentMap: Record<string, string | null | undefined> = { cs: post.content_cs, en: post.content_en, de: post.content_de }
  const title = (titleMap[locale] || post.title_cs) as string
  const content = (contentMap[locale] || post.content_cs) as string

  return (
    <BlogPostClient
      post={post}
      title={title}
      content={content}
      locale={locale as Locale}
      author={post.blog_authors}
      related={related || []}
      productLinks={productLinks}
      categoryLinks={categoryLinks}
      tags={tags}
      initialLikes={likesCount || 0}
      commentsCount={commentsCount || 0}
      slug={slug}
    />
  )
}
