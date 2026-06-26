import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { data: rows } = await supabaseAdmin.from('settings').select('*')
  const map: Record<string, string> = {}
  for (const row of rows || []) map[row.key] = row.value || ''
  return NextResponse.json({ settings: map })
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { settings: data } = await req.json()

  for (const [key, value] of Object.entries(data as Record<string, string>)) {
    await supabaseAdmin
      .from('settings')
      .upsert({ key, value: String(value) }, { onConflict: 'key' })
  }

  return NextResponse.json({ success: true })
}
