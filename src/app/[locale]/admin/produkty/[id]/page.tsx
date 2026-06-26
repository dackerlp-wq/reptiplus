import { getDb } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const [product] = await db.select().from(products).where(eq(products.id, id))
  if (!product) notFound()

  const initialData = {
    id: product.id,
    nameCs: product.nameCs,
    nameEn: product.nameEn,
    nameDe: product.nameDe,
    descriptionCs: product.descriptionCs || '',
    descriptionEn: product.descriptionEn || '',
    descriptionDe: product.descriptionDe || '',
    sku: product.sku,
    price: product.price,
    vatRate: product.vatRate,
    comparePrice: product.comparePrice,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    categoryId: product.categoryId,
    images: JSON.parse(product.images || '[]'),
    parameters: JSON.parse(product.parameters || '{}'),
    isActive: product.isActive,
    isFeatured: product.isFeatured ?? 0,
    isNew: product.isNew ?? 0,
    isSale: product.isSale ?? 0,
    weight: product.weight,
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Upravit produkt</h1>
      <ProductForm initialData={initialData} />
    </div>
  )
}
