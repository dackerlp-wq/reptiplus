import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name, avatarInitial, avatarUrl, bio, isDefault } = await req.json()

  if (isDefault) {
    await supabaseAdmin.from('blog_authors').update({ is_default: 0 }).neq('id', id)
  }

  const { data, error } = await supabaseAdmin.from('blog_authors').update({
    name,
    avatar_initial: avatarInitial,
    avatar_url: avatarUrl || null,
    bio: bio || null,
    is_default: isDefault ? 1 : 0,
  }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ author: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await supabaseAdmin.from('blog_authors').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
