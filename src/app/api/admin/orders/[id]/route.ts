import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  return NextResponse.json({ order, items: items || [] })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  await supabaseAdmin.from('orders').update({
    status: body.status,
    payment_status: body.paymentStatus,
    tracking_number: body.trackingNumber || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ success: true })
}
