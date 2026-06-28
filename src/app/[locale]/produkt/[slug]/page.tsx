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

  // Blog posts linked directly to this product OR to its category
  const { data: directLinks } = await supabaseAdmin
    .from('blog_post_products')
    .select('blog_posts(id, slug, title_cs, title_en, title_de, image, published_at)')
    .eq('product_id', productRaw.id)

  const { data: categoryLinkedPosts } = productRaw.category_id
    ? await supabaseAdmin
        .from('blog_post_product_categories')
        .select('blog_posts(id, slug, title_cs, title_en, title_de, image, published_at)')
        .eq('category_id', productRaw.category_id)
    : { data: [] }

  // Deduplicate blog posts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allBlogPosts: any[] = []
  const seenBlogIds = new Set<string>()
  for (const link of [...(directLinks || []), ...(categoryLinkedPosts || [])]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bp = (link as any).blog_posts
    if (bp && !seenBlogIds.has(bp.id)) {
      seenBlogIds.add(bp.id)
      allBlogPosts.push(bp)
    }
  }

  const { data: variantsRaw } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', productRaw.id)
    .order('sort_order', { ascending: true })

  const variants = (variantsRaw || []).map(v => ({
    id: v.id as string,
    nameCs: v.name_cs as string,
    nameEn: (v.name_en || v.name_cs) as string,
    nameDe: (v.name_de || v.name_cs) as string,
    sku: v.sku as string | null,
    price: v.price as number | null,
    comparePrice: (v.compare_price ?? null) as number | null,
    stock: v.stock as number,
    attributes: (v.attributes || {}) as Record<string, string>,
    parameters: (v.parameters || {}) as Record<string, string>,
    restockDate: (v.restock_date || null) as string | null,
    sortOrder: v.sort_order as number,
  }))

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
      blogPosts={allBlogPosts}
      variants={variants}
    />
  )
}
