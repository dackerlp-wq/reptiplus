import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { generateObject } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import { parseParams, type ParamMap } from '@/lib/params'

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
- Nepřidávej nic, co v originálu není.
- U parametrů překládej název i hodnotu a vrať je ve stejném pořadí a počtu
  jako na vstupu. Hodnotu, která je jen číslo s jednotkou (35W, 30 cm),
  nech beze změny.`

const paramPairSchema = z.array(z.object({ key: z.string(), value: z.string() }))

function pairsToMap(pairs: { key: string; value: string }[]): ParamMap {
  const out: ParamMap = {}
  for (const p of pairs) {
    const key = p.key.trim()
    if (key) out[key] = p.value
  }
  return out
}

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

  // Přijímá jak objekt, tak JSON string (formulář posílá objekt).
  const paramsCs = parseParams(body.parametersCs)
  const hasParams = Object.keys(paramsCs).length > 0

  if (!present.length && !hasParams) {
    return NextResponse.json({ error: 'Nic k překladu' }, { status: 400 })
  }

  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of present) {
    shape[f.en] = z.string().describe(`Anglický překlad pole ${f.label}`)
    shape[f.de] = z.string().describe(`Německý překlad pole ${f.label}`)
  }
  if (hasParams) {
    shape.parametersEn = paramPairSchema.describe('Anglické parametry, stejné pořadí i počet jako vstup')
    shape.parametersDe = paramPairSchema.describe('Německé parametry, stejné pořadí i počet jako vstup')
  }

  const parts = present.map(f => `${f.label}:\n${body[f.key] as string}`)
  if (hasParams) {
    const listing = Object.entries(paramsCs).map(([k, v]) => `- ${k}: ${v}`).join('\n')
    parts.push(`PARAMETERS (${Object.keys(paramsCs).length} položek):\n${listing}`)
  }
  const source = parts.join('\n\n---\n\n')

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

    const result = { ...(object as Record<string, unknown>) }
    if (hasParams) {
      result.parametersEn = pairsToMap((object as Record<string, never>).parametersEn ?? [])
      result.parametersDe = pairsToMap((object as Record<string, never>).parametersDe ?? [])
    }
    return NextResponse.json(result)
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
