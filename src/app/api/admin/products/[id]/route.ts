import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

  const db = getDb()
  const priceNum = parseFloat(body.price)
  const vatNum = parseFloat(body.vatRate || '21')
  const priceExcl = priceNum / (1 + vatNum / 100)

  await db.update(products).set({
    nameCs: body.nameCs,
    nameEn: body.nameEn || body.nameCs,
    nameDe: body.nameDe || body.nameCs,
    descriptionCs: body.descriptionCs || null,
    descriptionEn: body.descriptionEn || null,
    descriptionDe: body.descriptionDe || null,
    categoryId: body.categoryId || null,
    price: priceNum,
    priceExcl: Math.round(priceExcl * 100) / 100,
    vatRate: vatNum,
    comparePrice: body.comparePrice ? parseFloat(body.comparePrice) : null,
    stock: parseInt(body.stock || '0'),
    lowStockThreshold: parseInt(body.lowStockThreshold || '5'),
    images: typeof body.images === 'string' ? body.images : JSON.stringify(body.images || []),
    parameters: typeof body.parameters === 'string' ? body.parameters : JSON.stringify(body.parameters || {}),
    isActive: body.isActive ? 1 : 0,
    isFeatured: body.isFeatured ? 1 : 0,
    isNew: body.isNew ? 1 : 0,
    isSale: body.isSale ? 1 : 0,
    weight: body.weight ? parseFloat(body.weight) : null,
    updatedAt: new Date().toISOString(),
  }).where(eq(products.id, id))

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  const db = getDb()
  await db.update(products).set({ isActive: 0 }).where(eq(products.id, id))

  return NextResponse.json({ success: true })
}
