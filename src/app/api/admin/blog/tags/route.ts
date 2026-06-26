import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('blog_tags')
    .select('*')
    .order('name_cs', { ascending: true })
  return NextResponse.json({ tags: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nameCs, nameEn, nameDe } = await req.json()
  if (!nameCs) return NextResponse.json({ error: 'Název (CZ) je povinný' }, { status: 400 })

  const slug = slugify(nameCs)
  const id = generateId()

  const { data, error } = await supabaseAdmin.from('blog_tags').insert({
    id, name_cs: nameCs, name_en: nameEn || null, name_de: nameDe || null, slug,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tag: data })
}
