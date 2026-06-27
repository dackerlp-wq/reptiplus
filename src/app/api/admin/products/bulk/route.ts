import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { action, ids, value } = body as { action: string; ids: string[]; value?: number }

  if (!ids || ids.length === 0) return NextResponse.json({ error: 'Žádné produkty' }, { status: 400 })

  if (action === 'activate') {
    await supabaseAdmin.from('products').update({ is_active: 1 }).in('id', ids)
  } else if (action === 'deactivate') {
    await supabaseAdmin.from('products').update({ is_active: 0 }).in('id', ids)
  } else if (action === 'price_percent' && value !== undefined) {
    const { data: products } = await supabaseAdmin.from('products').select('id, price, vat_rate').in('id', ids)
    for (const p of products || []) {
      const newPrice = Math.round(p.price * (1 + value / 100) * 100) / 100
      const vatNum = p.vat_rate || 21
      const newPriceExcl = Math.round(newPrice / (1 + vatNum / 100) * 100) / 100
      await supabaseAdmin.from('products').update({ price: newPrice, price_excl: newPriceExcl, updated_at: new Date().toISOString() }).eq('id', p.id)
    }
  } else if (action === 'delete') {
    await supabaseAdmin.from('products').update({ is_active: 0 }).in('id', ids)
  } else if (action === 'export_csv') {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, sku, name_cs, name_en, name_de, price, stock, is_active, is_new, is_sale, is_featured')
      .in('id', ids)

    const rows = (products || []).map(p =>
      [p.sku, p.name_cs, p.name_en, p.name_de, p.price, p.stock, p.is_active ? 'ano' : 'ne', p.is_new ? 'ano' : 'ne', p.is_sale ? 'ano' : 'ne'].join(',')
    )
    const csv = ['SKU,Název CZ,Název EN,Název DE,Cena,Sklad,Aktivní,Novinka,Sleva', ...rows].join('\n')
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=produkty.csv' }
    })
  } else {
    return NextResponse.json({ error: 'Neznámá akce' }, { status: 400 })
  }

  return NextResponse.json({ success: true, affected: ids.length })
}
