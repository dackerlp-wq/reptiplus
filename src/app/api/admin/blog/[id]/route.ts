import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: post } = await supabaseAdmin.from('blog_posts').select('*').eq('id', id).single()
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ post })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { titleCs, titleEn, titleDe, contentCs, contentEn, contentDe, excerpt, image, isPublished } = body

  const { data: existing } = await supabaseAdmin.from('blog_posts').select('published_at, is_published').eq('id', id).single()
  const publishedAt = isPublished && !existing?.is_published ? new Date().toISOString() : (existing?.published_at || null)

  const { data, error } = await supabaseAdmin.from('blog_posts').update({
    title_cs: titleCs,
    title_en: titleEn || null,
    title_de: titleDe || null,
    content_cs: contentCs || null,
    content_en: contentEn || null,
    content_de: contentDe || null,
    excerpt: excerpt || null,
    image: image || null,
    is_published: isPublished ? 1 : 0,
    published_at: publishedAt,
  }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await supabaseAdmin.from('blog_posts').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
