import type { Metadata } from 'next'
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Toaster } from '@/components/ui/Toaster'
import '../globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', axes: ['opsz'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: {
    template: '%s | Reptiplus',
    default: 'Reptiplus — Teraristický obchod',
  },
  description: 'Specializovaný obchod s teraristickým vybavením pro chovatele plazů a exotických zvířat.',
  keywords: ['teraristika', 'plazi', 'terárium', 'UVB', 'osvětlení', 'krmivo'],
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as 'cs' | 'en' | 'de')) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} className="h-full scroll-smooth">
      <body className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${inter.className} min-h-full flex flex-col bg-cream text-charcoal antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Navbar locale={locale} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
