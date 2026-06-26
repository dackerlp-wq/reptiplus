import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { coupons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json()

  if (!code) return NextResponse.json({ error: 'Zadejte kód.' }, { status: 400 })

  const db = getDb()
  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()))

  if (!coupon || !coupon.isActive) {
    return NextResponse.json({ error: 'Neplatný kód.' }, { status: 400 })
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Kód vypršel.' }, { status: 400 })
  }

  if (coupon.maxUses && coupon.usedCount! >= coupon.maxUses) {
    return NextResponse.json({ error: 'Kód byl již využit.' }, { status: 400 })
  }

  if (subtotal < (coupon.minOrderAmount || 0)) {
    return NextResponse.json({ error: `Minimální hodnota objednávky je ${coupon.minOrderAmount} Kč.` }, { status: 400 })
  }

  const discount = coupon.type === 'percent'
    ? subtotal * (coupon.value / 100)
    : coupon.value

  return NextResponse.json({ coupon, discount })
}
