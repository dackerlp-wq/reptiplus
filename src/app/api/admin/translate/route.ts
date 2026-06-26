import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { titleCs, contentCs, excerpt, nameCs, descriptionCs } = body

  const parts: string[] = []
  if (titleCs) parts.push(`TITLE: ${titleCs}`)
  if (nameCs) parts.push(`NAME: ${nameCs}`)
  if (excerpt) parts.push(`EXCERPT: ${excerpt}`)
  if (contentCs) parts.push(`CONTENT: ${contentCs}`)
  if (descriptionCs) parts.push(`DESCRIPTION: ${descriptionCs}`)

  if (!parts.length) return NextResponse.json({ error: 'Nothing to translate' }, { status: 400 })

  const prompt = `Translate the following Czech texts to English and German. Return a JSON object with keys:
- titleEn, titleDe (if TITLE was provided)
- nameEn, nameDe (if NAME was provided)
- excerptEn, excerptDe (if EXCERPT was provided) — wait, excerpt stays the same, skip it
- contentEn, contentDe (if CONTENT was provided)
- descriptionEn, descriptionDe (if DESCRIPTION was provided)

Only include keys for fields that were provided. Keep HTML/markdown formatting intact. Return ONLY valid JSON, no explanation.

${parts.join('\n\n')}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'Translation failed' }, { status: 500 })

  try {
    const translations = JSON.parse(jsonMatch[0])
    return NextResponse.json(translations)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }
}
