import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextRequest, NextResponse } from 'next/server'

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Admin protection
  if (pathname.startsWith('/cs/admin') || pathname.startsWith('/en/admin') || pathname.startsWith('/de/admin')) {
    const session = request.cookies.get('session')
    if (!session) {
      const locale = pathname.split('/')[1]
      return NextResponse.redirect(new URL(`/${locale}/prihlaseni`, request.url))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
