import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { id } = await params
  await supabaseAdmin.from('coupons').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
