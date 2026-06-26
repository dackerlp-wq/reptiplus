import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('blog_authors')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json({ authors: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, avatarInitial, avatarUrl, bio, isDefault } = await req.json()
  if (!name) return NextResponse.json({ error: 'Jméno je povinné' }, { status: 400 })

  if (isDefault) {
    await supabaseAdmin.from('blog_authors').update({ is_default: 0 }).neq('id', '')
  }

  const { data, error } = await supabaseAdmin.from('blog_authors').insert({
    id: generateId(),
    name,
    avatar_initial: avatarInitial || name[0].toUpperCase(),
    avatar_url: avatarUrl || null,
    bio: bio || null,
    is_default: isDefault ? 1 : 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ author: data })
}
