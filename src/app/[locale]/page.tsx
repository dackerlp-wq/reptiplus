import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { mapProduct, mapCategory } from '@/lib/mappers'
import ProductCard, { type Product } from '@/components/shop/ProductCard'
import { Package, Truck, Shield, Headphones, ArrowRight, Zap, BookOpen } from 'lucide-react'

async function getHomeData() {
  const [
    { data: newProdsRaw },
    { data: featuredProdsRaw },
    { data: saleProdsRaw },
    { data: catsRaw },
  ] = await Promise.all([
    supabaseAdmin.from('products').select('*').eq('is_active', 1).eq('is_new', 1).order('created_at', { ascending: false }).limit(4),
    supabaseAdmin.from('products').select('*').eq('is_active', 1).eq('is_featured', 1).limit(8),
    supabaseAdmin.from('products').select('*').eq('is_active', 1).eq('is_sale', 1).limit(4),
    supabaseAdmin.from('categories').select('*').order('sort_order'),
  ])
  return {
    newProds: (newProdsRaw || []).map(mapProduct),
    featuredProds: (featuredProdsRaw || []).map(mapProduct),
    saleProds: (saleProdsRaw || []).map(mapProduct),
    cats: (catsRaw || []).map(mapCategory),
  }
}

const categoryIcons: Record<string, string> = {
  osvetleni: '💡',
  vyhrivani: '🔥',
  terraria: '🦎',
  krmivo: '🦗',
  vitaminy: '💊',
  dekorace: '🪨',
  doplnky: '🔧',
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('home')
  const tBlog = await getTranslations('blog')
  const { newProds, featuredProds, saleProds, cats } = await getHomeData()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCatName = (cat: any) => {
    const map: Record<string, string> = { cs: cat.nameCs, en: cat.nameEn, de: cat.nameDe }
    return map[locale] || cat.nameCs
  }

  const features = [
    { icon: Package, title: t('feature_stock'), desc: t('feature_stock_desc') },
    { icon: Truck, title: t('feature_shipping'), desc: t('feature_shipping_desc') },
    { icon: Shield, title: t('feature_payment'), desc: t('feature_payment_desc') },
    { icon: Headphones, title: t('feature_support'), desc: t('feature_support_desc') },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-forest-dark via-forest to-forest-light overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-20 w-64 h-64 rounded-full bg-gold blur-3xl" />
          <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-sage blur-2xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/30 text-gold px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              {t('specialist')}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {t('hero_title')}
            </h1>
            <p className="mt-4 text-lg text-sage leading-relaxed max-w-xl">
              {t('hero_subtitle')}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href={`/${locale}/obchod`}
                className="inline-flex items-center gap-2 bg-gold text-charcoal font-semibold px-6 py-3 rounded-xl hover:bg-gold-light transition-colors"
              >
                {t('hero_cta')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/obchod?filtr=novinka`}
                className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                {t('hero_cta2')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-b border-cream-dark">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-forest" />
              </div>
              <div>
                <p className="font-semibold text-sm text-charcoal">{f.title}</p>
                <p className="text-xs text-gray-soft mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-charcoal mb-6">{t('categories_title')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {cats.map(cat => cat && (
            <Link
              key={cat.id}
              href={`/${locale}/obchod?kategorie=${cat.slug}`}
              className="group flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-cream-dark hover:border-forest/30 hover:shadow-md transition-all"
            >
              <span className="text-2xl">{categoryIcons[cat.slug] || '📦'}</span>
              <span className="text-xs font-medium text-center text-charcoal group-hover:text-forest transition-colors line-clamp-2">
                {getCatName(cat)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <div className="flex gap-1 bg-cream-dark rounded-xl p-1">
            <button className="px-4 py-2 rounded-lg bg-white text-sm font-medium text-forest shadow-sm">
              {t('bestsellers')}
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-soft hover:text-charcoal transition-colors">
              {t('new_products')}
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-gray-soft hover:text-charcoal transition-colors">
              {t('sale')}
            </button>
          </div>
          <Link href={`/${locale}/obchod`} className="flex items-center gap-1 text-sm text-forest font-medium hover:underline">
            {t('view_all')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {featuredProds.map(p => (
            <ProductCard key={p.id} product={p as Product} locale={locale} />
          ))}
        </div>
      </section>

      {/* Sale banner */}
      {saleProds.length > 0 && (
        <section className="bg-earth/10 border-y border-earth/20 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-charcoal">🏷️ {t('sale')}</h2>
              <Link href={`/${locale}/obchod?filtr=sleva`} className="flex items-center gap-1 text-sm text-forest font-medium hover:underline">
                {t('view_all')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {saleProds.map(p => (
                <ProductCard key={p.id} product={p as Product} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newProds.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-charcoal">✨ {t('new_products')}</h2>
            <Link href={`/${locale}/obchod?filtr=novinka`} className="flex items-center gap-1 text-sm text-forest font-medium hover:underline">
              {t('view_all')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {newProds.map(p => (
              <ProductCard key={p.id} product={p as Product} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* Blog / info strip */}
      <section className="bg-forest text-white py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/30 text-gold px-3 py-1 rounded-full text-xs font-medium mb-4">
              <BookOpen className="w-3.5 h-3.5" />
              Blog
            </div>
            <h2 className="text-2xl font-bold mb-3">{tBlog('home_title')}</h2>
            <p className="text-sage leading-relaxed">{tBlog('home_subtitle')}</p>
            <Link
              href={`/${locale}/blog`}
              className="inline-flex items-center gap-2 mt-6 bg-gold text-charcoal font-semibold px-5 py-2.5 rounded-xl hover:bg-gold-light transition-colors"
            >
              {tBlog('go_to_blog')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
