import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { slugify } from '@/lib/utils'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function GET() {
  const { data: posts } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title_cs, title_en, is_published, published_at, created_at, blog_author_id, blog_authors(name)')
    .order('created_at', { ascending: false })

  const { data: pendingRaw } = await supabaseAdmin
    .from('blog_comments')
    .select('blog_post_id')
    .eq('status', 'pending')

  const pendingByPost: Record<string, number> = {}
  for (const row of pendingRaw || []) {
    pendingByPost[row.blog_post_id] = (pendingByPost[row.blog_post_id] || 0) + 1
  }

  const enriched = (posts || []).map(p => ({
    ...p,
    pending_comments: pendingByPost[p.id] || 0,
  }))

  const totalPending = Object.values(pendingByPost).reduce((a, b) => a + b, 0)

  return NextResponse.json({ posts: enriched, totalPending })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    titleCs, titleEn, titleDe,
    contentCs, contentEn, contentDe,
    excerpt, image, isPublished,
    blogAuthorId, productIds, categoryIds, tagIds,
  } = body

  if (!titleCs) return NextResponse.json({ error: 'Název je povinný' }, { status: 400 })

  const slug = slugify(titleCs) + '-' + Date.now().toString(36)
  const now = new Date().toISOString()
  const id = generateId()

  let blogAuthorIdResolved: string | null = blogAuthorId || null
  if (!blogAuthorIdResolved) {
    const { data: defaultAuthor } = await supabaseAdmin
      .from('blog_authors')
      .select('id')
      .eq('is_default', 1)
      .single()
    blogAuthorIdResolved = defaultAuthor?.id || null
  }

  const { data, error } = await supabaseAdmin.from('blog_posts').insert({
    id, slug,
    title_cs: titleCs, title_en: titleEn || null, title_de: titleDe || null,
    content_cs: contentCs || null, content_en: contentEn || null, content_de: contentDe || null,
    excerpt: excerpt || null, image: image || null,
    author_id: session.id,
    blog_author_id: blogAuthorIdResolved,
    is_published: isPublished ? 1 : 0,
    published_at: isPublished ? now : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Product/category links require migration_blog_v2.sql
  if (productIds?.length) {
    await supabaseAdmin.from('blog_post_products').insert(
      productIds.map((pid: string) => ({ blog_post_id: id, product_id: pid }))
    )
  }
  if (categoryIds?.length) {
    await supabaseAdmin.from('blog_post_product_categories').insert(
      categoryIds.map((cid: string) => ({ blog_post_id: id, category_id: cid }))
    )
  }

  return NextResponse.json({ post: data })
}
