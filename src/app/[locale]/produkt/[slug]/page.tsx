import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import { products, categories, reviews } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import type { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug } = await params
  const db = getDb()
  const [result] = await db.select({ product: products }).from(products).where(eq(products.slug, slug))
  if (!result) return { title: 'Produkt nenalezen' }
  return { title: result.product.nameCs, description: result.product.descriptionCs?.slice(0, 160) }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params
  const db = getDb()

  const results = await db.select({ product: products, category: categories })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))

  if (!results.length || !results[0].product.isActive) notFound()

  const productReviews = await db.select().from(reviews)
    .where(and(eq(reviews.productId, results[0].product.id), eq(reviews.isApproved, 1)))

  const related = await db.select().from(products)
    .where(and(eq(products.categoryId, results[0].product.categoryId!), eq(products.isActive, 1)))
    .limit(5)

  return (
    <ProductDetailClient
      product={results[0].product}
      category={results[0].category}
      reviews={productReviews}
      related={related}
      locale={locale}
    />
  )
}
