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
    .select('id, slug, title_cs, title_en, is_published, published_at, created_at')
    .order('created_at', { ascending: false })
  return NextResponse.json({ posts: posts || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { titleCs, titleEn, titleDe, contentCs, contentEn, contentDe, excerpt, image, isPublished } = body

  if (!titleCs) return NextResponse.json({ error: 'Název je povinný' }, { status: 400 })

  const slug = slugify(titleCs) + '-' + Date.now().toString(36)
  const now = new Date().toISOString()

  const { data, error } = await supabaseAdmin.from('blog_posts').insert({
    id: generateId(),
    slug,
    title_cs: titleCs,
    title_en: titleEn || null,
    title_de: titleDe || null,
    content_cs: contentCs || null,
    content_en: contentEn || null,
    content_de: contentDe || null,
    excerpt: excerpt || null,
    image: image || null,
    author_id: session.id,
    is_published: isPublished ? 1 : 0,
    published_at: isPublished ? now : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
