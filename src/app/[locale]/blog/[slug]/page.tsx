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

  // Related posts: prefer posts sharing tags, then same category, then latest
  const postTagsRes = await supabaseAdmin
    .from('blog_post_tags')
    .select('tag_id')
    .eq('blog_post_id', post.id)
  const tagIds = postTagsRes.error ? [] : (postTagsRes.data || []).map(r => r.tag_id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let related: any[] = []

  if (tagIds.length > 0) {
    const { data: byTagLinks } = await supabaseAdmin
      .from('blog_post_tags')
      .select('blog_post_id')
      .in('tag_id', tagIds)
      .neq('blog_post_id', post.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relatedIds = [...new Set((byTagLinks || []).map((r: any) => r.blog_post_id))]

    if (relatedIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('blog_posts')
        .select('id, slug, title_cs, title_en, title_de, excerpt, image')
        .eq('is_published', 1)
        .in('id', relatedIds)
        .limit(2)
      related = data || []
    }
  }

  // Fill with same blog category if not enough
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blogCategoryId = (post as any).blog_category_id
  if (related.length < 2 && blogCategoryId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const excludeIds = [post.id, ...related.map((r: any) => r.id)]
    const { data: catData } = await supabaseAdmin
      .from('blog_posts')
      .select('id, slug, title_cs, title_en, title_de, excerpt, image')
      .eq('is_published', 1)
      .eq('blog_category_id', blogCategoryId)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(2 - related.length)
    related = [...related, ...(catData || [])]
  }

  // Fallback: latest posts
  if (related.length < 2) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const excludeIds = [post.id, ...related.map((r: any) => r.id)]
    const { data: latestData } = await supabaseAdmin
      .from('blog_posts')
      .select('id, slug, title_cs, title_en, title_de, excerpt, image')
      .eq('is_published', 1)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .order('published_at', { ascending: false })
      .limit(2 - related.length)
    related = [...related, ...(latestData || [])]
  }

  const productLinksRes = await supabaseAdmin
    .from('blog_post_products')
    .select('products(id, slug, name_cs, name_en, name_de, price, stock, images, categories(name_cs, name_en, name_de))')
    .eq('blog_post_id', post.id)
  const productLinksRaw = productLinksRes.error ? [] : productLinksRes.data

  const categoryLinksRes = await supabaseAdmin
    .from('blog_post_product_categories')
    .select('categories(id, name_cs)')
    .eq('blog_post_id', post.id)
  const categoryLinksRaw = categoryLinksRes.error ? [] : categoryLinksRes.data

  const tagLinksRes = await supabaseAdmin
    .from('blog_post_tags')
    .select('blog_tags(id, name_cs, name_en, name_de, slug)')
    .eq('blog_post_id', post.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = tagLinksRes.error ? [] : (tagLinksRes.data || []).map((l: any) => l.blog_tags).filter(Boolean)

  const likesRes = await supabaseAdmin
    .from('blog_post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('blog_post_id', post.id)
  const likesCount = likesRes.error ? 0 : likesRes.count

  const commentsRes = await supabaseAdmin
    .from('blog_comments')
    .select('*', { count: 'exact', head: true })
    .eq('blog_post_id', post.id)
    .eq('status', 'approved')
  const commentsCount = commentsRes.error ? 0 : commentsRes.count

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
      related={related}
      productLinks={productLinks}
      categoryLinks={categoryLinks}
      tags={tags}
      initialLikes={likesCount || 0}
      commentsCount={commentsCount || 0}
      slug={slug}
    />
  )
}
