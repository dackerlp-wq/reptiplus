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

  // Load all existing tags
  const { data: existingTags } = await supabaseAdmin
    .from('blog_tags')
    .select('id, name_cs, name_en, name_de, slug')
    .order('name_cs')

  const tags = existingTags || []
  const tagNames = tags.map(t => t.name_cs).join(', ')

  const textSnippet = [titleCs, excerpt, contentCs?.replace(/<[^>]+>/g, '').slice(0, 800)].filter(Boolean).join('\n')

  const prompt = `Jsi asistent pro kategorizaci článků o teraristice (chov plazů, obojživelníků, pavouků).

Existující štítky v databázi: ${tagNames || '(žádné zatím)'}

Článek:
${textSnippet}

Tvůj úkol:
1. Navrhni 3–7 vhodných štítků pro tento článek v češtině
2. PREFERUJ existující štítky (pokud pasují)
3. Pokud vhodných existujících štítků je méně než 5, vymysli nové (krátké, 1–3 slova)
4. Vrať POUZE JSON pole stringů, nic jiného. Příklad: ["UVB záření","Terárium","Drak vousatý"]`

  let suggestedNames: string[] = []
  try {
    const { text } = await generateText({
      model: gateway('anthropic/claude-haiku-4.5'),
      prompt,
      maxOutputTokens: 200,
    })
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) suggestedNames = JSON.parse(match[0])
  } catch {
    return NextResponse.json({ error: 'AI generování selhalo' }, { status: 500 })
  }

  // Match suggested names against existing tags (case-insensitive)
  const result: { id: string; name_cs: string; name_en: string | null; name_de: string | null; isNew: boolean }[] = []

  for (const name of suggestedNames) {
    const existing = tags.find(t => t.name_cs.toLowerCase() === name.toLowerCase())
    if (existing) {
      result.push({ id: existing.id, name_cs: existing.name_cs, name_en: existing.name_en, name_de: existing.name_de, isNew: false })
    } else {
      // Create new tag
      const newId = generateId()
      const slug = slugify(name)
      // Auto-translate via simple mapping for common terms, or leave blank for admin to fill
      const { data: newTag, error } = await supabaseAdmin.from('blog_tags').insert({
        id: newId, name_cs: name, name_en: null, name_de: null, slug,
      }).select().single()
      if (!error && newTag) {
        result.push({ id: newTag.id, name_cs: newTag.name_cs, name_en: null, name_de: null, isNew: true })
      }
    }
  }

  // Apply tags to post: replace all existing tags
  await supabaseAdmin.from('blog_post_tags').delete().eq('blog_post_id', id)
  if (result.length > 0) {
    await supabaseAdmin.from('blog_post_tags').insert(
      result.map(t => ({ blog_post_id: id, tag_id: t.id }))
    )
  }

  return NextResponse.json({ tags: result })
}
