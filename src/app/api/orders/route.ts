import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { orders, orderItems, products, coupons } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSession, generateId, generateOrderNumber } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const body = await req.json()

    const {
      items, firstName, lastName, email, phone,
      street, city, zip, country, company, ico, dic, note,
      shippingMethod, paymentMethod, couponCode
    } = body

    if (!items?.length || !firstName || !lastName || !email || !street || !city || !zip) {
      return NextResponse.json({ error: 'Chybí povinné údaje.' }, { status: 400 })
    }

    const db = getDb()

    // Validate and calculate
    let subtotal = 0
    const orderItemsData = []

    for (const item of items) {
      const [prod] = await db.select().from(products).where(eq(products.id, item.productId))
      if (!prod || !prod.isActive) {
        return NextResponse.json({ error: `Produkt ${item.productId} není dostupný.` }, { status: 400 })
      }
      if (prod.stock < item.quantity) {
        return NextResponse.json({ error: `Produkt ${prod.nameCs} není dostupný v požadovaném množství.` }, { status: 400 })
      }
      const itemTotal = prod.price * item.quantity
      subtotal += itemTotal
      orderItemsData.push({
        id: generateId(),
        productId: prod.id,
        productName: prod.nameCs,
        productSku: prod.sku,
        quantity: item.quantity,
        price: prod.price,
        total: itemTotal,
      })
    }

    // Shipping price
    const shippingPrices: Record<string, number> = {
      zasilkovna: 89,
      ppl: 129,
      personal_pickup: 0,
    }
    const shippingPrice = subtotal >= 2000 ? 0 : (shippingPrices[shippingMethod] || 89)

    // Coupon
    let discount = 0
    let validCouponCode: string | null = null
    if (couponCode) {
      const [coupon] = await db.select().from(coupons).where(eq(coupons.code, couponCode.toUpperCase()))
      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())) {
        if (!coupon.maxUses || coupon.usedCount! < coupon.maxUses) {
          if (subtotal >= (coupon.minOrderAmount || 0)) {
            discount = coupon.type === 'percent'
              ? subtotal * (coupon.value / 100)
              : coupon.value
            validCouponCode = coupon.code
            await db.update(coupons)
              .set({ usedCount: (coupon.usedCount || 0) + 1 })
              .where(eq(coupons.id, coupon.id))
          }
        }
      }
    }

    const total = subtotal + shippingPrice - discount

    // Create order
    const orderId = generateId()
    const orderNumber = generateOrderNumber()

    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      userId: session?.id || null,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: paymentMethod || 'card',
      shippingMethod: shippingMethod || 'zasilkovna',
      shippingPrice,
      subtotal,
      discount,
      total,
      couponCode: validCouponCode,
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone: phone || null,
      street,
      city,
      zip,
      country: country || 'CZ',
      company: company || null,
      ico: ico || null,
      dic: dic || null,
      note: note || null,
    })

    // Order items
    for (const item of orderItemsData) {
      await db.insert(orderItems).values({ ...item, orderId })
      // Decrease stock
      const [prod] = await db.select().from(products).where(eq(products.id, item.productId!))
      if (prod) {
        await db.update(products)
          .set({ stock: prod.stock - item.quantity })
          .where(eq(products.id, item.productId!))
      }
    }

    // TODO: trigger Comgate payment for card/bank_transfer
    // For now return order info
    return NextResponse.json({
      orderId,
      orderNumber,
      total,
      paymentMethod,
    })
  } catch (err) {
    console.error('Order error:', err)
    return NextResponse.json({ error: 'Chyba při vytváření objednávky.' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 })

  const db = getDb()
  if (session.role === 'admin') {
    const allOrders = await db.select().from(orders).orderBy(orders.createdAt)
    return NextResponse.json({ orders: allOrders })
  }

  const userOrders = await db.select().from(orders).where(eq(orders.userId, session.id))
  return NextResponse.json({ orders: userOrders })
}
