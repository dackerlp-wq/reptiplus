'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { toast } from '@/components/ui/Toaster'

type Author = { id: string; name: string; avatar_initial: string | null; avatar_url: string | null; bio: string | null } | null
type Product = { id: string; slug: string; name_cs: string; name_en: string; name_de: string; images: string; categories: { name_cs: string } | null }
type Category = { id: string; name_cs: string }
type Comment = { id: string; content: string; guest_name: string | null; created_at: string; users: { first_name: string; last_name: string } | null; likes_count: number }
type RelatedPost = { id: string; slug: string; title_cs: string; title_en: string; title_de: string; excerpt: string | null }

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: any
  title: string
  content: string
  locale: Locale
  author: Author
  related: RelatedPost[]
  productLinks: Product[]
  categoryLinks: Category[]
  initialLikes: number
  commentsCount: number
  slug: string
}

export default function BlogPostClient({
  post, title, content, locale, author, related,
  productLinks, categoryLinks, initialLikes, commentsCount, slug,
}: Props) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentForm, setCommentForm] = useState({ content: '', guestName: '', guestEmail: '', website: '' })
  const [submitting, setSubmitting] = useState(false)
  const [readPct, setReadPct] = useState(0)
  const articleRef = useRef<HTMLDivElement>(null)

  // Check if user already liked
  useEffect(() => {
    fetch(`/api/blog/${slug}/like`).then(r => r.json()).then(d => {
      setLikes(d.count ?? initialLikes)
      setLiked(d.liked ?? false)
    }).catch(() => {})
  }, [slug, initialLikes])

  // Load approved comments
  useEffect(() => {
    fetch(`/api/blog/${slug}/comments`).then(r => r.json()).then(d => setComments(d.comments || [])).catch(() => {})
  }, [slug])

  // Reading progress
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const total = el.offsetHeight - window.innerHeight
      const pct = Math.max(0, Math.min(100, (-top / total) * 100))
      setReadPct(pct)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLike = async () => {
    setLikeLoading(true)
    const res = await fetch(`/api/blog/${slug}/like`, { method: 'POST' })
    const d = await res.json()
    setLikes(d.count)
    setLiked(d.liked)
    setLikeLoading(false)
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch(`/api/blog/${slug}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentForm),
    })
    const d = await res.json()
    if (res.ok) {
      toast(d.message || 'Odesláno — čeká na schválení', 'success')
      setCommentForm({ content: '', guestName: '', guestEmail: '', website: '' })
    } else {
      toast(d.error || 'Chyba', 'error')
    }
    setSubmitting(false)
  }

  const getProductName = (p: Product) => {
    const map: Record<string, string> = { cs: p.name_cs, en: p.name_en, de: p.name_de }
    return map[locale] || p.name_cs
  }

  const getRelatedTitle = (p: RelatedPost) => {
    const map: Record<string, string> = { cs: p.title_cs, en: p.title_en, de: p.title_de }
    return map[locale] || p.title_cs
  }

  const getFirstImage = (images: string) => {
    try { return JSON.parse(images)?.[0] || null } catch { return null }
  }

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1" style={{ background: 'rgba(27,31,23,0.08)' }}>
        <div className="h-full transition-all duration-100" style={{ width: `${readPct}%`, background: 'var(--color-amber)' }} />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12" ref={articleRef}>
        {/* Back */}
        <Link href={`/${locale}/blog`} className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>
          ← {locale === 'cs' ? 'Blog' : 'Blog'}
        </Link>

        <article>
          {/* Cover */}
          {post.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image} alt="" className="w-full h-72 object-cover mb-8" style={{ border: '1.5px solid var(--color-ink)' }} />
          )}

          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
            {title}
          </h1>

          <div className="flex items-center gap-4 text-xs mb-10 pb-6" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)', borderBottom: '1px solid rgba(27,31,23,0.12)' }}>
            <span>{formatDate(post.published_at || post.created_at, locale)}</span>
            <span style={{ color: 'var(--color-terracotta)' }}>/</span>
            <span>{author?.name || 'Reptiplus'}</span>
          </div>

          {/* Content */}
          {content ? (
            <div className="prose prose-sm max-w-none mb-10"
              style={{ color: '#3C4138', lineHeight: 1.75 }}
              dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p className="mb-10" style={{ color: 'var(--color-moss)' }}>Obsah tohoto článku není dostupný.</p>
          )}
        </article>

        {/* Product link box */}
        {productLinks.length > 0 && (
          <div className="my-8 p-5" style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-moss)', color: 'var(--color-paper)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-amber)' }}>
              Zmíněné produkty v článku
            </h4>
            <div className="flex flex-wrap gap-3">
              {productLinks.map(p => (
                <Link key={p.id} href={`/${locale}/produkt/${p.slug}`}
                  className="flex items-center gap-2.5 rounded px-3 py-2 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-paper)', color: 'var(--color-ink)', border: '1.5px solid var(--color-ink)' }}>
                  {getFirstImage(p.images) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getFirstImage(p.images)} alt="" className="w-8 h-8 object-cover rounded-sm" />
                  ) : (
                    <div className="w-8 h-8 rounded-sm" style={{ background: 'var(--color-amber)' }} />
                  )}
                  <div>
                    <div className="text-sm font-bold leading-tight">{getProductName(p)}</div>
                    {p.categories && <div className="text-xs" style={{ color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>{p.categories.name_cs}</div>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Category links (info only) */}
        {categoryLinks.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {categoryLinks.map(c => (
              <Link key={c.id} href={`/${locale}/obchod?kategorie=${c.id}`}
                className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(51,83,60,0.12)', color: 'var(--color-moss)', fontFamily: 'var(--font-mono)', border: '1px solid var(--color-moss)' }}>
                kategorie: {c.name_cs}
              </Link>
            ))}
          </div>
        )}

        {/* Share */}
        <div className="flex items-center gap-3 mb-8 mt-2">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>Sdílet:</span>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
            target="_blank" rel="noopener noreferrer"
            className="w-9 h-9 flex items-center justify-center text-sm font-bold transition-colors hover:text-amber-400"
            style={{ border: '1.5px solid var(--color-ink)', color: 'var(--color-ink)' }}>f</a>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Odkaz zkopírován', 'success') }}
            className="w-9 h-9 flex items-center justify-center text-sm transition-colors hover:text-amber-400"
            style={{ border: '1.5px solid var(--color-ink)', color: 'var(--color-ink)' }}>🔗</button>
        </div>

        {/* Engage bar */}
        <div className="flex items-center gap-5 py-4 mb-8"
          style={{ borderTop: '1px solid rgba(27,31,23,0.12)', borderBottom: '1px solid rgba(27,31,23,0.12)' }}>
          <button
            onClick={handleLike}
            disabled={likeLoading}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all disabled:opacity-50"
            style={{
              border: '1.5px solid var(--color-ink)',
              background: liked ? 'var(--color-terracotta)' : 'var(--color-paper)',
              color: liked ? 'var(--color-paper)' : 'var(--color-ink)',
            }}>
            ♥ Líbí se mi · <strong>{likes}</strong>
          </button>
          <div className="flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
            💬 {comments.length || commentsCount} komentářů
          </div>
        </div>

        {/* Author box */}
        {author && (
          <div className="flex items-center gap-5 p-6 mb-8" style={{ border: '1.5px solid var(--color-ink)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-xl font-bold"
              style={{ background: 'var(--color-moss)', color: 'var(--color-paper)', fontFamily: 'var(--font-display)' }}>
              {author.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                : (author.avatar_initial || author.name[0])}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-1.5"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
                {author.name}
              </h4>
              {author.bio && <p className="text-sm" style={{ color: '#3C4138', lineHeight: 1.55 }}>{author.bio}</p>}
            </div>
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
                Související články
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(27,31,23,0.12)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map(r => (
                <Link key={r.id} href={`/${locale}/blog/${r.slug}`}
                  className="p-5 block hover:-translate-y-0.5 transition-transform"
                  style={{ border: '1.5px solid var(--color-ink)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '4px 4px 0 var(--color-ink)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <h5 className="font-bold text-base leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    {getRelatedTitle(r)}
                  </h5>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
              Komentáře ({comments.length || commentsCount})
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(27,31,23,0.12)' }} />
          </div>

          {/* Comment form */}
          <form onSubmit={submitComment} className="mb-8 p-5" style={{ border: '1.5px solid var(--color-ink)' }}>
            <textarea
              value={commentForm.content}
              onChange={e => setCommentForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Napište komentář…"
              rows={3}
              required
              className="w-full resize-none text-sm p-3 mb-3 focus:outline-none"
              style={{ border: '1.5px solid rgba(27,31,23,0.2)', background: 'var(--color-paper)', fontFamily: 'var(--font-sans)' }}
            />
            {/* Guest fields */}
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={commentForm.guestName}
                onChange={e => setCommentForm(f => ({ ...f, guestName: e.target.value }))}
                placeholder="Jméno (pro nepřihlášené)"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(27,31,23,0.2)', background: 'var(--color-paper)' }}
              />
              <input
                type="email"
                value={commentForm.guestEmail}
                onChange={e => setCommentForm(f => ({ ...f, guestEmail: e.target.value }))}
                placeholder="E-mail (nezveřejní se)"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
                style={{ border: '1.5px solid rgba(27,31,23,0.2)', background: 'var(--color-paper)' }}
              />
            </div>
            {/* Honeypot */}
            <input type="text" name="website" value={commentForm.website} onChange={e => setCommentForm(f => ({ ...f, website: e.target.value }))} className="sr-only" tabIndex={-1} autoComplete="off" />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#8A9085', fontFamily: 'var(--font-mono)' }}>
                Přihlášení uživatelé komentují pod svým jménem automaticky
              </span>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 text-sm font-bold disabled:opacity-50 transition-opacity"
                style={{ background: 'var(--color-forest-deep)', color: 'var(--color-amber)' }}>
                {submitting ? 'Odesílám…' : 'Odeslat'}
              </button>
            </div>
          </form>

          {/* Comment list */}
          <div>
            {comments.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--color-moss)' }}>Zatím žádné komentáře. Buďte první!</p>
            )}
            {comments.map(c => {
              const name = c.users ? `${c.users.first_name} ${c.users.last_name}` : (c.guest_name || 'Host')
              const isUser = !!c.users
              const initial = name[0]?.toUpperCase()
              return (
                <div key={c.id} className="flex gap-4 py-5" style={{ borderBottom: '1px solid rgba(27,31,23,0.08)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base font-bold"
                    style={{
                      background: isUser ? 'var(--color-moss)' : '#8A9085',
                      color: 'var(--color-paper)',
                      fontFamily: 'var(--font-display)',
                    }}>
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: 'var(--color-ink)' }}>{name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: isUser ? 'rgba(51,83,60,0.12)' : 'rgba(194,86,46,0.12)',
                          color: isUser ? 'var(--color-moss)' : 'var(--color-terracotta)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                        {isUser ? 'Přihlášen' : 'Host'}
                      </span>
                      <span className="text-xs" style={{ color: '#8A9085' }}>{formatDate(c.created_at, locale)}</span>
                    </div>
                    <p className="text-sm" style={{ color: '#3C4138', lineHeight: 1.6 }}>{c.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
