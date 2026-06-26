import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mapCategory } from '@/lib/mappers'

export async function GET() {
  const { data: cats } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order')
  return NextResponse.json({ categories: (cats || []).map(mapCategory) })
}
