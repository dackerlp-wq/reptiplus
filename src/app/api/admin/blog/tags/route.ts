import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('blog_tags')
    .select('*')
    .order('name_cs', { ascending: true })
  return NextResponse.json({ tags: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nameCs, nameEn, nameDe } = await req.json()
  if (!nameCs) return NextResponse.json({ error: 'Název (CZ) je povinný' }, { status: 400 })

  let resolvedEn = nameEn || null
  let resolvedDe = nameDe || null

  // Auto-translate missing languages
  if (!resolvedEn || !resolvedDe) {
    try {
      const { text } = await generateText({
        model: gateway('anthropic/claude-haiku-4.5'),
        prompt: `Translate this terrarium/reptile tag to English and German. Return ONLY JSON {"en":"...","de":"..."}.\nCzech: ${nameCs}`,
        maxOutputTokens: 60,
      })
      const match = text.match(/\{[\s\S]*?\}/)
      if (match) {
        const t = JSON.parse(match[0])
        if (!resolvedEn && t.en) resolvedEn = t.en
        if (!resolvedDe && t.de) resolvedDe = t.de
      }
    } catch { /* fall through with nulls */ }
  }

  const slug = slugify(nameCs)
  const id = generateId()

  const { data, error } = await supabaseAdmin.from('blog_tags').insert({
    id, name_cs: nameCs, name_en: resolvedEn, name_de: resolvedDe, slug,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tag: data })
}
