import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, setSession, generateId } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, phone } = await req.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Vyplňte všechna povinná pole.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Heslo musí mít alespoň 6 znaků.' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Tento e-mail je již zaregistrován.' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const id = generateId()

    await supabaseAdmin.from('users').insert({
      id,
      email: email.toLowerCase(),
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      role: 'customer',
    })

    await setSession({ id, email: email.toLowerCase(), firstName, lastName, role: 'customer' })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Interní chyba serveru.' }, { status: 500 })
  }
}
