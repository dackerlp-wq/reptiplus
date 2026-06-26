import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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

    // Validate and calculate
    let subtotal = 0
    const orderItemsData = []

    for (const item of items) {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', item.productId)
        .single()

      if (!prod || !prod.is_active) {
        return NextResponse.json({ error: `Produkt ${item.productId} není dostupný.` }, { status: 400 })
      }
      if (prod.stock < item.quantity) {
        return NextResponse.json({ error: `Produkt ${prod.name_cs} není dostupný v požadovaném množství.` }, { status: 400 })
      }
      const itemTotal = prod.price * item.quantity
      subtotal += itemTotal
      orderItemsData.push({
        id: generateId(),
        product_id: prod.id,
        product_name: prod.name_cs,
        product_sku: prod.sku,
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
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single()

      if (coupon && coupon.is_active && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())) {
        if (!coupon.max_uses || coupon.used_count < coupon.max_uses) {
          if (subtotal >= (coupon.min_order_amount || 0)) {
            discount = coupon.type === 'percent'
              ? subtotal * (coupon.value / 100)
              : coupon.value
            validCouponCode = coupon.code
            await supabaseAdmin
              .from('coupons')
              .update({ used_count: (coupon.used_count || 0) + 1 })
              .eq('id', coupon.id)
          }
        }
      }
    }

    const total = subtotal + shippingPrice - discount

    // Create order
    const orderId = generateId()
    const orderNumber = generateOrderNumber()

    await supabaseAdmin.from('orders').insert({
      id: orderId,
      order_number: orderNumber,
      user_id: session?.id || null,
      status: 'pending',
      payment_status: 'unpaid',
      payment_method: paymentMethod || 'card',
      shipping_method: shippingMethod || 'zasilkovna',
      shipping_price: shippingPrice,
      subtotal,
      discount,
      total,
      coupon_code: validCouponCode,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
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

    // Order items & update stock
    for (const item of orderItemsData) {
      await supabaseAdmin.from('order_items').insert({ ...item, order_id: orderId })
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()
      if (prod) {
        await supabaseAdmin
          .from('products')
          .update({ stock: prod.stock - item.quantity })
          .eq('id', item.product_id)
      }
    }

    return NextResponse.json({ orderId, orderNumber, total, paymentMethod })
  } catch (err) {
    console.error('Order error:', err)
    return NextResponse.json({ error: 'Chyba při vytváření objednávky.' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 })

  if (session.role === 'admin') {
    const { data: allOrders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at')
    return NextResponse.json({ orders: allOrders || [] })
  }

  const { data: userOrders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('user_id', session.id)
  return NextResponse.json({ orders: userOrders || [] })
}
