import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: post } = await supabaseAdmin
    .from('blog_posts')
    .select('*, users(first_name, last_name)')
    .eq('slug', slug)
    .eq('is_published', 1)
    .single()

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ post })
}
