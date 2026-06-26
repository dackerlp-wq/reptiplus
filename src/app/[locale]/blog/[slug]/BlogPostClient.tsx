'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'
import { toast } from '@/components/ui/Toaster'
import { useCartStore } from '@/store/cart'
import { ShoppingCart, X } from 'lucide-react'

type Author = { id: string; name: string; avatar_initial: string | null; avatar_url: string | null; bio: string | null } | null
type Product = { id: string; slug: string; name_cs: string; name_en: string; name_de: string; price: number; stock: number; images: string; categories: { name_cs: string } | null }
type Category = { id: string; name_cs: string }
type BlogTag = { id: string; name_cs: string; name_en: string | null; name_de: string | null; slug: string }
type Comment = { id: string; content: string; guest_name: string | null; created_at: string; users: { first_name: string; last_name: string } | null; likes_count: number }
type RelatedPost = { id: string; slug: string; title_cs: string; title_en: string; title_de: string; excerpt: string | null; image: string | null }

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
  tags: BlogTag[]
  initialLikes: number
  commentsCount: number
  slug: string
}

type MentionPopup = {
  anchorRect: DOMRect
  productId: string; productSlug: string; productName: string
  product: Product | null
  loading: boolean
}

// Translations
const TRANS = {
  cs: {
    back: '← Blog', mentionedProduct: 'Zmíněný produkt', loading: 'Načítám…',
    soldOut: 'Vyprodáno', productDetail: 'Detail', addToCart: 'Do košíku',
    mentionedProducts: 'Zmíněné produkty', share: 'Sdílet', copyLink: 'Kopírovat odkaz',
    linkCopied: 'Odkaz zkopírován', likes: 'Líbí se mi', comments: 'Komentáře',
    commentPlaceholder: 'Napište komentář…', namePlaceholder: 'Jméno (pro nepřihlášené)',
    emailPlaceholder: 'E-mail (nezveřejní se)', loggedInNote: 'Přihlášení komentují pod svým jménem',
    send: 'Odeslat', sending: 'Odesílám…', guest: 'Host', loggedIn: 'Přihlášen',
    tags: 'Štítky', relatedArticles: 'Související články', newsletter: 'Odběr novinek',
    newsletterDesc: 'Novinky a tipy přímo do vaší schránky.', subscribe: 'Přihlásit se',
    emailField: 'vas@email.cz', notFound: 'Produkt nenalezen',
    noComments: 'Zatím žádné komentáře. Buďte první!', addedToCart: 'Přidáno do košíku ✓',
  },
  en: {
    back: '← Blog', mentionedProduct: 'Mentioned product', loading: 'Loading…',
    soldOut: 'Sold out', productDetail: 'View', addToCart: 'Add to cart',
    mentionedProducts: 'Mentioned products', share: 'Share', copyLink: 'Copy link',
    linkCopied: 'Link copied', likes: 'Like', comments: 'Comments',
    commentPlaceholder: 'Write a comment…', namePlaceholder: 'Name (for guests)',
    emailPlaceholder: 'Email (not published)', loggedInNote: 'Logged-in users comment under their name',
    send: 'Submit', sending: 'Sending…', guest: 'Guest', loggedIn: 'Logged in',
    tags: 'Tags', relatedArticles: 'Related articles', newsletter: 'Newsletter',
    newsletterDesc: 'Tips and news straight to your inbox.', subscribe: 'Subscribe',
    emailField: 'your@email.com', notFound: 'Product not found',
    noComments: 'No comments yet. Be the first!', addedToCart: 'Added to cart ✓',
  },
  de: {
    back: '← Blog', mentionedProduct: 'Erwähntes Produkt', loading: 'Lädt…',
    soldOut: 'Ausverkauft', productDetail: 'Ansehen', addToCart: 'In den Warenkorb',
    mentionedProducts: 'Erwähnte Produkte', share: 'Teilen', copyLink: 'Link kopieren',
    linkCopied: 'Link kopiert', likes: 'Gefällt mir', comments: 'Kommentare',
    commentPlaceholder: 'Kommentar schreiben…', namePlaceholder: 'Name (für Gäste)',
    emailPlaceholder: 'E-Mail (wird nicht veröffentlicht)', loggedInNote: 'Angemeldete Nutzer kommentieren unter ihrem Namen',
    send: 'Absenden', sending: 'Sende…', guest: 'Gast', loggedIn: 'Angemeldet',
    tags: 'Tags', relatedArticles: 'Ähnliche Artikel', newsletter: 'Newsletter',
    newsletterDesc: 'Tipps und Neuigkeiten direkt in Ihr Postfach.', subscribe: 'Anmelden',
    emailField: 'ihre@email.de', notFound: 'Produkt nicht gefunden',
    noComments: 'Noch keine Kommentare. Seien Sie der Erste!', addedToCart: 'In den Warenkorb ✓',
  },
}

