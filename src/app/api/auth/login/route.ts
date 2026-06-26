import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { comparePassword, setSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Vyplňte e-mail a heslo.' }, { status: 400 })
    }

    const db = getDb()
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()))

    if (!user) {
      return NextResponse.json({ error: 'Nesprávný e-mail nebo heslo.' }, { status: 401 })
    }

    const valid = await comparePassword(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Nesprávný e-mail nebo heslo.' }, { status: 401 })
    }

    await setSession({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'customer' | 'admin',
    })

    return NextResponse.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } })
  } catch {
    return NextResponse.json({ error: 'Interní chyba serveru.' }, { status: 500 })
  }
}
