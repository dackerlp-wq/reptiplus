import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, generateId } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { data: coupons } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .order('created_at')
  return NextResponse.json({ coupons: coupons || [] })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const body = await req.json()
  if (!body.code || !body.type || !body.value) {
    return NextResponse.json({ error: 'Kód, typ a hodnota jsou povinné.' }, { status: 400 })
  }

  const id = generateId()
  const coupon = {
    id,
    code: body.code.toUpperCase(),
    type: body.type,
    value: body.value,
    min_order_amount: body.minOrderAmount || 0,
    max_uses: body.maxUses || null,
    used_count: 0,
    is_active: 1,
    expires_at: body.expiresAt || null,
  }

  await supabaseAdmin.from('coupons').insert(coupon)
  return NextResponse.json({ coupon })
}
