import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = parseInt(searchParams.get('strana') || '1')
  const limit = 10

  const { data: posts, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title_cs, title_en, title_de, excerpt, image, published_at, created_at')
    .eq('is_published', 1)
    .order('published_at', { ascending: false })

  if (error) return NextResponse.json({ posts: [], total: 0 })

  const total = posts?.length || 0
  const paginated = (posts || []).slice((page - 1) * limit, page * limit)

  return NextResponse.json({ posts: paginated, total, pages: Math.ceil(total / limit) })
}
