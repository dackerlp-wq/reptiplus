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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { titleCs, contentCs, excerpt } = await req.json()

  const { data: existingTags } = await supabaseAdmin
    .from('blog_tags')
    .select('id, name_cs, name_en, name_de, slug')
    .order('name_cs')

  const tags = existingTags || []
  const tagList = tags.map(t => `${t.name_cs}${t.name_en ? ` (EN: ${t.name_en})` : ''}`).join(', ')
  const textSnippet = [titleCs, excerpt, contentCs?.replace(/<[^>]+>/g, '').slice(0, 800)].filter(Boolean).join('\n')

  const prompt = `You are an assistant for categorizing articles about terrarium keeping (reptiles, amphibians, spiders).

Existing tags in the database: ${tagList || '(none yet)'}

Article (Czech):
${textSnippet}

Your task:
1. Suggest 3–7 suitable tags for this article
2. PREFER existing tags (use exact Czech name if it fits)
3. If fewer than 5 existing tags fit, create new short tags (1–3 words)
4. For each tag provide Czech (cs), English (en), and German (de) names
5. Return ONLY a JSON array of objects, nothing else.

Example:
[{"cs":"UVB záření","en":"UVB lighting","de":"UVB-Beleuchtung"},{"cs":"Terárium","en":"Terrarium","de":"Terrarium"}]`

  let suggested: { cs: string; en: string; de: string }[] = []
  try {
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4.5'),
      prompt,
      maxOutputTokens: 400,
    })
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) suggested = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI generování selhalo' }, { status: 500 })
  }

  const result: { id: string; name_cs: string; name_en: string | null; name_de: string | null; isNew: boolean }[] = []

  for (const item of suggested) {
    const nameCs = item.cs || ''
    const nameEn = item.en || null
    const nameDe = item.de || null
    if (!nameCs) continue

    const existing = tags.find(t => t.name_cs.toLowerCase() === nameCs.toLowerCase())
    if (existing) {
      // Fill in missing translations if AI provided them
      const updates: Record<string, string> = {}
      if (nameEn && !existing.name_en) updates.name_en = nameEn
      if (nameDe && !existing.name_de) updates.name_de = nameDe
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('blog_tags').update(updates).eq('id', existing.id)
        existing.name_en = existing.name_en || nameEn
        existing.name_de = existing.name_de || nameDe
      }
      result.push({ id: existing.id, name_cs: existing.name_cs, name_en: existing.name_en, name_de: existing.name_de, isNew: false })
    } else {
      const newId = generateId()
      const slug = slugify(nameCs)
      const { data: newTag, error } = await supabaseAdmin.from('blog_tags').insert({
        id: newId, name_cs: nameCs, name_en: nameEn, name_de: nameDe, slug,
      }).select().single()
      if (!error && newTag) {
        result.push({ id: newTag.id, name_cs: newTag.name_cs, name_en: newTag.name_en, name_de: newTag.name_de, isNew: true })
      }
    }
  }

  await supabaseAdmin.from('blog_post_tags').delete().eq('blog_post_id', id)
  if (result.length > 0) {
    await supabaseAdmin.from('blog_post_tags').insert(
      result.map(t => ({ blog_post_id: id, tag_id: t.id }))
    )
  }

  return NextResponse.json({ tags: result })
}
