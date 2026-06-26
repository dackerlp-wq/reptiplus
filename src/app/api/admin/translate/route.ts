import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'AI_GATEWAY_API_KEY není nastaven. Přidejte ho do Vercel proměnných prostředí.',
    }, { status: 503 })
  }

  const body = await req.json()
  const { titleCs, contentCs, excerpt, nameCs, descriptionCs } = body

  const parts: string[] = []
  if (titleCs) parts.push(`TITLE: ${titleCs}`)
  if (nameCs) parts.push(`NAME: ${nameCs}`)
  if (excerpt) parts.push(`EXCERPT: ${excerpt}`)
  if (contentCs) parts.push(`CONTENT:\n${contentCs}`)
  if (descriptionCs) parts.push(`DESCRIPTION:\n${descriptionCs}`)

  if (!parts.length) return NextResponse.json({ error: 'Nic k překladu' }, { status: 400 })

  const prompt = `Translate the following Czech texts to English and German. Return ONLY a valid JSON object with these keys (include only keys for fields that were provided):
- titleEn, titleDe (if TITLE provided)
- nameEn, nameDe (if NAME provided)
- excerptEn, excerptDe (if EXCERPT provided)
- contentEn, contentDe (if CONTENT provided)
- descriptionEn, descriptionDe (if DESCRIPTION provided)

Keep HTML/markdown formatting intact. Return ONLY valid JSON, no explanation, no markdown code blocks.

${parts.join('\n\n')}`

  try {
    const anthropic = createAnthropic({ apiKey })
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      prompt,
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Překlad selhal — neplatná odpověď' }, { status: 500 })

    const translations = JSON.parse(jsonMatch[0])
    return NextResponse.json(translations)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Chyba překladu'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
