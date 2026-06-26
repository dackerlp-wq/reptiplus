import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { comparePassword, setSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Vyplňte e-mail a heslo.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Nesprávný e-mail nebo heslo.' }, { status: 401 })
    }

    const user = data
    const valid = await comparePassword(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Nesprávný e-mail nebo heslo.' }, { status: 401 })
    }

    await setSession({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role as 'customer' | 'admin',
    })

    return NextResponse.json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role } })
  } catch {
    return NextResponse.json({ error: 'Interní chyba serveru.' }, { status: 500 })
  }
}
