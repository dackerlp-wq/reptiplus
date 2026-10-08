# Přihlášení přes Google (Supabase Auth)

Tlačítko „Pokračovat přes Google“ je na stránkách Přihlášení a Registrace (`components/reptiplus/auth-form.tsx`).
Kód: `signInWithGoogleAction` v `lib/auth/actions.ts` (přesměruje na Google přes Supabase, PKCE) → návrat na
`app/api/auth/callback/route.ts` (výměna kódu za session, doplnění jména do profilu, sloučení hostova košíku,
připojení dřívějších hostovských objednávek) → `redirectTo`.

Bez nastavení níže tlačítko skončí chybou „Přihlášení přes Google se nezdařilo“.

## 1) Google Cloud Console

1. https://console.cloud.google.com → projekt (např. „Reptiplus“) → **APIs & Services → OAuth consent screen**:
   typ *External*, název aplikace „Reptiplus“, e-mail podpory, domény `reptiplus.cz`, `reptiplus.eu`, `reptiplus.shop`, logo (nepovinné).
   Scopes stačí výchozí (`email`, `profile`, `openid`). Po otestování publikovat (*Publish app*), jinak se přihlásí jen testovací účty.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**, typ *Web application*:
   - Authorized JavaScript origins: `https://reptiplus.cz`, `https://reptiplus.eu`, `https://reptiplus.shop`
   - Authorized redirect URIs: `https://duaihkobtgfzprufqjmh.supabase.co/auth/v1/callback`
3. Zkopírovat **Client ID** a **Client secret**.

## 2) Supabase dashboard (projekt Reptiplus `duaihkobtgfzprufqjmh`)

1. **Authentication → Sign In / Providers → Google**: *Enable*, vložit Client ID + Client secret, uložit.
2. **Authentication → URL Configuration**:
   - Site URL: `https://reptiplus.cz`
   - Redirect URLs (každá zvlášť):
     `https://reptiplus.cz/api/auth/callback`, `https://reptiplus.eu/api/auth/callback`, `https://reptiplus.shop/api/auth/callback`,
     `http://localhost:3000/api/auth/callback` (vývoj).

## Poznámky

- Zákazník přihlášený přes Google má e-mail od Google rovnou ověřený → hostovské objednávky se stejným e-mailem se k účtu připojí hned.
- Pokud už existuje účet s heslem na stejný e-mail, Supabase identity sloučí (výchozí nastavení *Automatic linking*) — zákazník se pak může přihlásit oběma způsoby.
- CSP v `next.config.ts` má v `form-action` povolené `https://*.supabase.co` a `https://accounts.google.com` (odeslání formuláře bez JS).
