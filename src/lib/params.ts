// Parametry produktů a variant ve třech jazycích.
//
// V databázi jsou tři nezávislé mapy klíč→hodnota (`parameters` = cs,
// `parameters_en`, `parameters_de`). Překládá se i klíč, ne jen hodnota,
// takže mapy nemají společné klíče a párují se pořadím vložení — to JSON
// objekty v JS i v Postgresu zachovávají.
//
// Admin formulář s mapami nepracuje přímo; převádí je na řádky (ParamRow),
// kde jsou všechny tři jazyky jednoho parametru pohromadě a mazání i
// přeskládání funguje podle indexu.

export type ParamMap = Record<string, string>

export type ParamRow = {
  keyCs: string; valueCs: string
  keyEn: string; valueEn: string
  keyDe: string; valueDe: string
}

export const EMPTY_PARAM_ROW: ParamRow = {
  keyCs: '', valueCs: '', keyEn: '', valueEn: '', keyDe: '', valueDe: '',
}

/** Přijme jsonb objekt i text sloupec s JSON stringem. */
export function parseParams(raw: unknown): ParamMap {
  if (!raw) return {}
  let value: unknown = raw
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw) } catch { return {} }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: ParamMap = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v)
  }
  return out
}

export function toParamRows(cs: ParamMap, en: ParamMap, de: ParamMap): ParamRow[] {
  const enEntries = Object.entries(en)
  const deEntries = Object.entries(de)
  return Object.entries(cs).map(([keyCs, valueCs], i) => ({
    keyCs,
    valueCs,
    keyEn: enEntries[i]?.[0] ?? '',
    valueEn: enEntries[i]?.[1] ?? '',
    keyDe: deEntries[i]?.[0] ?? '',
    valueDe: deEntries[i]?.[1] ?? '',
  }))
}

/**
 * Nepřeložený řádek se do EN/DE uloží v českém znění. Drží to všechny tři
 * mapy stejně dlouhé (jinak by se rozpadlo párování podle indexu) a zákazník
 * uvidí aspoň českou hodnotu místo díry v tabulce.
 */
export function fromParamRows(rows: ParamRow[]): { cs: ParamMap; en: ParamMap; de: ParamMap } {
  const cs: ParamMap = {}
  const en: ParamMap = {}
  const de: ParamMap = {}
  for (const r of rows) {
    const keyCs = r.keyCs.trim()
    if (!keyCs) continue
    const valueCs = r.valueCs.trim()
    cs[keyCs] = valueCs
    en[r.keyEn.trim() || keyCs] = r.valueEn.trim() || valueCs
    de[r.keyDe.trim() || keyCs] = r.valueDe.trim() || valueCs
  }
  return { cs, en, de }
}

/** Locale resolution podle konvence projektu: map[locale] || map['cs']. */
export function pickParams(cs: ParamMap, en: ParamMap, de: ParamMap, locale: string): ParamMap {
  const byLocale: Record<string, ParamMap> = { cs, en, de }
  const chosen = byLocale[locale]
  return chosen && Object.keys(chosen).length ? chosen : cs
}
