import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { coupons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const { id } = await params
  const db = getDb()
  await db.delete(coupons).where(eq(coupons.id, id))
  return NextResponse.json({ success: true })
}
