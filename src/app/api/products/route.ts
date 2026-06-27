import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mapProduct } from '@/lib/mappers'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('kategorie')
  const search = searchParams.get('hledat')
  const sort = searchParams.get('seradit') || 'newest'
  const filter = searchParams.get('filtr')
  const minPrice = searchParams.get('min')
  const maxPrice = searchParams.get('max')
  const page = parseInt(searchParams.get('strana') || '1')
  const limit = 20

  let query = supabaseAdmin.from('products').select('*').eq('is_active', 1)

  if (category) {
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', category)
      .single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  if (search) {
    query = query.or(`name_cs.ilike.%${search}%,name_en.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  if (filter === 'novinka') query = query.eq('is_new', 1)
  if (filter === 'sleva') query = query.eq('is_sale', 1)
  if (filter === 'doporucene') query = query.eq('is_featured', 1)
  if (filter === 'dostupne') query = query.gt('stock', 0)

  if (minPrice) query = query.gte('price', parseFloat(minPrice))
  if (maxPrice) query = query.lte('price', parseFloat(maxPrice))

  if (sort === 'price_asc') query = query.order('price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data: allProducts } = await query

  const total = allProducts?.length || 0
  const paginated = (allProducts || []).slice((page - 1) * limit, page * limit)

  return NextResponse.json({ products: paginated.map(mapProduct), total, page, pages: Math.ceil(total / limit) })
}
