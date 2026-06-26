import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { categories } from '@/lib/db/schema'

export async function GET() {
  const db = getDb()
  const cats = await db.select().from(categories).orderBy(categories.sortOrder)
  return NextResponse.json({ categories: cats })
}
