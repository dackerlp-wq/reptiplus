import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  const db = getDb()
  const rows = await db.select().from(settings)
  const map: Record<string, string> = {}
  for (const row of rows) map[row.key] = row.value || ''
  return NextResponse.json({ settings: map })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { settings: data } = await req.json()
  const db = getDb()

  for (const [key, value] of Object.entries(data as Record<string, string>)) {
    await db.insert(settings).values({ key, value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } })
  }

  return NextResponse.json({ success: true })
}
