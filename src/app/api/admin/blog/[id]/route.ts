import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*, blog_authors(id, name, avatar_initial, avatar_url, bio, is_default)')
    .eq('id', id)
    .single()

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: productLinks } = await supabaseAdmin
    .from('blog_post_products')
    .select('product_id, products(id, name_cs, name_en, sku, images, categories(name_cs))')
    .eq('blog_post_id', id)

  const { data: categoryLinks } = await supabaseAdmin
    .from('blog_post_product_categories')
    .select('category_id, categories(id, name_cs)')
    .eq('blog_post_id', id)

  return NextResponse.json({
    post,
    productLinks: productLinks || [],
    categoryLinks: categoryLinks || [],
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const {
    titleCs, titleEn, titleDe,
    contentCs, contentEn, contentDe,
    excerpt, image, isPublished,
    blogAuthorId, blogCategoryId, productIds, categoryIds, tagIds,
  } = body

  const { data: existing } = await supabaseAdmin
    .from('blog_posts')
    .select('published_at, is_published')
    .eq('id', id)
    .single()

  const publishedAt = isPublished && !existing?.is_published
    ? new Date().toISOString()
    : (existing?.published_at || null)

  const { data, error } = await supabaseAdmin.from('blog_posts').update({
    title_cs: titleCs,
    title_en: titleEn || null,
    title_de: titleDe || null,
    content_cs: contentCs || null,
    content_en: contentEn || null,
    content_de: contentDe || null,
    excerpt: excerpt || null,
    image: image || null,
    blog_author_id: blogAuthorId || null,
    blog_category_id: blogCategoryId || null,
    is_published: isPublished ? 1 : 0,
    published_at: publishedAt,
  }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync product links (replace all)
  if (productIds !== undefined) {
    await supabaseAdmin.from('blog_post_products').delete().eq('blog_post_id', id)
    if (productIds.length) {
      await supabaseAdmin.from('blog_post_products').insert(
        productIds.map((pid: string) => ({ blog_post_id: id, product_id: pid }))
      )
    }
  }
  if (categoryIds !== undefined) {
    await supabaseAdmin.from('blog_post_product_categories').delete().eq('blog_post_id', id)
    if (categoryIds.length) {
      await supabaseAdmin.from('blog_post_product_categories').insert(
        categoryIds.map((cid: string) => ({ blog_post_id: id, category_id: cid }))
      )
    }
  }
  if (tagIds !== undefined) {
    await supabaseAdmin.from('blog_post_tags').delete().eq('blog_post_id', id)
    if (tagIds.length) {
      await supabaseAdmin.from('blog_post_tags').insert(
        tagIds.map((tid: string) => ({ blog_post_id: id, tag_id: tid }))
      )
    }
  }

  return NextResponse.json({ post: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await supabaseAdmin.from('blog_posts').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
