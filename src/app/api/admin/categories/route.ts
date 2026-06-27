import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, generateId } from '@/lib/auth'
import { slugify } from '@/lib/utils'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order')

  return NextResponse.json({ categories: data || [] })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { nameCs, nameEn, nameDe, descriptionCs, image, parentId, sortOrder } = body

  if (!nameCs) return NextResponse.json({ error: 'Název (CZ) je povinný' }, { status: 400 })

  const id = generateId()
  const slug = slugify(nameCs) + '-' + id.slice(-4)

  const { error } = await supabaseAdmin.from('categories').insert({
    id, slug,
    name_cs: nameCs,
    name_en: nameEn || nameCs,
    name_de: nameDe || nameCs,
    description_cs: descriptionCs || null,
    image: image || null,
    parent_id: parentId || null,
    sort_order: sortOrder ?? 0,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id, slug })
}
