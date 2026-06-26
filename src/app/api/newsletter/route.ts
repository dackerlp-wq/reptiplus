import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { newsletterSubscribers } from '@/lib/db/schema'
import { generateId } from '@/lib/auth'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Zadejte e-mail.' }, { status: 400 })

    const db = getDb()
    const [existing] = await db.select({ id: newsletterSubscribers.id }).from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email.toLowerCase()))

    if (existing) return NextResponse.json({ message: 'Již odebíráte novinky.' })

    await db.insert(newsletterSubscribers).values({ id: generateId(), email: email.toLowerCase() })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Chyba serveru.' }, { status: 500 })
  }
}
