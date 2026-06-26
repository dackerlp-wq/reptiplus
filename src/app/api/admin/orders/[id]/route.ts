import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { orders, orderItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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
  const db = getDb()
  const [order] = await db.select().from(orders).where(eq(orders.id, id))
  if (!order) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))
  return NextResponse.json({ order, items })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const db = getDb()

  await db.update(orders).set({
    status: body.status,
    paymentStatus: body.paymentStatus,
    trackingNumber: body.trackingNumber || null,
    updatedAt: new Date().toISOString(),
  }).where(eq(orders.id, id))

  return NextResponse.json({ success: true })
}
