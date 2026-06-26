import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const [
    { data: paidOrders },
    { count: orderCount },
    { count: customerCount },
    { count: productCount },
    { data: recentOrders },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('total').eq('payment_status', 'paid'),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('is_active', 1),
    supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  const revenue = (paidOrders || []).reduce((sum, o) => sum + (o.total || 0), 0)

  return NextResponse.json({
    revenue,
    orders: orderCount || 0,
    customers: customerCount || 0,
    products: productCount || 0,
    recentOrders: recentOrders || [],
  })
}
