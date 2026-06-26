'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Mail, Phone, MapPin } from 'lucide-react'

const categories = [
  { slug: 'osvetleni', cs: 'Osvětlení' },
  { slug: 'vyhrivani', cs: 'Vyhřívání' },
  { slug: 'terraria', cs: 'Terária' },
  { slug: 'krmivo', cs: 'Krmivo' },
  { slug: 'vitaminy', cs: 'Vitamíny & doplňky' },
  { slug: 'dekorace', cs: 'Dekorace' },
]

export default function Footer({ locale }: { locale: string }) {
  const t = useTranslations('footer')

  return (
    <footer className="bg-forest text-white mt-auto">
      {/* Newsletter */}
      <div className="bg-forest-dark py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-4">
          <div>
            <h3 className="font-bold text-lg">{t('newsletter_title')}</h3>
            <p className="text-sage text-sm mt-1">{t('newsletter_desc')}</p>
          </div>
          <form className="flex gap-2 ml-auto" onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const email = fd.get('email') as string
            if (!email) return
            await fetch('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } })
            ;(e.target as HTMLFormElement).reset()
          }}>
            <input
              name="email"
              type="email"
              required
              placeholder={t('newsletter_placeholder')}
              className="bg-forest/50 border border-forest-light rounded-lg px-4 py-2 text-sm text-white placeholder-sage focus:outline-none focus:border-gold w-64"
            />
            <button type="submit" className="bg-gold text-charcoal font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gold-light transition-colors">
              {t('newsletter_submit')}
            </button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gold flex items-center justify-center">
              <span className="text-charcoal font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-xl">Reptiplus</span>
          </div>
          <p className="text-sage text-sm leading-relaxed">{t('about_text')}</p>
          <div className="flex gap-3 mt-4">
            <a href="#" className="text-sage hover:text-gold transition-colors text-sm font-medium">Facebook</a>
            <a href="#" className="text-sage hover:text-gold transition-colors text-sm font-medium">Instagram</a>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-semibold mb-4 text-gold">{t('links')}</h4>
          <ul className="space-y-2 text-sm text-sage">
            <li><Link href={`/${locale}/obchod`} className="hover:text-white transition-colors">{t('links')}</Link></li>
            <li><Link href={`/${locale}/blog`} className="hover:text-white transition-colors">Blog</Link></li>
            <li><Link href={`/${locale}/kosik`} className="hover:text-white transition-colors">Košík</Link></li>
            <li><Link href={`/${locale}/ucet`} className="hover:text-white transition-colors">Účet</Link></li>
            <li><Link href={`/${locale}/podminky`} className="hover:text-white transition-colors">{t('terms')}</Link></li>
            <li><Link href={`/${locale}/soukromi`} className="hover:text-white transition-colors">{t('privacy')}</Link></li>
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 className="font-semibold mb-4 text-gold">{t('categories')}</h4>
          <ul className="space-y-2 text-sm text-sage">
            {categories.map(cat => (
              <li key={cat.slug}>
                <Link href={`/${locale}/obchod?kategorie=${cat.slug}`} className="hover:text-white transition-colors">
                  {cat.cs}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-4 text-gold">{t('contact')}</h4>
          <ul className="space-y-3 text-sm text-sage">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" />
              <a href="mailto:info@reptiplus.cz" className="hover:text-white transition-colors">info@reptiplus.cz</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 shrink-0" />
              <a href="tel:+420123456789" className="hover:text-white transition-colors">+420 123 456 789</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Praha, Česká republika</span>
            </li>
          </ul>
          <div className="mt-4 p-3 bg-forest-light/30 rounded-lg text-xs text-sage">
            <p className="font-medium text-white mb-1">{t('payment_methods')}</p>
            <p>{t('payment_methods_desc')}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-forest-light/30 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-sage">
          <span>© {new Date().getFullYear()} Reptiplus. {t('rights')}</span>
          <div className="flex gap-4">
            <Link href={`/${locale}/podminky`} className="hover:text-white transition-colors">{t('terms')}</Link>
            <Link href={`/${locale}/soukromi`} className="hover:text-white transition-colors">{t('privacy')}</Link>
            <Link href={`/${locale}/cookies`} className="hover:text-white transition-colors">{t('cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
