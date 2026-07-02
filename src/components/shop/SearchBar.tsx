'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { usePriceFmt } from '@/hooks/usePriceFmt'
import { useLocale } from 'next-intl'

type Result = {
  id: string
  slug: string
  nameCs: string
  nameEn: string
  nameDe: string
  price: number
  image: string | null
  matchedVariant: boolean
  matchedParam: boolean
}

interface Props {
  placeholder?: string
  className?: string
  onClose?: () => void
}

export default function SearchBar({ placeholder = 'Hledat produkty…', className = '', onClose }: Props) {
  const router = useRouter()
  const locale = useLocale()
  const { fmt } = usePriceFmt()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getName = (r: Result) => {
    const map: Record<string, string> = { cs: r.nameCs, en: r.nameEn, de: r.nameDe }
    return map[locale] || r.nameCs
  }

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal })
      const data = await res.json()
      setResults(data.results || [])
      setOpen(true)
      setActiveIdx(-1)
    } catch { /* aborted */ } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 220)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setOpen(false)
    router.push(`/${locale}/obchod?hledat=${encodeURIComponent(query.trim())}`)
    onClose?.()
  }

  const goTo = (slug: string) => {
    setOpen(false)
    setQuery('')
    router.push(`/${locale}/produkt/${slug}`)
    onClose?.()
  }

  const clear = () => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); goTo(results[activeIdx].slug) }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-soft pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-cream border border-cream-dark rounded-xl focus:outline-none focus:border-forest focus:bg-white transition-colors placeholder-gray-soft"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-soft animate-spin" />}
        {!loading && query && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-soft hover:text-charcoal transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {open && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-cream-dark rounded-xl shadow-xl z-50 overflow-hidden"
        >
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => goTo(r.slug)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-cream-dark last:border-0 ${
                i === activeIdx ? 'bg-cream' : 'hover:bg-cream'
              }`}
            >
              <div className="w-10 h-10 rounded-lg border border-cream-dark bg-cream shrink-0 overflow-hidden flex items-center justify-center">
                {r.image ? (
                  <Image src={r.image} alt="" width={40} height={40} className="object-contain w-full h-full p-0.5" />
                ) : (
                  <span className="text-lg">🦎</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">{getName(r)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-forest">{fmt(r.price)}</span>
                  {r.matchedVariant && (
                    <span className="text-[10px] text-gray-soft bg-cream px-1.5 py-0.5 rounded-full border border-cream-dark">varianta</span>
                  )}
                  {r.matchedParam && !r.matchedVariant && (
                    <span className="text-[10px] text-gray-soft bg-cream px-1.5 py-0.5 rounded-full border border-cream-dark">parametr</span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {/* Footer: full search link */}
          <button
            type="button"
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-forest hover:bg-forest/5 transition-colors bg-cream border-t border-cream-dark"
          >
            <Search className="w-3.5 h-3.5" />
            Zobrazit všechny výsledky pro „{query}"
          </button>
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-cream-dark rounded-xl shadow-xl z-50 p-4 text-sm text-gray-soft text-center">
          Žádné výsledky pro „{query}"
        </div>
      )}
    </div>
  )
}
