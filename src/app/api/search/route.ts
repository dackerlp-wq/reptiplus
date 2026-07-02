import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const term = q.toLowerCase()

  // Full-text search across products + variants
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, slug, name_cs, name_en, name_de, price, images, parameters, category_id')
      .eq('is_active', 1)
      .or(
        `name_cs.ilike.%${term}%,name_en.ilike.%${term}%,name_de.ilike.%${term}%,` +
        `description_cs.ilike.%${term}%,description_en.ilike.%${term}%,description_de.ilike.%${term}%`
      )
      .limit(20),
    supabaseAdmin
      .from('product_variants')
      .select('product_id, name_cs, name_en, name_de, attributes, parameters')
      .or(`name_cs.ilike.%${term}%,name_en.ilike.%${term}%,name_de.ilike.%${term}%`)
      .limit(30),
  ])

  // Products matched directly
  const directIds = new Set((products || []).map(p => p.id))

  // Products matched via variant name/attributes/parameters
  const variantMatchIds = new Set<string>()
  for (const v of variants || []) {
    if (!directIds.has(v.product_id)) {
      variantMatchIds.add(v.product_id)
    }
  }

  // Fetch variant-matched products if any
  let extraProducts: typeof products = []
  if (variantMatchIds.size > 0) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, slug, name_cs, name_en, name_de, price, images, parameters, category_id')
      .eq('is_active', 1)
      .in('id', [...variantMatchIds])
      .limit(10)
    extraProducts = data || []
  }

  // Merge and score
  const allProducts = [...(products || []), ...extraProducts]

  // Also check parameters JSON for matches
  const paramMatched = new Set<string>()
  for (const p of allProducts) {
    if (p.parameters) {
      const paramStr = JSON.stringify(p.parameters).toLowerCase()
      if (paramStr.includes(term)) paramMatched.add(p.id)
    }
  }

  // Deduplicate and build results
  const seen = new Set<string>()
  const results = allProducts
    .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
    .map(p => {
      const firstImage = (() => { try { return JSON.parse(p.images || '[]')[0] || null } catch { return null } })()
      return {
        id: p.id,
        slug: p.slug,
        nameCs: p.name_cs,
        nameEn: p.name_en || p.name_cs,
        nameDe: p.name_de || p.name_cs,
        price: p.price,
        image: firstImage,
        matchedVariant: variantMatchIds.has(p.id),
        matchedParam: paramMatched.has(p.id),
      }
    })
    .slice(0, 8)

  return NextResponse.json({ results })
}
