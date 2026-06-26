import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // pending | approved | spam | rejected | all
  const postId = searchParams.get('post_id')

  let query = supabaseAdmin
    .from('blog_comments')
    .select('*, blog_posts(id, title_cs, slug), users(first_name, last_name, email)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (postId) query = query.eq('blog_post_id', postId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count pending separately for badge
  const { count: pendingCount } = await supabaseAdmin
    .from('blog_comments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ comments: data || [], pendingCount: pendingCount || 0 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids, status } = await req.json()
  if (!ids?.length || !status) return NextResponse.json({ error: 'Missing ids or status' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('blog_comments')
    .update({ status })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!ids?.length) return NextResponse.json({ error: 'Missing ids' }, { status: 400 })

  await supabaseAdmin.from('blog_comments').delete().in('id', ids)
  return NextResponse.json({ ok: true })
}
