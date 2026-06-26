import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Produkt nenalezen.' }, { status: 404 })
  }

  let category = null
  if (product.category_id) {
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', product.category_id)
      .single()
    category = cat
  }

  return NextResponse.json({ product, category })
}
