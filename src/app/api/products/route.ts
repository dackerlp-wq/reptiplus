import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq, like, and, gte, lte, desc, asc, or } from 'drizzle-orm'

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

  const db = getDb()

  const conditions = [eq(products.isActive, 1)]

  if (category) {
    const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, category))
    if (cat) conditions.push(eq(products.categoryId, cat.id))
  }

  if (search) {
    conditions.push(or(
      like(products.nameCs, `%${search}%`),
      like(products.nameEn, `%${search}%`),
      like(products.sku, `%${search}%`)
    )!)
  }

  if (filter === 'novinka') conditions.push(eq(products.isNew, 1))
  if (filter === 'sleva') conditions.push(eq(products.isSale, 1))
  if (filter === 'doporucene') conditions.push(eq(products.isFeatured, 1))

  if (minPrice) conditions.push(gte(products.price, parseFloat(minPrice)))
  if (maxPrice) conditions.push(lte(products.price, parseFloat(maxPrice)))

  const orderBy = sort === 'price_asc' ? asc(products.price)
    : sort === 'price_desc' ? desc(products.price)
    : desc(products.createdAt)

  const allProducts = await db.select().from(products)
    .where(and(...conditions))
    .orderBy(orderBy)

  const total = allProducts.length
  const paginated = allProducts.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ products: paginated, total, page, pages: Math.ceil(total / limit) })
}
