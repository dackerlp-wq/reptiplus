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
          className="fixed z-[200] shadow-2xl overflow-hidden rounded-xl border border-cream-dark bg-white"
          style={{ width: 304, left: popupStyle.left, top: popupStyle.top }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-cream border-b border-cream-dark">
            <span className="text-xs font-bold uppercase tracking-widest text-forest" style={{ fontFamily: 'var(--font-mono)' }}>
              {tx.mentionedProduct}
            </span>
            <button onClick={() => setMentionPopup(null)} className="text-gray-soft hover:text-charcoal">
              <X className="w-4 h-4" />
            </button>
          </div>

          {mentionPopup.loading ? (
            <div className="px-4 py-8 text-sm text-center text-gray-soft">{tx.loading}</div>
          ) : mentionPopup.product ? (
            <>
              <div className="flex gap-3 p-4">
                {getFirstImage(mentionPopup.product.images) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getFirstImage(mentionPopup.product.images)} alt="" className="w-20 h-20 object-cover shrink-0 rounded-lg border border-cream-dark" />
                ) : (
                  <div className="w-20 h-20 shrink-0 rounded-lg bg-cream border border-cream-dark" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-snug mb-1 text-charcoal">
                    {getProductName(mentionPopup.product)}
                  </p>
                  {mentionPopup.product.categories && (
                    <p className="text-xs mb-1.5 text-gray-soft">
                      {mentionPopup.product.categories.name_cs}
                    </p>
                  )}
                  {mentionPopup.product.price > 0 && (
                    <p className="text-base font-bold text-forest">
                      {fmtPrice(mentionPopup.product.price)}
                    </p>
                  )}
                  {mentionPopup.product.stock === 0 && (
                    <p className="text-xs font-bold mt-0.5 text-earth">
                      {tx.soldOut}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <Link href={`/${locale}/produkt/${mentionPopup.product.slug}`}
                  onClick={() => setMentionPopup(null)}
                  className="flex-1 py-2 text-xs font-semibold text-center border border-cream-dark rounded-lg hover:border-forest hover:text-forest transition-colors text-charcoal">
                  {tx.productDetail}
                </Link>
                <button
                  onClick={addMentionToCart}
                  disabled={mentionPopup.product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold bg-forest text-white rounded-lg hover:bg-forest-dark transition-colors disabled:opacity-40">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {tx.addToCart}
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-4">
              <p className="text-sm font-bold text-charcoal">{mentionPopup.productName}</p>
              <p className="text-xs mt-1 text-earth">{tx.notFound}</p>
            </div>
          )}
        </div>
      )}

      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-cream-dark">
        <div className="h-full transition-all duration-75 bg-forest" style={{ width: `${readPct}%` }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12" ref={articleRef}>
        <Link href={`/${locale}/blog`} className="inline-flex items-center gap-1.5 text-sm mb-8 text-forest hover:text-forest-dark transition-colors font-medium">
          {tx.back}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">

          {/* ── MAIN COLUMN ── */}
          <div>
            <article>
              {post.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image} alt={title} className="w-full h-72 object-cover mb-8 rounded-2xl" />
              )}

              <h1 className="text-4xl font-bold leading-tight mb-4 text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
                {title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-soft mb-8 pb-5 border-b border-cream-dark">
                <span>{formatDate(post.published_at || post.created_at, locale)}</span>
                <span>·</span>
                <span>{author?.name || 'Reptiplus'}</span>
                <span>·</span>
                <span>♥ {likes}</span>
                <span>·</span>
                <span>💬 {commentsCount}</span>
              </div>

              {/* Article content */}
              {content ? (
                <div ref={contentRef} className="prose prose-sm max-w-none text-charcoal"
                  style={{ lineHeight: 1.78 }}
                  dangerouslySetInnerHTML={{ __html: content }} />
              ) : (
                <p className="text-gray-soft">Obsah tohoto článku není dostupný.</p>
              )}
            </article>

            {/* Category links */}
            {categoryLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 mb-6">
                {categoryLinks.map(c => (
                  <Link key={c.id} href={`/${locale}/obchod?kategorie=${c.id}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-forest/10 text-forest border border-forest/20 hover:bg-forest/20 transition-colors">
                    {c.name_cs}
                  </Link>
                ))}
              </div>
            )}

            {/* Engage bar: likes + share */}
            <div className="flex items-center gap-4 py-5 mt-4 border-t border-b border-cream-dark">
              <button onClick={handleLike} disabled={likeLoading}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-50 ${
                  liked ? 'bg-forest text-white border-forest' : 'border-cream-dark text-charcoal hover:border-forest hover:text-forest'
                }`}>
                ♥ {tx.likes} · <strong>{likes}</strong>
              </button>
              <div className="text-sm text-gray-soft">💬 {comments.length || commentsCount}</div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-semibold text-gray-soft hidden sm:block">{tx.share}:</span>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center text-sm font-bold rounded-lg border border-cream-dark text-charcoal hover:border-forest hover:text-forest transition-colors">f</a>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); toast(tx.linkCopied, 'success') }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-cream-dark text-charcoal hover:border-forest hover:text-forest transition-colors">🔗</button>
              </div>
            </div>

            {/* Author box */}
            {author && (
              <div className="flex items-center gap-5 p-5 mt-6 mb-8 bg-cream rounded-2xl border border-cream-dark">
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 text-xl font-bold overflow-hidden bg-forest text-white">
                  {author.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (author.avatar_initial || author.name[0])}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-charcoal mb-1">{author.name}</h4>
                  {author.bio && <p className="text-sm text-gray-soft leading-relaxed">{author.bio}</p>}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-bold text-charcoal">
                  {tx.comments} ({comments.length || commentsCount})
                </span>
                <div className="flex-1 h-px bg-cream-dark" />
              </div>

              <form onSubmit={submitComment} className="mb-8 p-5 bg-white rounded-xl border border-cream-dark">
                <textarea value={commentForm.content} onChange={e => setCommentForm(f => ({ ...f, content: e.target.value }))}
                  placeholder={tx.commentPlaceholder} rows={3} required
                  className="w-full resize-none text-sm p-3 mb-3 rounded-lg border border-cream-dark focus:outline-none focus:border-forest bg-cream" />
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <input type="text" value={commentForm.guestName} onChange={e => setCommentForm(f => ({ ...f, guestName: e.target.value }))}
                    placeholder={tx.namePlaceholder} className="flex-1 px-3 py-2 text-sm rounded-lg border border-cream-dark bg-cream focus:outline-none focus:border-forest" />
                  <input type="email" value={commentForm.guestEmail} onChange={e => setCommentForm(f => ({ ...f, guestEmail: e.target.value }))}
                    placeholder={tx.emailPlaceholder} className="flex-1 px-3 py-2 text-sm rounded-lg border border-cream-dark bg-cream focus:outline-none focus:border-forest" />
                </div>
                <input type="text" name="website" value={commentForm.website} onChange={e => setCommentForm(f => ({ ...f, website: e.target.value }))} className="sr-only" tabIndex={-1} autoComplete="off" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-gray-soft hidden sm:block">{tx.loggedInNote}</span>
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2 text-sm font-bold bg-forest text-white rounded-xl hover:bg-forest-dark transition-colors disabled:opacity-50 shrink-0">
                    {submitting ? tx.sending : tx.send}
                  </button>
                </div>
              </form>

              <div>
                {comments.length === 0 && (
                  <p className="text-sm text-gray-soft">{tx.noComments}</p>
                )}
                {comments.map(c => {
                  const name = c.users ? `${c.users.first_name} ${c.users.last_name}` : (c.guest_name || tx.guest)
                  const isUser = !!c.users
                  return (
                    <div key={c.id} className="flex gap-4 py-5 border-b border-cream-dark">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-white ${isUser ? 'bg-forest' : 'bg-gray-soft'}`}>
                        {name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm text-charcoal">{name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isUser ? 'bg-forest/10 text-forest' : 'bg-cream text-gray-soft'}`}>
                            {isUser ? tx.loggedIn : tx.guest}
                          </span>
                          <span className="text-xs text-gray-soft">{formatDate(c.created_at, locale)}</span>
                        </div>
                        <p className="text-sm text-charcoal leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>{/* end main column */}

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="sticky top-6 space-y-4">

            {/* Mentioned products */}
            {productLinks.length > 0 && (
              <div className="bg-white border border-cream-dark rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-cream border-b border-cream-dark">
                  <span className="text-xs font-bold uppercase tracking-widest text-forest" style={{ fontFamily: 'var(--font-mono)' }}>
                    {tx.mentionedProducts}
                  </span>
                </div>
                <div className="divide-y divide-cream-dark">
                  {productLinks.map(p => (
                    <div key={p.id} className="flex gap-3 p-3">
                      {getFirstImage(p.images) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getFirstImage(p.images)} alt="" className="w-14 h-14 object-cover shrink-0 rounded-lg border border-cream-dark" />
                      ) : (
                        <div className="w-14 h-14 shrink-0 rounded-lg bg-cream border border-cream-dark" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-tight mb-0.5 text-charcoal">{getProductName(p)}</p>
                        {p.price > 0 && <p className="text-sm font-bold mb-2 text-forest">{fmtPrice(p.price)}</p>}
                        <div className="flex gap-2">
                          <Link href={`/${locale}/produkt/${p.slug}`}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-cream-dark text-charcoal hover:border-forest hover:text-forest transition-colors">
                            {tx.productDetail}
                          </Link>
                          <button onClick={() => doAddToCart(p)} disabled={p.stock === 0}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-forest text-white rounded-lg hover:bg-forest-dark transition-colors disabled:opacity-40">
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
              <div className="bg-white border border-cream-dark rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-cream border-b border-cream-dark">
                  <span className="text-xs font-bold uppercase tracking-widest text-charcoal" style={{ fontFamily: 'var(--font-mono)' }}>
                    {tx.tags}
                  </span>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Link key={tag.id} href={`/${locale}/blog?tag=${tag.slug}`}
                      className="px-2.5 py-1 text-xs rounded-full bg-cream text-gray-soft border border-cream-dark hover:border-forest hover:text-forest transition-colors font-medium">
                      {(tag[`name_${locale}` as keyof BlogTag] as string) || tag.name_cs}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related articles */}
            {related.length > 0 && (
              <div className="bg-white border border-cream-dark rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-cream border-b border-cream-dark">
                  <span className="text-xs font-bold uppercase tracking-widest text-charcoal" style={{ fontFamily: 'var(--font-mono)' }}>
                    {tx.relatedArticles}
                  </span>
                </div>
                <div className="divide-y divide-cream-dark">
                  {related.map(r => (
                    <Link key={r.id} href={`/${locale}/blog/${r.slug}`}
                      className="flex gap-3 p-3 hover:bg-cream transition-colors">
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="w-14 h-14 object-cover shrink-0 rounded-lg border border-cream-dark" />
                      ) : (
                        <div className="w-14 h-14 shrink-0 rounded-lg bg-sage/30" />
                      )}
                      <span className="text-sm font-semibold text-charcoal leading-snug self-center hover:text-forest transition-colors">
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
