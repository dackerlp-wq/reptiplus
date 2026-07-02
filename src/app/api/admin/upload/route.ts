import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']
  const contentType = file.type || 'image/jpeg'
  if (!allowed.includes(contentType) && !contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Nepodporovaný formát. Povolené: JPG, PNG, WEBP, GIF, SVG.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const folder = formData.get('folder') as string || 'uploads'
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error } = await supabaseAdmin.storage
    .from('images')
    .upload(name, buffer, { contentType, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('images').getPublicUrl(name)
  return NextResponse.json({ url: publicUrl })
}
