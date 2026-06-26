import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateId } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Zadejte e-mail.' }, { status: 400 })

    const { data: existing } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) return NextResponse.json({ message: 'Již odebíráte novinky.' })

    await supabaseAdmin.from('newsletter_subscribers').insert({
      id: generateId(),
      email: email.toLowerCase(),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Chyba serveru.' }, { status: 500 })
  }
}
