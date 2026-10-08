import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { mergeGuestCartOnLogin } from "@/lib/cart/cart";
import { linkGuestOrders } from "@/lib/account/link-orders";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/** Jen relativní cesta na vlastním webu (žádné open redirecty). */
function safeNext(raw: string | null, fallback: string): string {
  return raw && /^\/[^/\\]/.test(raw) ? raw : fallback;
}

/**
 * Návrat z OAuth (Google) přes Supabase Auth: vymění `code` za session (cookie),
 * doplní jméno do profilu, sloučí hostův košík a připojí dřívější hostovské
 * objednávky. Je mimo `[locale]`, aby ho proxy nepřesměrovávala.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const localeMatch = next?.match(/^\/([a-z]{2})(\/|$)/);
  const locale =
    localeMatch && (routing.locales as readonly string[]).includes(localeMatch[1])
      ? localeMatch[1]
      : routing.defaultLocale;
  const target = safeNext(next, `/${locale}/ucet`);
  const failure = `${url.origin}/${locale}/prihlaseni?error=oauth&redirectTo=${encodeURIComponent(target)}`;

  if (!code) return NextResponse.redirect(failure);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(failure);

  const user = data.user;
  try {
    // Jméno z Google profilu do zákaznického profilu (jen pokud chybí).
    const meta = user.user_metadata as { full_name?: string; name?: string } | null;
    const name = (meta?.full_name || meta?.name || "").trim();
    if (name) {
      const svc = createServiceClient();
      const { data: profile } = await svc.from("customer").select("full_name").eq("id", user.id).maybeSingle();
      if (profile && !profile.full_name) {
        await svc.from("customer").update({ full_name: name }).eq("id", user.id);
      }
    }
    await mergeGuestCartOnLogin(user.id);
    await linkGuestOrders(user);
  } catch (e) {
    console.error("[auth] dokončení OAuth přihlášení selhalo:", e);
  }

  return NextResponse.redirect(`${url.origin}${target}`);
}
