import { NextResponse, type NextRequest } from "next/server";
import { searchSuggestions } from "@/lib/queries";
import { formatPrice } from "@/lib/i18n";
import { routing, type Locale } from "@/i18n/routing";

// Lehké návrhy pro našeptávač ve vyhledávání (veřejné, jen publikované produkty).
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const raw = request.nextUrl.searchParams.get("locale") ?? routing.defaultLocale;
  const locale: Locale = (routing.locales as readonly string[]).includes(raw)
    ? (raw as Locale)
    : routing.defaultLocale;

  const suggestions = await searchSuggestions(locale, q, 6);
  return NextResponse.json({
    items: suggestions.map((s) => ({
      slug: s.slug,
      name: s.name,
      imageUrl: s.imageUrl,
      priceLabel: formatPrice(s.price, locale),
    })),
  });
}
