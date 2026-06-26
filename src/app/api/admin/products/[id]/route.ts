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
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const priceNum = parseFloat(body.price)
  const vatNum = parseFloat(body.vatRate || '21')
  const priceExcl = priceNum / (1 + vatNum / 100)

  await supabaseAdmin.from('products').update({
    name_cs: body.nameCs,
    name_en: body.nameEn || body.nameCs,
    name_de: body.nameDe || body.nameCs,
    description_cs: body.descriptionCs || null,
    description_en: body.descriptionEn || null,
    description_de: body.descriptionDe || null,
    category_id: body.categoryId || null,
    price: priceNum,
    price_excl: Math.round(priceExcl * 100) / 100,
    vat_rate: vatNum,
    compare_price: body.comparePrice ? parseFloat(body.comparePrice) : null,
    stock: parseInt(body.stock || '0'),
    low_stock_threshold: parseInt(body.lowStockThreshold || '5'),
    images: typeof body.images === 'string' ? body.images : JSON.stringify(body.images || []),
    parameters: typeof body.parameters === 'string' ? body.parameters : JSON.stringify(body.parameters || {}),
    is_active: body.isActive ? 1 : 0,
    is_featured: body.isFeatured ? 1 : 0,
    is_new: body.isNew ? 1 : 0,
    is_sale: body.isSale ? 1 : 0,
    weight: body.weight ? parseFloat(body.weight) : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  await supabaseAdmin.from('products').update({ is_active: 0 }).eq('id', id)

  return NextResponse.json({ success: true })
}
