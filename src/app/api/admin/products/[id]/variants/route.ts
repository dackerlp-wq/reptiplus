import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, generateId } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('sort_order')

  if (error) return NextResponse.json({ variants: [] })
  return NextResponse.json({ variants: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { variants } = body as {
    variants: {
      name_cs: string; name_en?: string; name_de?: string
      sku?: string; price?: number | null; stock?: number
      attributes?: Record<string, string>; parameters?: Record<string, string>
      restock_date?: string | null; sort_order?: number
    }[]
  }

  await supabaseAdmin.from('product_variants').delete().eq('product_id', id)

  if (variants && variants.length > 0) {
    const rows = variants.map((v, i) => ({
      id: generateId(),
      product_id: id,
      name_cs: v.name_cs,
      name_en: v.name_en || v.name_cs,
      name_de: v.name_de || v.name_cs,
      sku: v.sku || null,
      price: v.price ?? null,
      stock: v.stock ?? 0,
      attributes: v.attributes ?? {},
      parameters: v.parameters ?? {},
      restock_date: v.restock_date || null,
      sort_order: v.sort_order ?? i,
    }))
    await supabaseAdmin.from('product_variants').insert(rows)
  }

  return NextResponse.json({ success: true })
}
