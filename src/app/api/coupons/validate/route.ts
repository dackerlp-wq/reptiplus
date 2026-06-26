import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json()

  if (!code) return NextResponse.json({ error: 'Zadejte kód.' }, { status: 400 })

  const { data: coupon } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!coupon || !coupon.is_active) {
    return NextResponse.json({ error: 'Neplatný kód.' }, { status: 400 })
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Kód vypršel.' }, { status: 400 })
  }

  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: 'Kód byl již využit.' }, { status: 400 })
  }

  if (subtotal < (coupon.min_order_amount || 0)) {
    return NextResponse.json({ error: `Minimální hodnota objednávky je ${coupon.min_order_amount} Kč.` }, { status: 400 })
  }

  const discount = coupon.type === 'percent'
    ? subtotal * (coupon.value / 100)
    : coupon.value

  return NextResponse.json({ coupon, discount })
}
