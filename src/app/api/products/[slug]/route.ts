import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { products, categories } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()

  const result = await db.select({
    product: products,
    category: categories,
  })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))

  if (!result.length) {
    return NextResponse.json({ error: 'Produkt nenalezen.' }, { status: 404 })
  }

  return NextResponse.json(result[0])
}
