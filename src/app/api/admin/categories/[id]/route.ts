import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const { error } = await supabaseAdmin.from('categories').update({
    name_cs: body.nameCs,
    name_en: body.nameEn || body.nameCs,
    name_de: body.nameDe || body.nameCs,
    description_cs: body.descriptionCs || null,
    image: body.image || null,
    parent_id: body.parentId || null,
    sort_order: body.sortOrder ?? 0,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const { data: children } = await supabaseAdmin
    .from('categories').select('id').eq('parent_id', id).limit(1)
  if (children && children.length > 0)
    return NextResponse.json({ error: 'Kategorie má podkategorie. Nejdříve je odstraňte.' }, { status: 400 })

  const { data: products } = await supabaseAdmin
    .from('products').select('id').eq('category_id', id).limit(1)
  if (products && products.length > 0)
    return NextResponse.json({ error: 'Kategorie má produkty. Nejdříve je přeřaďte.' }, { status: 400 })

  await supabaseAdmin.from('categories').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