export default function BlogPostClient({
  post, title, content, locale, author, related,
  productLinks, categoryLinks, tags, initialLikes, commentsCount, slug,
}: Props) {
  const tx = TRANS[locale] ?? TRANS.cs
  const addItem = useCartStore(s => s.addItem)

  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentForm, setCommentForm] = useState({ content: '', guestName: '', guestEmail: '', website: '' })
  const [submitting, setSubmitting] = useState(false)
  const [readPct, setReadPct] = useState(0)
  const [mentionPopup, setMentionPopup] = useState<MentionPopup | null>(null)

  const articleRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/blog/${slug}/like`).then(r => r.json()).then(d => {
      setLikes(d.count ?? initialLikes)
      setLiked(d.liked ?? false)
    }).catch(() => {})
  }, [slug, initialLikes])

  useEffect(() => {
    fetch(`/api/blog/${slug}/comments`).then(r => r.json()).then(d => setComments(d.comments || [])).catch(() => {})
  }, [slug])

  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const total = el.offsetHeight - window.innerHeight
      setReadPct(Math.max(0, Math.min(100, (-top / total) * 100)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Click handler for inline product mentions
  const openMention = useCallback(async (productId: string, productSlug: string, productName: string, rect: DOMRect) => {
    setMentionPopup({ anchorRect: rect, productId, productSlug, productName, product: null, loading: true })

    const existing = productLinks.find(p => p.id === productId || p.slug === productSlug)
    if (existing) {
      setMentionPopup(prev => prev ? { ...prev, product: existing, loading: false } : null)
      return
    }
    try {
      const res = await fetch(`/api/products/${productSlug}`)
      const data = await res.json()
      setMentionPopup(prev => prev ? { ...prev, product: data.product ?? null, loading: false } : null)
    } catch {
      setMentionPopup(prev => prev ? { ...prev, loading: false } : null)
    }
  }, [productLinks])

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const target = (e.target as Element).closest('span[data-product-id]') as HTMLElement | null
      if (!target) return
      e.preventDefault()
      openMention(
        target.getAttribute('data-product-id') || '',
        target.getAttribute('data-product-slug') || '',
        target.getAttribute('data-product-name') || '',
        target.getBoundingClientRect(),
      )
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [openMention])

  // Close popup on outside click
  useEffect(() => {
    if (!mentionPopup) return
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setMentionPopup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mentionPopup])

  const getProductName = (p: Product) => ({ cs: p.name_cs, en: p.name_en, de: p.name_de }[locale] || p.name_cs)
  const getRelatedTitle = (p: RelatedPost) => ({ cs: p.title_cs, en: p.title_en, de: p.title_de }[locale] || p.title_cs)
  const getFirstImage = (images: string) => { try { return JSON.parse(images)?.[0] || null } catch { return null } }
  const fmtPrice = (n: number) => n.toLocaleString('cs-CZ') + ' Kč'

  const doAddToCart = (p: Product) => {
    addItem({ productId: p.id, name: getProductName(p), sku: (p as unknown as { sku: string }).sku || '', price: p.price, image: getFirstImage(p.images) || '', quantity: 1, stock: p.stock })
    toast(tx.addedToCart, 'success')
  }

  const addMentionToCart = () => {
    if (!mentionPopup?.product) return
    doAddToCart(mentionPopup.product)
    setMentionPopup(null)
  }

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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(commentForm),
    })
    const d = await res.json()
    if (res.ok) {
      toast(d.message || 'Odesláno — čeká na schválení', 'success')
      setCommentForm({ content: '', guestName: '', guestEmail: '', website: '' })
    } else toast(d.error || 'Chyba', 'error')
    setSubmitting(false)
  }

  // Compute popup position — fixed = viewport coords, no scroll offset needed
  const popupStyle = (() => {
    if (!mentionPopup) return {}
    const r = mentionPopup.anchorRect
    const popupW = 304
    const popupH = 260 // approx
    const left = Math.max(8, Math.min(r.left, window.innerWidth - popupW - 8))
    // Show below if space, else above
    const spaceBelow = window.innerHeight - r.bottom
    const top = spaceBelow >= popupH ? r.bottom + 6 : r.top - popupH - 6
    return { left, top }
  })()

  return (
    <>
      {/* Inline product mention popup — fixed to viewport */}
      {mentionPopup && (
        <div
          ref={popupRef}
          className="fixed z-[200] w-76 shadow-2xl overflow-hidden"
          style={{
            width: 304,
            left: popupStyle.left,
            top: popupStyle.top,
            border: '1.5px solid var(--color-ink)',
            background: 'var(--color-paper)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ background: 'var(--color-moss)', borderBottom: '1.5px solid var(--color-ink)' }}>
            <span className="text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-amber)' }}>
              {tx.mentionedProduct}
            </span>
            <button onClick={() => setMentionPopup(null)} className="opacity-70 hover:opacity-100 text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {mentionPopup.loading ? (
            <div className="px-4 py-8 text-sm text-center" style={{ color: 'var(--color-moss)' }}>{tx.loading}</div>
          ) : mentionPopup.product ? (
            <>
              <div className="flex gap-3 p-4">
                {getFirstImage(mentionPopup.product.images) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFirstImage(mentionPopup.product.images)} alt="" className="w-20 h-20 object-cover shrink-0"
                    style={{ border: '1.5px solid var(--color-ink)' }} />
                ) : (
                  <div className="w-20 h-20 shrink-0" style={{ background: 'rgba(201,168,76,0.2)', border: '1.5px solid var(--color-ink)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-snug mb-1"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                    {getProductName(mentionPopup.product)}
                  </p>
                  {mentionPopup.product.categories && (
                    <p className="text-xs mb-1.5" style={{ color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>
                      {mentionPopup.product.categories.name_cs}
                    </p>
                  )}
                  {mentionPopup.product.price > 0 && (
                    <p className="text-base font-bold" style={{ color: 'var(--color-terracotta)' }}>
                      {fmtPrice(mentionPopup.product.price)}
                    </p>
                  )}
                  {mentionPopup.product.stock === 0 && (
                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-mono)' }}>
                      {tx.soldOut}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <Link href={`/${locale}/produkt/${mentionPopup.product.slug}`}
                  onClick={() => setMentionPopup(null)}
                  className="flex-1 py-2 text-xs font-bold text-center hover:opacity-80 transition-opacity"
                  style={{ border: '1.5px solid var(--color-ink)', color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                  {tx.productDetail}
                </Link>
                <button
                  onClick={addMentionToCart}
                  disabled={mentionPopup.product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'var(--color-terracotta)', color: 'var(--color-paper)', fontFamily: 'var(--font-mono)' }}>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {tx.addToCart}
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-4">
              <p className="text-sm font-bold" style={{ color: 'var(--color-ink)' }}>{mentionPopup.productName}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-terracotta)' }}>{tx.notFound}</p>
            </div>
          )}
        </div>
      )}

      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5" style={{ background: 'rgba(27,31,23,0.08)' }}>
        <div className="h-full transition-all duration-75" style={{ width: `${readPct}%`, background: 'var(--color-amber)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12" ref={articleRef}>
        <Link href={`/${locale}/blog`} className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>
          {tx.back}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">

          {/* ── MAIN COLUMN ── */}
          <div>
            <article>
              {post.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image} alt={title} className="w-full h-72 object-cover mb-8"
                  style={{ border: '1.5px solid var(--color-ink)' }} />
              )}

              <h1 className="text-4xl font-bold leading-tight mb-4"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                {title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs mb-8 pb-5"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)', borderBottom: '1px solid rgba(27,31,23,0.12)' }}>
                <span>{formatDate(post.published_at || post.created_at, locale)}</span>
                <span style={{ color: 'var(--color-terracotta)' }}>/</span>
                <span>{author?.name || 'Reptiplus'}</span>
                <span style={{ color: 'var(--color-terracotta)' }}>/</span>
                <span>♥ {likes}</span>
                <span style={{ color: 'var(--color-terracotta)' }}>/</span>
                <span>💬 {commentsCount}</span>
              </div>

              {/* Article content */}
              {content ? (
                <div ref={contentRef} className="prose prose-sm max-w-none"
                  style={{ color: '#3C4138', lineHeight: 1.78 }}
                  dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                <p style={{ color: 'var(--color-moss)' }}>Obsah tohoto článku není dostupný.</p>
              )}
            </article>

            {/* Category links */}
            {categoryLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 mb-6">
                {categoryLinks.map(c => (
                  <Link key={c.id} href={`/${locale}/obchod?kategorie=${c.id}`}
                    className="text-xs font-bold px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                    style={{ background: 'rgba(51,83,60,0.1)', color: 'var(--color-moss)', fontFamily: 'var(--font-mono)', border: '1px solid var(--color-moss)' }}>
                    {c.name_cs}
                  </Link>
                ))}
              </div>
            )}

            {/* Engage bar: likes + share */}
            <div className="flex items-center gap-4 py-5 mt-4"
              style={{ borderTop: '1px solid rgba(27,31,23,0.12)', borderBottom: '1px solid rgba(27,31,23,0.12)' }}>
              <button onClick={handleLike} disabled={likeLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all disabled:opacity-50"
                style={{
                  border: '1.5px solid var(--color-ink)',
                  background: liked ? 'var(--color-terracotta)' : 'transparent',
                  color: liked ? 'var(--color-paper)' : 'var(--color-ink)',
                }}>
                ♥ {tx.likes} · <strong>{likes}</strong>
              </button>
              <div className="text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
                💬 {comments.length || commentsCount}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-bold uppercase tracking-wide hidden sm:block"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>{tx.share}:</span>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center text-sm font-bold hover:opacity-70 transition-opacity"
                  style={{ border: '1.5px solid var(--color-ink)', color: 'var(--color-ink)' }}>f</a>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); toast(tx.linkCopied, 'success') }}
                  className="w-9 h-9 flex items-center justify-center text-sm hover:opacity-70 transition-opacity"
                  style={{ border: '1.5px solid var(--color-ink)', color: 'var(--color-ink)' }}>🔗</button>
              </div>
            </div>

            {/* Author box */}
            {author && (
              <div className="flex items-center gap-5 p-5 mt-6 mb-8" style={{ border: '1.5px solid var(--color-ink)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-xl font-bold overflow-hidden"
                  style={{ background: 'var(--color-moss)', color: 'var(--color-paper)', fontFamily: 'var(--font-display)' }}>
                  {author.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (author.avatar_initial || author.name[0])}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest mb-1"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
                    {author.name}
                  </h4>
                  {author.bio && <p className="text-sm" style={{ color: '#3C4138', lineHeight: 1.55 }}>{author.bio}</p>}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)' }}>
                  {tx.comments} ({comments.length || commentsCount})
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(27,31,23,0.12)' }} />
              </div>

              <form onSubmit={submitComment} className="mb-8 p-5" style={{ border: '1.5px solid var(--color-ink)' }}>
                <textarea value={commentForm.content} onChange={e => setCommentForm(f => ({ ...f, content: e.target.value }))}
                  placeholder={tx.commentPlaceholder} rows={3} required
                  className="w-full resize-none text-sm p-3 mb-3 focus:outline-none"
                  style={{ border: '1.5px solid rgba(27,31,23,0.18)', background: 'var(--color-paper)' }} />
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <input type="text" value={commentForm.guestName} onChange={e => setCommentForm(f => ({ ...f, guestName: e.target.value }))}
                    placeholder={tx.namePlaceholder} className="flex-1 px-3 py-2 text-sm focus:outline-none"
                    style={{ border: '1.5px solid rgba(27,31,23,0.18)', background: 'var(--color-paper)' }} />
                  <input type="email" value={commentForm.guestEmail} onChange={e => setCommentForm(f => ({ ...f, guestEmail: e.target.value }))}
                    placeholder={tx.emailPlaceholder} className="flex-1 px-3 py-2 text-sm focus:outline-none"
                    style={{ border: '1.5px solid rgba(27,31,23,0.18)', background: 'var(--color-paper)' }} />
                </div>
                <input type="text" name="website" value={commentForm.website} onChange={e => setCommentForm(f => ({ ...f, website: e.target.value }))} className="sr-only" tabIndex={-1} autoComplete="off" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs hidden sm:block" style={{ color: '#8A9085', fontFamily: 'var(--font-mono)' }}>{tx.loggedInNote}</span>
                  <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-bold shrink-0 disabled:opacity-50"
                    style={{ background: 'var(--color-forest-deep)', color: 'var(--color-amber)' }}>
                    {submitting ? tx.sending : tx.send}
                  </button>
                </div>
              </form>

              <div>
                {comments.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--color-moss)' }}>{tx.noComments}</p>
                )}
                {comments.map(c => {
                  const name = c.users ? `${c.users.first_name} ${c.users.last_name}` : (c.guest_name || tx.guest)
                  const isUser = !!c.users
                  return (
                    <div key={c.id} className="flex gap-4 py-5" style={{ borderBottom: '1px solid rgba(27,31,23,0.08)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold"
                        style={{ background: isUser ? 'var(--color-moss)' : '#8A9085', color: 'var(--color-paper)', fontFamily: 'var(--font-display)' }}>
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: 'var(--color-ink)' }}>{name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: isUser ? 'rgba(51,83,60,0.12)' : 'rgba(194,86,46,0.12)', color: isUser ? 'var(--color-moss)' : 'var(--color-terracotta)', fontFamily: 'var(--font-mono)' }}>
                            {isUser ? tx.loggedIn : tx.guest}
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
          </div>{/* end main column */}

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="sticky top-6 space-y-6">

            {/* Mentioned products */}
            {productLinks.length > 0 && (
              <div style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-paper)' }}>
                <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'var(--color-moss)', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', borderBottom: '1.5px solid var(--color-ink)' }}>
                  {tx.mentionedProducts}
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(27,31,23,0.1)' }}>
                  {productLinks.map(p => (
                    <div key={p.id} className="flex gap-3 p-3">
                      {getFirstImage(p.images) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getFirstImage(p.images)} alt="" className="w-14 h-14 object-cover shrink-0"
                          style={{ border: '1.5px solid var(--color-ink)' }} />
                      ) : (
                        <div className="w-14 h-14 shrink-0" style={{ background: 'rgba(201,168,76,0.2)', border: '1.5px solid var(--color-ink)' }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-tight mb-0.5"
                          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
                          {getProductName(p)}
                        </p>
                        {p.price > 0 && (
                          <p className="text-sm font-bold mb-2" style={{ color: 'var(--color-terracotta)' }}>
                            {fmtPrice(p.price)}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Link href={`/${locale}/produkt/${p.slug}`}
                            className="px-2.5 py-1 text-xs font-bold hover:opacity-80 transition-opacity"
                            style={{ border: '1.5px solid var(--color-ink)', fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                            {tx.productDetail}
                          </Link>
                          <button onClick={() => doAddToCart(p)} disabled={p.stock === 0}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                            style={{ background: 'var(--color-terracotta)', color: 'var(--color-paper)', fontFamily: 'var(--font-mono)' }}>
                            <ShoppingCart className="w-3 h-3" />
                            {p.stock === 0 ? tx.soldOut : tx.addToCart}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-paper)' }}>
                <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'var(--color-forest-deep)', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', borderBottom: '1.5px solid var(--color-ink)' }}>
                  {tx.tags}
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Link key={tag.id} href={`/${locale}/blog?tag=${tag.slug}`}
                      className="px-2.5 py-1 text-xs rounded-full hover:opacity-80 transition-opacity"
                      style={{ background: 'rgba(232,163,61,0.15)', color: 'var(--color-forest-deep)', fontFamily: 'var(--font-mono)', border: '1px solid rgba(232,163,61,0.4)', fontWeight: 600 }}>
                      {(tag[`name_${locale}` as keyof BlogTag] as string) || tag.name_cs}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related articles */}
            {related.length > 0 && (
              <div style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-paper)' }}>
                <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'var(--color-forest-deep)', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', borderBottom: '1.5px solid var(--color-ink)' }}>
                  {tx.relatedArticles}
                </div>
                <div>
                  {related.map(r => (
                    <Link key={r.id} href={`/${locale}/blog/${r.slug}`}
                      className="flex gap-3 p-3 hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--color-ink)', borderBottom: '1px solid rgba(27,31,23,0.08)' }}>
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="w-14 h-14 object-cover shrink-0"
                          style={{ border: '1.5px solid var(--color-ink)' }} />
                      ) : (
                        <div className="w-14 h-14 shrink-0" style={{ background: 'var(--color-moss)', opacity: 0.3 }} />
                      )}
                      <span className="text-sm font-bold leading-snug self-center"
                        style={{ fontFamily: 'var(--font-display)' }}>
                        {getRelatedTitle(r)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>
    </>
  )
}
