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
        .blog-card { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
        .blog-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-color: var(--color-forest); }
      `}</style>

      {/* Hero */}
      <header className="bg-white border-b border-cream-dark px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-1 h-5 rounded-full bg-forest" />
            <span className="text-xs font-bold uppercase tracking-widest text-forest" style={{ fontFamily: 'var(--font-mono)' }}>
              Terénní deník chovatele
            </span>
          </div>
          <h1 className="text-4xl font-bold text-charcoal leading-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Vše, co potřebuje vědět{' '}
            <em className="not-italic text-forest">každý terarista</em>.
          </h1>
          <p className="text-gray-soft max-w-lg leading-relaxed">
            Praktické návody, srovnání vybavení a postřehy ze světa teraristiky — psané lidmi, kteří plazy skutečně chovají.
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">
        <div>
          {/* Active filter indicator */}
          {filterLabel && (
            <div className="flex items-center gap-3 mb-6 px-4 py-2.5 bg-forest/5 border border-forest/20 rounded-xl">
              <span className="text-sm font-semibold text-forest">{filterLabel}</span>
              <Link href={`/${locale}/blog`}
                className="ml-auto text-xs font-bold px-2.5 py-1 bg-forest text-white rounded-lg hover:bg-forest-dark transition-colors">
                × Zrušit
              </Link>
            </div>
          )}

          {/* Featured */}
          {featured && (
            <div className="mb-8">
              <article className="blog-card bg-white border border-cream-dark rounded-2xl overflow-hidden relative">
                <Link href={`/${locale}/blog/${featured.slug}`} className="absolute inset-0 z-[1]" aria-label={getTitle(featured as Record<string, unknown>)} />
                <div className="absolute top-3 left-3 z-[2] px-2.5 py-1 text-xs font-bold uppercase tracking-wide bg-gold text-white rounded-lg">
                  Doporučujeme
                </div>
                {featured.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featured.image} alt="" className="w-full h-52 object-cover" />
                ) : (
                  <div className="w-full h-52 flex items-center justify-center bg-sage/30">
                    <span className="text-6xl opacity-40">🦎</span>
                  </div>
                )}
                <div className="p-7 relative z-[2]">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(featured as any).blog_categories && (
                    <span className="text-xs font-semibold text-forest bg-forest/10 px-2 py-0.5 rounded-full mr-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {getCatName((featured as any).blog_categories)}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-soft mt-2 mb-3">
                    <span>{formatDate(featured.published_at || featured.created_at, locale as Locale)}</span>
                    <span>·</span>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <span>{(featured as any).blog_authors?.name || 'Reptiplus'}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-charcoal mb-2 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {getTitle(featured as Record<string, unknown>)}
                  </h2>
                  {featured.excerpt && <p className="text-sm text-gray-soft leading-relaxed mb-4">{featured.excerpt}</p>}
                  {getPostTags(featured).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {getPostTags(featured).slice(0, 4).map((tag, i) => (
                        <Link key={i} href={`/${locale}/blog?tag=${tag.slug}`}
                          className="px-2 py-0.5 text-xs bg-cream text-gray-soft border border-cream-dark rounded-full hover:border-forest hover:text-forest transition-colors relative z-[2]">
                          {getTagName(tag)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            </div>
          )}

          {/* Article feed */}
          {posts.length === 0 && (
            <p className="text-center py-16 text-gray-soft">{t('no_posts')}</p>
          )}
          <div className="flex flex-col gap-4">
            {rest.map((post) => (
              <article key={post.id} className="blog-card bg-white border border-cream-dark rounded-xl overflow-hidden relative">
                <Link href={`/${locale}/blog/${post.slug}`} className="absolute inset-0 z-[1]" aria-label={getTitle(post as Record<string, unknown>)} />
                <div className="flex gap-0">
                  {post.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.image} alt="" className="w-40 h-full object-cover shrink-0" style={{ minHeight: 120 }} />
                  )}
                  <div className="flex-1 p-5 min-w-0 relative z-[2]">
                    <div className="flex items-center gap-2 text-xs text-gray-soft mb-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(post as any).blog_categories && (
                        <span className="text-forest font-semibold">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {getCatName((post as any).blog_categories)}
                        </span>
                      )}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(post as any).blog_categories && <span>·</span>}
                      <span>{formatDate(post.published_at || post.created_at, locale as Locale)}</span>
                      <span>·</span>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span>{(post as any).blog_authors?.name || 'Reptiplus'}</span>
                    </div>
                    <h2 className="text-lg font-bold text-charcoal mb-1 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                      {getTitle(post as Record<string, unknown>)}
                    </h2>
                    {post.excerpt && <p className="text-sm text-gray-soft line-clamp-2 mb-2">{post.excerpt}</p>}
                    {getPostTags(post).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {getPostTags(post).slice(0, 3).map((tag, i) => (
                          <Link key={i} href={`/${locale}/blog?tag=${tag.slug}`}
                            className="px-2 py-0.5 text-xs bg-cream text-gray-soft border border-cream-dark rounded-full hover:border-forest hover:text-forest transition-colors relative z-[2]">
                            {getTagName(tag)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="self-start sticky top-6 space-y-4">
          <div className="bg-white border border-cream-dark rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-forest mb-3 pb-3 border-b border-cream-dark" style={{ fontFamily: 'var(--font-mono)' }}>
              {t('title')}
            </h3>
            <p className="text-sm text-gray-soft leading-relaxed">
              Praktické rady a tipy o chovu plazů přímo od nás.
            </p>
          </div>

          {/* Blog categories */}
          {(allBlogCats || []).length > 0 && (
            <div className="bg-white border border-cream-dark rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-cream border-b border-cream-dark">
                <span className="text-xs font-bold uppercase tracking-widest text-charcoal" style={{ fontFamily: 'var(--font-mono)' }}>
                  {locale === 'cs' ? 'Kategorie' : locale === 'en' ? 'Categories' : 'Kategorien'}
                </span>
              </div>
              <div className="p-3 flex flex-col gap-0.5">
                <Link href={`/${locale}/blog`}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors font-medium ${!catSlug ? 'bg-forest/10 text-forest' : 'text-gray-soft hover:text-forest hover:bg-cream'}`}>
                  {locale === 'cs' ? 'Všechny' : locale === 'en' ? 'All' : 'Alle'}
                </Link>
                {(allBlogCats || []).map(c => (
                  <Link key={c.id} href={`/${locale}/blog?kategorie=${c.slug}`}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${catSlug === c.slug ? 'bg-forest/10 text-forest font-semibold' : 'text-gray-soft hover:text-forest hover:bg-cream'}`}>
                    {getCatName(c)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tags cloud */}
          {(allTags || []).length > 0 && (
            <div className="bg-white border border-cream-dark rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-cream border-b border-cream-dark">
                <span className="text-xs font-bold uppercase tracking-widest text-charcoal" style={{ fontFamily: 'var(--font-mono)' }}>
                  {locale === 'cs' ? 'Štítky' : locale === 'en' ? 'Tags' : 'Tags'}
                </span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {[...(allTags || [])].sort(() => Math.random() - 0.5).slice(0, 15).map(tag => (
                  <Link key={tag.id} href={`/${locale}/blog?tag=${tag.slug}`}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors border ${
                      tagSlug === tag.slug
                        ? 'bg-forest text-white border-forest'
                        : 'bg-cream text-gray-soft border-cream-dark hover:border-forest hover:text-forest'
                    }`}>
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
