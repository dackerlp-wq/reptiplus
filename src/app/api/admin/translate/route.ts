import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateObject } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { z } from 'zod'

// Delší blogové články se do výchozího limitu serverless funkce nevejdou.
export const maxDuration = 60

const FIELDS = [
  { key: 'titleCs', label: 'TITLE', en: 'titleEn', de: 'titleDe' },
  { key: 'nameCs', label: 'NAME', en: 'nameEn', de: 'nameDe' },
  { key: 'excerpt', label: 'EXCERPT', en: 'excerptEn', de: 'excerptDe' },
  { key: 'contentCs', label: 'CONTENT', en: 'contentEn', de: 'contentDe' },
  { key: 'descriptionCs', label: 'DESCRIPTION', en: 'descriptionEn', de: 'descriptionDe' },
] as const

const SYSTEM = `Jsi překladatel e-shopu s chovatelskými potřebami pro plazy a obojživelníky.
Překládáš z češtiny do angličtiny a němčiny.

Pravidla:
- Zachovej beze změny veškeré HTML i markdown značky, jejich atributy a pořadí.
- Zachovej latinská jména druhů (např. Pogona vitticeps) tak, jak jsou.
- Jednotky a čísla nepřepočítávej.
- Překládej přirozeně, ne doslovně; drž tón původního textu.
- Nepřidávej nic, co v originálu není.`

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek' }, { status: 400 })
  }

  const present = FIELDS.filter(f => {
    const v = body[f.key]
    return typeof v === 'string' && v.trim().length > 0
  })

  if (!present.length) {
    return NextResponse.json({ error: 'Nic k překladu' }, { status: 400 })
  }

  const shape: Record<string, z.ZodString> = {}
  for (const f of present) {
    shape[f.en] = z.string().describe(`Anglický překlad pole ${f.label}`)
    shape[f.de] = z.string().describe(`Německý překlad pole ${f.label}`)
  }

  const source = present.map(f => `${f.label}:\n${body[f.key] as string}`).join('\n\n---\n\n')

  // Dva jazyky, tedy zhruba dvojnásobek vstupu; strop drží náklady i latenci.
  const maxOutputTokens = Math.min(32000, Math.max(4000, Math.ceil(source.length * 0.8)))

  try {
    const { object } = await generateObject({
      model: gateway('anthropic/claude-haiku-4.5'),
      schema: z.object(shape),
      schemaName: 'Translations',
      schemaDescription: 'Anglické a německé překlady zadaných českých textů.',
      system: SYSTEM,
      prompt: source,
      maxOutputTokens,
    })
    return NextResponse.json(object)
  } catch (err: unknown) {
    console.error('[translate]', err)
    const detail = err instanceof Error ? err.message : String(err)
    const isAuth = /api key|unauthorized|authentication|oidc|forbidden|401|403/i.test(detail)
    return NextResponse.json(
      {
        error: isAuth
          ? 'AI Gateway odmítl ověření. Nastav AI_GATEWAY_API_KEY (Vercel → Settings → Environment Variables), nebo v lokálním běhu do .env.local.'
          : `Překlad selhal: ${detail}`,
      },
      { status: isAuth ? 503 : 500 },
    )
  }
}
