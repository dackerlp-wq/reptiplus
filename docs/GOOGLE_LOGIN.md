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

## 3) Aby Google ukazoval „Reptiplus“ místo `duaihkobtgfzprufqjmh.supabase.co`

Na obrazovce výběru účtu Google u neověřené aplikace zobrazuje doménu návratové adresy (Supabase). Název a logo
„Reptiplus“ se zobrazí až po **ověření značky** (brand verification) OAuth aplikace. Je zdarma, schválení trvá
typicky několik dní až 2 týdny. Žádá se jen o scopes `email`, `profile`, `openid`, takže jde o „non-sensitive“ ověření
bez bezpečnostního auditu.

Co web už splňuje: veřejná domovská stránka, Zásady ochrany osobních údajů (`/cs/ochrana-osobnich-udaju`),
Obchodní podmínky (`/cs/obchodni-podminky`), logo (`public/logo-google-120.png`, 120×120 px, PNG).

1. **Ověřit vlastnictví domény** — Google Search Console (https://search.google.com/search-console) → přidat
   *Doménu* `reptiplus.cz` (DNS TXT záznam u registrátora), případně i `reptiplus.eu` a `reptiplus.shop`.
   Alternativa „HTML tag“: hodnotu z meta tagu `google-site-verification` vložit ve Vercelu do env
   `GOOGLE_SITE_VERIFICATION` a redeploynout — layout ji vykreslí do `<head>`.
   Ověření musí udělat stejný Google účet, který vlastní projekt v Google Cloud.
2. **Google Cloud Console → APIs & Services → OAuth consent screen → Branding** vyplnit:
   - App name: `Reptiplus`
   - User support email: `info@reptiplus.cz`
   - App logo: nahrát `public/logo-google-120.png` (120×120 px, PNG; varianta s bílým pozadím `logo-google-120-white.png`)
   - Application home page: `https://reptiplus.cz`
   - Application privacy policy link: `https://reptiplus.cz/cs/ochrana-osobnich-udaju`
   - Application terms of service link: `https://reptiplus.cz/cs/obchodni-podminky`
   - Authorized domains: `reptiplus.cz` (+ `reptiplus.eu`, `reptiplus.shop`, pokud jsou ověřené v Search Console; `supabase.co` tam být nesmí — není vaše)
   - Developer contact: `info@reptiplus.cz`
3. **Audience → Publish app** (ze stavu *Testing* do *In production*). Hned po nahrání loga Google nabídne
   **Prepare for verification / Submit for verification** — projít průvodcem a odeslat. Zdůvodnění scopes:
   „Přihlášení zákazníků do e-shopu (e-mail a jméno pro zákaznický účet)“.
4. Stav sledovat v Google Cloud (Verification Center) a v e-mailu; Google si může vyžádat doplnění (typicky odkaz na
   zásady ochrany soukromí přímo z domovské stránky — v patičce už je).

Do schválení vše funguje, jen se na obrazovce Googlu zobrazuje doména Supabase. Po schválení se zobrazí
„Pokračovat do aplikace Reptiplus“ s logem. Pokud by Google i poté ukazoval doménu Supabase, zbývá vlastní doména
Supabase (Settings → Custom Domains, placený doplněk) a změna redirect URI na `https://auth.reptiplus.cz/auth/v1/callback`.

## Poznámky

- Zákazník přihlášený přes Google má e-mail od Google rovnou ověřený → hostovské objednávky se stejným e-mailem se k účtu připojí hned.
- Pokud už existuje účet s heslem na stejný e-mail, Supabase identity sloučí (výchozí nastavení *Automatic linking*) — zákazník se pak může přihlásit oběma způsoby.
- CSP v `next.config.ts` má v `form-action` povolené `https://*.supabase.co` a `https://accounts.google.com` (odeslání formuláře bez JS).
