import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { orders, users, products } from '@/lib/db/schema'
import { eq, sum, count, desc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const db = getDb()

  const [revenueResult] = await db.select({ total: sum(orders.total) }).from(orders).where(eq(orders.paymentStatus, 'paid'))
  const [orderCount] = await db.select({ count: count() }).from(orders)
  const [customerCount] = await db.select({ count: count() }).from(users).where(eq(users.role, 'customer'))
  const [productCount] = await db.select({ count: count() }).from(products).where(eq(products.isActive, 1))

  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10)

  return NextResponse.json({
    revenue: revenueResult?.total || 0,
    orders: orderCount?.count || 0,
    customers: customerCount?.count || 0,
    products: productCount?.count || 0,
    recentOrders,
  })
}
