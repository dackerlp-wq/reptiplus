import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { mapProduct, mapCategory, mapReview } from '@/lib/mappers'
import type { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'
import type { Product as ProductCardType } from '@/components/shop/ProductCard'

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('name_cs, description_cs')
    .eq('slug', slug)
    .single()
  if (!product) return { title: 'Produkt nenalezen' }
  return { title: product.name_cs, description: product.description_cs?.slice(0, 160) }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params

  const { data: productRaw } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!productRaw || !productRaw.is_active) notFound()

  const product = mapProduct(productRaw)

  let category = null
  if (productRaw.category_id) {
    const { data: catRaw } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('id', productRaw.category_id)
      .single()
    category = mapCategory(catRaw)
  }

  const { data: reviewsRaw } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('product_id', productRaw.id)
    .eq('is_approved', 1)

  const { data: relatedRaw } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('category_id', productRaw.category_id || '')
    .eq('is_active', 1)
    .limit(5)

  const reviews = (reviewsRaw || []).map(mapReview)
  const related = (relatedRaw || []).map(mapProduct) as ProductCardType[]

  return (
    <ProductDetailClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      product={product as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      category={category as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reviews={reviews as any}
      related={related}
      locale={locale}
    />
  )
}
