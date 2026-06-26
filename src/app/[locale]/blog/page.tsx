import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { formatDate } from '@/lib/utils'
import type { Locale } from '@/lib/i18n'

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tag?: string; kategorie?: string }>
}) {
  const { locale } = await params
  const { tag: tagSlug, kategorie: catSlug } = await searchParams
  const t = await getTranslations('blog')

  // Sidebar data — blog_tags may not exist if migration_blog_tags.sql hasn't run,
  // blog_categories may not exist if migration_blog_categories.sql hasn't run
  const [tagsRes, catsRes] = await Promise.all([
    supabaseAdmin.from('blog_tags').select('id, name_cs, name_en, name_de, slug').order('name_cs'),
    supabaseAdmin.from('blog_categories').select('id, name_cs, name_en, name_de, slug').order('name_cs'),
  ])
  const allTags = tagsRes.error ? [] : (tagsRes.data || [])
  const allBlogCats = catsRes.error ? [] : (catsRes.data || [])

  // Active filter tag/category object
  const activeTag = tagSlug ? allTags.find(t => t.slug === tagSlug) : null
  const activeCat = catSlug ? allBlogCats.find(c => c.slug === catSlug) : null

  const hasCats = !catsRes.error
  const hasTagTable = !tagsRes.error

  // Use a static select; join columns that don't exist will silently return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let postsQuery = (supabaseAdmin as any)
    .from('blog_posts')
    .select('*, blog_authors(name, avatar_initial), blog_post_tags(blog_tags(name_cs, name_en, name_de, slug)), blog_categories(id, name_cs, name_en, name_de, slug)')
    .eq('is_published', 1)
    .order('published_at', { ascending: false })

  // Filter by blog category (only works once migration is run)
  if (activeCat && hasCats) {
    postsQuery = postsQuery.eq('blog_category_id', activeCat.id)
  }

  const { data: postsRaw } = await postsQuery
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _ = { hasTagTable } // suppress unused var

  // Filter by tag (post-fetch, because Supabase can't easily filter by M:N)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: any[] = tagSlug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (postsRaw || []).filter((p: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p.blog_post_tags || []).some((pt: any) => pt.blog_tags?.slug === tagSlug)
      )
    : postsRaw || []

  const getTitle = (post: Record<string, unknown>) => {
    const map: Record<string, unknown> = { cs: post.title_cs, en: post.title_en, de: post.title_de }
    return (map[locale] || post.title_cs) as string
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTagName = (tag: any) => (tag[`name_${locale}`] || tag.name_cs) as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCatName = (cat: any) => (cat?.[`name_${locale}`] || cat?.name_cs) as string | undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPostTags = (post: any): { name_cs: string; name_en: string | null; name_de: string | null; slug: string }[] =>
    (post.blog_post_tags || []).map((pt: any) => pt.blog_tags).filter(Boolean)

  const featured = posts?.[0]
  const rest = posts?.slice(1) || []

  const filterLabel = activeTag
    ? `Štítek: ${getTagName(activeTag)}`
    : activeCat
    ? `Kategorie: ${getCatName(activeCat)}`
    : null

  return (
    <>
      <style>{`
        .specimen-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .specimen-card:hover { transform: translateY(-3px); box-shadow: 6px 6px 0 var(--color-ink); }
        .specimen-featured:hover { transform: translateY(-2px); box-shadow: 7px 7px 0 var(--color-ink); }
      `}</style>

      {/* Hero */}
      <header style={{ background: 'var(--color-forest-deep)', color: 'var(--color-paper)' }}
        className="px-8 py-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--color-amber), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-3 mb-5 text-xs uppercase tracking-widest"
            style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>
            <span className="w-7 h-px" style={{ background: 'var(--color-amber)' }} />
            Terénní deník chovatele
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-4 max-w-2xl"
            style={{ fontFamily: 'var(--font-display)' }}>
            Vše, co potřebuje vědět{' '}
            <em className="not-italic" style={{ color: 'var(--color-amber)' }}>každý terarista</em>.
          </h1>
          <p className="text-base max-w-lg" style={{ color: 'rgba(243,238,224,0.7)', lineHeight: 1.7 }}>
            Praktické návody, srovnání vybavení a postřehy ze světa teraristiky — psané lidmi, kteří plazy skutečně chovají.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-14 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
        <div>
          {/* Active filter indicator */}
          {filterLabel && (
            <div className="flex items-center gap-3 mb-8 px-4 py-3"
              style={{ background: 'rgba(232,163,61,0.1)', border: '1.5px solid rgba(232,163,61,0.4)' }}>
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-forest-deep)' }}>
                {filterLabel}
              </span>
              <Link href={`/${locale}/blog`}
                className="ml-auto text-xs font-bold px-2.5 py-1 hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-amber)', color: 'var(--color-forest-deep)', fontFamily: 'var(--font-mono)' }}>
                × Zrušit filtr
              </Link>
            </div>
          )}

          {/* Featured — card overlay pattern: absolute Link covers card, tag links sit above it */}
          {featured && (
            <div className="block mb-10 group">
              <article className="specimen-card specimen-featured flex flex-col md:flex-row"
                style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-paper)', position: 'relative' }}>
                {/* Invisible overlay link for the whole card */}
                <Link href={`/${locale}/blog/${featured.slug}`} className="absolute inset-0 z-[1]" aria-label={getTitle(featured as Record<string, unknown>)} />

                <div className="absolute -top-px right-6 px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
                  style={{ background: 'var(--color-amber)', color: 'var(--color-forest-deep)', fontFamily: 'var(--font-mono)', border: '1.5px solid var(--color-ink)', borderTop: 'none', zIndex: 2 }}>
                  Doporučujeme
                </div>

                {featured.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featured.image} alt="" className="md:w-2/5 h-48 md:h-auto object-cover relative z-0" style={{ borderRight: '1.5px solid var(--color-ink)' }} />
                ) : (
                  <div className="md:w-2/5 h-48 md:h-64 flex items-center justify-center relative z-0" style={{ background: 'var(--color-moss)', borderRight: '1.5px solid var(--color-ink)' }}>
                    <span className="text-6xl opacity-30">🦎</span>
                  </div>
                )}

                <div className="flex-1 p-8 flex flex-col justify-center relative z-[2]">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(featured as any).blog_categories && (
                    <div className="mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5"
                        style={{ background: 'var(--color-moss)', color: 'var(--color-paper)', fontFamily: 'var(--font-mono)' }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {getCatName((featured as any).blog_categories)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>
                    <span>{formatDate(featured.published_at || featured.created_at, locale as Locale)}</span>
                    <span style={{ color: 'var(--color-terracotta)' }}>/</span>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <span>{(featured as any).blog_authors?.name || 'Reptiplus'}</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-3 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {getTitle(featured as Record<string, unknown>)}
                  </h2>
                  {featured.excerpt && <p className="text-sm mb-3" style={{ color: '#3C4138', lineHeight: 1.65 }}>{featured.excerpt}</p>}
                  {getPostTags(featured).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {getPostTags(featured).slice(0, 3).map((tag, i) => (
                        <Link key={i} href={`/${locale}/blog?tag=${tag.slug}`}
                          className="px-2 py-0.5 text-xs rounded-full hover:opacity-80 relative z-[2]"
                          style={{ background: 'rgba(232,163,61,0.18)', color: 'var(--color-forest-deep)', fontFamily: 'var(--font-mono)', border: '1px solid rgba(232,163,61,0.35)' }}>
                          {getTagName(tag)}
                        </Link>
                      ))}
                      {getPostTags(featured).length > 3 && (
                        <span className="px-2 py-0.5 text-xs rounded-full relative z-[2]"
                          style={{ background: 'rgba(27,31,23,0.08)', color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>
                          +{getPostTags(featured).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-sm font-bold uppercase tracking-wide inline-flex items-center gap-1.5"
                    style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-mono)' }}>
                    {t('read_more')} →
                  </span>
                </div>
              </article>
            </div>
          )}

          {/* Article feed */}
          {posts.length === 0 && (
            <p className="text-center py-16" style={{ color: 'var(--color-moss)' }}>{t('no_posts')}</p>
          )}
          <div className="flex flex-col gap-8">
            {rest.map((post) => (
              <div key={post.id} className="group">
                <article className="specimen-card p-7"
                  style={{ background: 'var(--color-paper)', border: '1.5px solid var(--color-ink)', borderRadius: 2, position: 'relative' }}>
                  {/* Overlay link covers the whole card */}
                  <Link href={`/${locale}/blog/${post.slug}`} className="absolute inset-0 z-[1]" aria-label={getTitle(post as Record<string, unknown>)} />

                  <div className="absolute -top-px right-6 px-3 py-1 text-xs font-bold uppercase tracking-wider"
                    style={{ background: 'var(--color-moss)', color: 'var(--color-paper)', fontFamily: 'var(--font-mono)', border: '1.5px solid var(--color-ink)', borderTop: 'none', zIndex: 2 }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(post as any).blog_categories ? getCatName((post as any).blog_categories) : (locale === 'cs' ? 'Článek' : locale === 'en' ? 'Article' : 'Artikel')}
                  </div>

                  <div className="flex gap-6 relative z-[2]">
                    {post.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.image} alt="" className="w-36 h-36 object-cover shrink-0" style={{ border: '1.5px solid var(--color-ink)' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>
                        <span>{formatDate(post.published_at || post.created_at, locale as Locale)}</span>
                        <span style={{ color: 'var(--color-terracotta)' }}>/</span>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <span>{(post as any).blog_authors?.name || 'Reptiplus'}</span>
                      </div>
                      <h2 className="text-xl font-bold mb-2 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                        {getTitle(post as Record<string, unknown>)}
                      </h2>
                      {post.excerpt && <p className="text-sm mb-3 line-clamp-2" style={{ color: '#3C4138', lineHeight: 1.65 }}>{post.excerpt}</p>}
                      {getPostTags(post).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {getPostTags(post).slice(0, 3).map((tag, i) => (
                            <Link key={i} href={`/${locale}/blog?tag=${tag.slug}`}
                              className="px-2 py-0.5 text-xs rounded-full hover:opacity-80 transition-opacity relative z-[2]"
                              style={{ background: 'rgba(232,163,61,0.18)', color: 'var(--color-forest-deep)', fontFamily: 'var(--font-mono)', border: '1px solid rgba(232,163,61,0.35)' }}>
                              {getTagName(tag)}
                            </Link>
                          ))}
                          {getPostTags(post).length > 3 && (
                            <span className="px-2 py-0.5 text-xs rounded-full relative z-[2]"
                              style={{ background: 'rgba(27,31,23,0.08)', color: 'var(--color-moss)', fontFamily: 'var(--font-mono)' }}>
                              +{getPostTags(post).length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1"
                        style={{ color: 'var(--color-terracotta)', fontFamily: 'var(--font-mono)' }}>
                        {t('read_more')} →
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="self-start sticky top-6 space-y-6">
          <div style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-paper)', padding: '24px' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 pb-3"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-moss)', borderBottom: '1px solid rgba(27,31,23,0.12)' }}>
              {t('title')}
            </h3>
            <p className="text-sm" style={{ color: '#3C4138', lineHeight: 1.65 }}>
              Praktické rady a tipy o chovu plazů přímo od nás.
            </p>
          </div>

          {/* Blog categories */}
          {(allBlogCats || []).length > 0 && (
            <div style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-paper)' }}>
              <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
                style={{ background: 'var(--color-forest-deep)', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', borderBottom: '1.5px solid var(--color-ink)' }}>
                {locale === 'cs' ? 'Kategorie' : locale === 'en' ? 'Categories' : 'Kategorien'}
              </div>
              <div className="p-4 flex flex-col gap-1">
                <Link href={`/${locale}/blog`}
                  className="text-sm px-2 py-1 rounded hover:opacity-80 transition-opacity font-medium"
                  style={{ color: !catSlug ? 'var(--color-terracotta)' : 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>
                  {locale === 'cs' ? '— Všechny kategorie' : locale === 'en' ? '— All categories' : '— Alle Kategorien'}
                </Link>
                {(allBlogCats || []).map(c => (
                  <Link key={c.id} href={`/${locale}/blog?kategorie=${c.slug}`}
                    className="text-sm px-2 py-1 rounded hover:opacity-80 transition-opacity"
                    style={{ color: catSlug === c.slug ? 'var(--color-terracotta)' : 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontWeight: catSlug === c.slug ? 700 : 400 }}>
                    {getCatName(c)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tags cloud — randomised, max 15 */}
          {(allTags || []).length > 0 && (
            <div style={{ border: '1.5px solid var(--color-ink)', background: 'var(--color-paper)' }}>
              <div className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
                style={{ background: 'var(--color-forest-deep)', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', borderBottom: '1.5px solid var(--color-ink)' }}>
                {locale === 'cs' ? 'Štítky' : locale === 'en' ? 'Tags' : 'Tags'}
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {[...(allTags || [])].sort(() => Math.random() - 0.5).slice(0, 15).map(tag => (
                  <Link key={tag.id} href={`/${locale}/blog?tag=${tag.slug}`}
                    className="px-2.5 py-1 text-xs rounded-full hover:opacity-80 transition-opacity"
                    style={{
                      background: tagSlug === tag.slug ? 'var(--color-amber)' : 'rgba(232,163,61,0.15)',
                      color: 'var(--color-forest-deep)',
                      fontFamily: 'var(--font-mono)',
                      border: `1px solid ${tagSlug === tag.slug ? 'var(--color-amber)' : 'rgba(232,163,61,0.4)'}`,
                      fontWeight: tagSlug === tag.slug ? 700 : 600,
                    }}>
                    {getTagName(tag)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
