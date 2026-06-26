import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { createHash } from 'crypto'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + process.env.JWT_SECRET).digest('hex').slice(0, 32)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession()

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!post) return NextResponse.json({ count: 0, liked: false })

  const { count } = await supabaseAdmin
    .from('blog_post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('blog_post_id', post.id)

  let liked = false
  if (session?.id) {
    const { data } = await supabaseAdmin
      .from('blog_post_likes')
      .select('id')
      .eq('blog_post_id', post.id)
      .eq('user_id', session.id)
      .single()
    liked = !!data
  } else {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipHash = hashIp(ip)
    const { data } = await supabaseAdmin
      .from('blog_post_likes')
      .select('id')
      .eq('blog_post_id', post.id)
      .eq('ip_hash', ipHash)
      .single()
    liked = !!data
  }

  return NextResponse.json({ count: count || 0, liked })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getSession()

  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const ipHash = hashIp(ip)

  let existingQuery = supabaseAdmin
    .from('blog_post_likes')
    .select('id')
    .eq('blog_post_id', post.id)

  if (session?.id) {
    existingQuery = existingQuery.eq('user_id', session.id)
  } else {
    existingQuery = existingQuery.eq('ip_hash', ipHash)
  }

  const { data: existing } = await existingQuery.single()

  if (existing) {
    await supabaseAdmin.from('blog_post_likes').delete().eq('id', existing.id)
  } else {
    await supabaseAdmin.from('blog_post_likes').insert({
      id: generateId(),
      blog_post_id: post.id,
      user_id: session?.id || null,
      ip_hash: session?.id ? null : ipHash,
    })
  }

  const { count } = await supabaseAdmin
    .from('blog_post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('blog_post_id', post.id)

  return NextResponse.json({ count: count || 0, liked: !existing })
}
