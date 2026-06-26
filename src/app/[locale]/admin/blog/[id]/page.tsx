import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import BlogForm from '../BlogForm'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*, blog_authors(id, name, avatar_initial, avatar_url, bio, is_default)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  const { data: productLinksRaw } = await supabaseAdmin
    .from('blog_post_products')
    .select('product_id, products(id, name_cs, name_en, sku, images, categories(name_cs))')
    .eq('blog_post_id', id)

  const { data: categoryLinksRaw } = await supabaseAdmin
    .from('blog_post_product_categories')
    .select('category_id, categories(id, name_cs)')
    .eq('blog_post_id', id)

  const { data: tagLinksRaw } = await supabaseAdmin
    .from('blog_post_tags')
    .select('tag_id, blog_tags(id, name_cs, name_en, name_de)')
    .eq('blog_post_id', id)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Upravit článek</h1>
      <BlogForm initialData={{
        id: post.id,
        titleCs: post.title_cs,
        titleEn: post.title_en,
        titleDe: post.title_de,
        contentCs: post.content_cs,
        contentEn: post.content_en,
        contentDe: post.content_de,
        excerpt: post.excerpt,
        image: post.image,
        isPublished: !!post.is_published,
        blogAuthorId: post.blog_author_id || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        productLinks: (productLinksRaw || []) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categoryLinks: (categoryLinksRaw || []) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tagLinks: (tagLinksRaw || []) as any,
      }} />
    </div>
  )
}
