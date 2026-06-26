// Map Supabase snake_case rows to camelCase shapes expected by UI components

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProduct(p: Record<string, any>) {
  if (!p) return p
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    nameCs: p.name_cs,
    nameEn: p.name_en,
    nameDe: p.name_de,
    descriptionCs: p.description_cs,
    descriptionEn: p.description_en,
    descriptionDe: p.description_de,
    categoryId: p.category_id,
    price: p.price,
    priceExcl: p.price_excl,
    vatRate: p.vat_rate,
    comparePrice: p.compare_price,
    stock: p.stock,
    lowStockThreshold: p.low_stock_threshold,
    images: p.images,
    parameters: p.parameters,
    isActive: p.is_active,
    isFeatured: p.is_featured,
    isNew: p.is_new,
    isSale: p.is_sale,
    weight: p.weight,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCategory(c: Record<string, any> | null) {
  if (!c) return null
  return {
    id: c.id,
    slug: c.slug,
    nameCs: c.name_cs,
    nameEn: c.name_en,
    nameDe: c.name_de,
    descriptionCs: c.description_cs,
    image: c.image,
    parentId: c.parent_id,
    sortOrder: c.sort_order,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapReview(r: Record<string, any>) {
  return {
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    authorName: r.author_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    isApproved: r.is_approved,
    createdAt: r.created_at,
  }
}
