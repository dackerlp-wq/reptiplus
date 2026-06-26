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
    compare_price: comparePrice ? parseFloat(comparePrice) : null,
    stock: parseInt(stock || '0'),
    low_stock_threshold: parseInt(lowStockThreshold || '5'),
    images: JSON.stringify(images || []),
    parameters: JSON.stringify(parameters || {}),
    is_active: isActive ? 1 : 0,
    is_featured: isFeatured ? 1 : 0,
    is_new: isNew ? 1 : 0,
    is_sale: isSale ? 1 : 0,
    weight: weight ? parseFloat(weight) : null,
  })

  return NextResponse.json({ id, slug })
}
