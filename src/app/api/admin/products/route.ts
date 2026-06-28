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
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at')
  return NextResponse.json({ products: products || [] })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json()
  const { nameCs, nameEn, nameDe, descriptionCs, descriptionEn, descriptionDe,
    categoryId, price, vatRate, comparePrice, stock, lowStockThreshold,
    images, parameters, isActive, isFeatured, isNew, isSale, weight, sku } = body

  if (!nameCs || !price) {
    return NextResponse.json({ error: 'Název a cena jsou povinné.' }, { status: 400 })
  }

  const id = generateId()
  const slug = slugify(nameCs) + '-' + id.slice(-4)
  const priceNum = parseFloat(price)
  const vatNum = parseFloat(vatRate || '21')
  const priceExcl = priceNum / (1 + vatNum / 100)
  const comparePriceNum = comparePrice ? parseFloat(comparePrice) : null

  // Auto: new products always get is_new=1 and a 90-day badge window
  const newUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  // Auto: is_sale=1 whenever a compare_price is set
  const autoIsSale = (comparePriceNum && comparePriceNum > priceNum) ? 1 : (isSale ? 1 : 0)

  await supabaseAdmin.from('products').insert({
    id, slug,
    sku: sku || slug,
    name_cs: nameCs,
    name_en: nameEn || nameCs,
    name_de: nameDe || nameCs,
    description_cs: descriptionCs || null,
    description_en: descriptionEn || null,
    description_de: descriptionDe || null,
    category_id: categoryId || null,
    price: priceNum,
    price_excl: Math.round(priceExcl * 100) / 100,
    vat_rate: vatNum,
    compare_price: comparePriceNum,
    stock: parseInt(stock || '0'),
    low_stock_threshold: parseInt(lowStockThreshold || '5'),
    images: JSON.stringify(images || []),
    parameters: JSON.stringify(parameters || {}),
    is_active: isActive ? 1 : 0,
    is_featured: isFeatured ? 1 : 0,
    is_new: 1,
    new_until: newUntil,
    is_sale: autoIsSale,
    weight: weight ? parseFloat(weight) : null,
  })

  return NextResponse.json({ id, slug })
}
