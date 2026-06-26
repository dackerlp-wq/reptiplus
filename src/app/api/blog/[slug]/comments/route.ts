import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!post) return NextResponse.json({ comments: [] })

  const { data } = await supabaseAdmin
    .from('blog_comments')
    .select('id, content, guest_name, parent_id, likes_count, created_at, user_id, users(first_name, last_name)')
    .eq('blog_post_id', post.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })

  return NextResponse.json({ comments: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await req.json()

  // Honeypot check
  if (body.website) return NextResponse.json({ ok: true })

  const { content, guestName, guestEmail, parentId } = body
  if (!content?.trim()) return NextResponse.json({ error: 'Komentář je prázdný' }, { status: 400 })

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .eq('is_published', 1)
    .single()

  if (!post) return NextResponse.json({ error: 'Článek nenalezen' }, { status: 404 })

  const session = await getSession()
  const userId = session?.id || null

  if (!userId && (!guestName?.trim() || !guestEmail?.trim())) {
    return NextResponse.json({ error: 'Vyplňte jméno a e-mail' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('blog_comments').insert({
    id: generateId(),
    blog_post_id: post.id,
    user_id: userId,
    guest_name: userId ? null : guestName.trim(),
    guest_email: userId ? null : guestEmail.trim(),
    content: content.trim(),
    status: 'pending',
    parent_id: parentId || null,
    likes_count: 0,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: 'Komentář odeslán a čeká na schválení.' })
}
