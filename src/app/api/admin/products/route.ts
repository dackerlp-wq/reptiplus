import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

  const db = getDb()
  const allProducts = await db.select().from(products).orderBy(products.createdAt)
  return NextResponse.json({ products: allProducts })
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

  const db = getDb()
  const id = generateId()
  const slug = slugify(nameCs) + '-' + id.slice(-4)
  const priceNum = parseFloat(price)
  const vatNum = parseFloat(vatRate || '21')
  const priceExcl = priceNum / (1 + vatNum / 100)

  await db.insert(products).values({
    id, slug,
    sku: sku || slug,
    nameCs, nameEn: nameEn || nameCs, nameDe: nameDe || nameCs,
    descriptionCs: descriptionCs || null,
    descriptionEn: descriptionEn || null,
    descriptionDe: descriptionDe || null,
    categoryId: categoryId || null,
    price: priceNum,
    priceExcl: Math.round(priceExcl * 100) / 100,
    vatRate: vatNum,
    comparePrice: comparePrice ? parseFloat(comparePrice) : null,
    stock: parseInt(stock || '0'),
    lowStockThreshold: parseInt(lowStockThreshold || '5'),
    images: JSON.stringify(images || []),
    parameters: JSON.stringify(parameters || {}),
    isActive: isActive ? 1 : 0,
    isFeatured: isFeatured ? 1 : 0,
    isNew: isNew ? 1 : 0,
    isSale: isSale ? 1 : 0,
    weight: weight ? parseFloat(weight) : null,
  })

  return NextResponse.json({ id, slug })
}
