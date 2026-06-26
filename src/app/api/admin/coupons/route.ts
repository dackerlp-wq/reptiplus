import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { coupons } from '@/lib/db/schema'
import { getSession, generateId } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const db = getDb()
  const all = await db.select().from(coupons).orderBy(coupons.createdAt)
  return NextResponse.json({ coupons: all })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json()
  if (!body.code || !body.type || !body.value) {
    return NextResponse.json({ error: 'Kód, typ a hodnota jsou povinné.' }, { status: 400 })
  }

  const db = getDb()
  const id = generateId()

  const coupon = {
    id,
    code: body.code.toUpperCase(),
    type: body.type,
    value: body.value,
    minOrderAmount: body.minOrderAmount || 0,
    maxUses: body.maxUses || null,
    usedCount: 0,
    isActive: 1,
    expiresAt: body.expiresAt || null,
  }

  await db.insert(coupons).values(coupon)
  return NextResponse.json({ coupon })
}
