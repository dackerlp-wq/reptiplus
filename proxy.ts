import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing, type Locale } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Doména určuje VÝCHOZÍ jazyk (bare / bez prefixu). Přepínač pak umí kterýkoli.
function defaultLocaleForHost(host: string): Locale {
  const h = host.toLowerCase();
  if (h.includes("reptiplus.cz")) return "cs";
  if (h.includes("reptiplus.eu") || h.includes("reptiplus.shop")) return "en";
  return routing.defaultLocale; // dev / localhost
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocalePrefix = routing.locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  if (!hasLocalePrefix) {
    const locale = defaultLocaleForHost(request.headers.get("host") ?? "");
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  // Vše kromě api, next interních assetů a souborů s příponou
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
