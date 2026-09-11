# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt

Reptiplus je e-shop s teraristickým vybavením (Next.js 16 App Router, React 19, Tailwind v4, Supabase, next-intl).
Kód, komentáře, commity i admin UI jsou česky. Roadmapa a stav funkcí: `docs/ROADMAP.md`.

Infrastruktura:
- GitHub `dackerlp-wq/reptiplus`, vývoj i push jde na `main`. Větve `claude/*` jsou starý kód a s `main` nesouvisí
  (`claude/wordpress-plugin-merge-hrc9po` drží nesouvisející WordPress plugin, nemazat). Repo `Reptiplus/reptiplus` je duplikát, ignorovat.
- Vercel: projekt `reptiplus` (`prj_9fSGoOlyRzybaaJv5g92puOknsnw`, tým `team_5syHQcguxaekOGMAp7ikxARv`), nasazuje automaticky po pushi na `main`.
  Domény `reptiplus.cz` / `.eu` / `.shop`. Cron `/api/cron/cleanup-carts` denně (`vercel.json`).
- Supabase: projekt „Reptiplus“ `duaihkobtgfzprufqjmh` (eu-west-1, Postgres 17). Storage bucket `products` pro obrázky.

## Příkazy

```bash
npm run dev      # next dev (port 3000)
npm run build    # next build — spouštět před pushem, Vercel build je jediná „CI“
npx tsc --noEmit # typecheck (nejrychlejší kontrola před pushem)
npm start
```

`npm run lint` je rozbité (`next lint` v Next 16 neexistuje, ESLint config chybí). Testy v projektu nejsou (viz roadmapa, bod 19).
Ověření změny = `npx tsc --noEmit` + `npm run build` + ruční kontrola. Build prerenderuje stránky proti Supabase, lokálně potřebuje `.env.local` s klíči.

Databáze: migrace jsou ručně psané SQL soubory v `supabase/migrations/` pojmenované `YYYYMMDD_NNNN_popis.sql`,
obalené `begin; … commit;`, idempotentní (`if not exists`, `create or replace`, `on conflict`).
Aplikují se na produkční projekt (Supabase MCP `apply_migration` nebo dashboard), žádný automatický deploy migrací neexistuje.
Po změně schématu přegenerovat `types/database.ts` (Supabase `generate_typescript_types` nebo `npx supabase gen types`).
Seed dat: `supabase/seed.sql`, `supabase/seed_admin.sql`.

## Architektura

### Routing a i18n
- `proxy.ts` (Next 16 náhrada middleware): URL bez prefixu jazyka přesměruje podle domény (`reptiplus.cz` → `cs`, `.eu`/`.shop` → `en`), jinak předá next-intl.
  Vynechává `/api`, `/_next`, soubory s příponou — proto jsou `app/feed/*.xml` a `app/api/*` mimo `[locale]`.
- Locales `cs`, `en`, `de` (`i18n/routing.ts`, `localePrefix: "always"`). UI texty v `messages/{cs,en,de}.json`, odkazy přes `Link` z `@/i18n/navigation`.
- Obsah z DB je i18n přes JSONB sloupce `*_i18n` (`{"cs":…, "en":…, "de":…}`); čeština je vždy základ, `pickI18n()` v `lib/i18n.ts` dělá fallback na `cs`.
  LEDX řady mají místo toho sloupec `translations` (`{"en": {...}, "de": {...}}`) a české texty v základních sloupcích.
- Měna se odvozuje z locale (`cs` → CZK, `en`/`de` → EUR), viz `localeCurrency` v `lib/i18n.ts`. Ceny jsou všude v minor units (haléře/centy) jako integer;
  DB drží oba sloupce `price_czk` / `price_eur`, EUR se v adminu dopočítává z kurzu ČNB (`lib/exchange-rate.ts`).

### Route groups
- `app/[locale]/(shop)/` — veřejný obchod (české slugy: `kategorie`, `produkt`, `kosik`, `pokladna`, `objednavka`, `ucet`, …). Layout přidává Navbar, Footer, cookie lištu a `AnalyticsGate`.
- `app/[locale]/admin/` — administrace, layout volá `requireAdmin()` (`lib/admin/auth.ts`): role `admin`/`staff` ze sloupce `customer.role`.
- `app/[locale]/faktura/[id]` — tisknutelný doklad (admin-only).
- `app/api/` — route handlers: `comgate/webhook` (platební PUSH), `cron/cleanup-carts` (chráněno `CRON_SECRET`), `admin/translate` (AI překlad), `admin/orders/*/label` (štítky PDF), `search`, `exchange-rate`.
- `app/feed/*.xml` — Heureka / Zboží / Google feed, `revalidate = 3600`; stejně `app/sitemap.ts`.

### Supabase klienti (tři, nezaměňovat)
- `lib/supabase/server.ts` `createClient()` — SSR klient s cookies, respektuje RLS. Server Components, Server Actions, route handlers. Zjištění identity uživatele **vždy** odtud (`auth.getUser()`), nikdy z klientských dat.
- `lib/supabase/service.ts` `createServiceClient()` — service role, obchází RLS, `server-only`. Admin mutace, Comgate webhook, hostový košík, validace slev, čtení `app_setting`.
- `lib/supabase/client.ts` — browser klient pro `'use client'` komponenty.

Všechny tabulky mají RLS zapnuté. Typy z DB: `types/database.ts` (generované, needitovat ručně).

### Datový tok
- Čtení pro shop: `lib/queries.ts` (produkty, kategorie, filtry), `lib/ledx/queries.ts`, `lib/reviews/queries.ts`.
- Mutace: Server Actions (`"use server"`), ne API routes. Admin: `lib/admin/actions.ts` (velký soubor, každá akce začíná `assertAdmin()`, po uložení `revalidatePath` + `flashRedirect()` pro toast),
  `lib/admin/shipping-actions.ts`. Shop: `lib/cart/actions.ts`, `lib/checkout/actions.ts`, `lib/auth/actions.ts`, `lib/reviews/actions.ts`, `lib/ledx/actions.ts`.
  Formuláře posílají `FormData`; i18n pole se čtou jako `name_cs` / `name_en` / `name_de` (helper `i18n(fd, base)`).
- Kritické DB operace jsou Postgres RPC (`security definer`): `place_order` (atomické odečtení skladu produktu/varianty + vytvoření objednávky), `admin_edit_order_items`, `cleanup_abandoned_carts`.
- Košík: cookie `rp_cart` + tabulky `cart`/`cart_item`; hostový košík se po přihlášení sloučí (`lib/cart/cart.ts`).
- Objednávka: `lib/checkout/actions.ts` → `place_order` → e-maily (`lib/email/templates.ts` přes nodemailer SMTP v `lib/email/client.ts`; bez SMTP env se e-mail tiše přeskočí) → případně Comgate platba (`lib/comgate/client.ts`); stav platby aktualizuje webhook. Číslo objednávky `RPyyMMdd-XXXX`.
- Doprava: `lib/shipping/` (Packeta = Zásilkovna, PPL) — tvorba zásilek a PDF štítky (`pdf-lib` slučuje hromadné štítky).

### Nastavení obchodu (`app_setting`)
Tabulka key/value JSONB, čtená přes `lib/settings.ts` service klientem. Klíče: `shop.general`, `appearance.theme`, `appearance.hero`,
`legal.terms|privacy|claims`, `content.about`, `integrations.comgate|ppl|zasilkovna|analytics|ai`, `ledx.page`.
Integrace (Comgate, PPL, Zásilkovna) berou přihlašovací údaje primárně z `app_setting`, s fallbackem na env.

### Vzhled
- Tailwind v4, design tokeny v `@theme` v `app/globals.css` (`forest`, `cream`, `gold`, `ink`, …). Barevné varianty webu přepínatelné v adminu:
  registr v `lib/themes.ts`, přepisy tokenů `html[data-theme="…"]` v `globals.css`, atribut se nastavuje v `app/[locale]/layout.tsx`. Klíče v obou souborech držet v souladu.
- Fonty přes `next/font` (Fraunces = display, Inter = sans, JetBrains Mono).
- CSP a bezpečnostní hlavičky jsou v `next.config.ts`; při přidání externího skriptu/iframe/endpointu je nutné rozšířit CSP.
- Rich text v adminu: TipTap (`components/admin/rich-editor.tsx`), obrázky se komprimují v prohlížeči (`lib/admin/image-compress.ts`) — proto `serverActions.bodySizeLimit: 6mb`.

### AI překlad v adminu
`POST /api/admin/translate` (jen admin/staff) překládá české texty do EN/DE přes Vercel AI SDK (`generateObject` + zod schéma sestavené z klíčů vstupu).
Výběr providera (`resolveModel()` v route): Anthropic API klíč z `app_setting` `integrations.ai.anthropicKey` (admin → Nastavení → AI překlady) nebo env `ANTHROPIC_API_KEY`
→ přímé volání přes `@ai-sdk/anthropic` (model `ANTHROPIC_MODEL`, výchozí `claude-haiku-4-5`). Bez klíče fallback na Vercel AI Gateway
(`AI_GATEWAY_MODEL`, výchozí `anthropic/claude-haiku-4.5`; klíč čte SDK implicitně z env `AI_GATEWAY_API_KEY`). Gateway ve free tieru modely Anthropic odmítá („Free tier users do not have access to this model“).
Klientský wrapper `lib/admin/translate-client.ts`, používají ho `lang-fields.tsx`, `ledx-line-form.tsx`, `ledx-content-form.tsx`. Chyby ze serveru se propisují uživateli, nepolykat je.

### Analytika a souhlas
`components/reptiplus/cookie-consent.tsx` ukládá volbu do cookie `rp_consent` a vysílá event `rp-consent-changed`; `AnalyticsGate` načte GA4 / Sklik / Meta Pixel až po souhlasu
(GA4 = analytické, Sklik + Pixel = marketingové), Consent Mode v2. E-commerce události v `lib/analytics/events.ts`. IDs se zadávají v adminu, ne v env.

## Env proměnné

Kód čte: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (kanonická doména pro SEO/sitemap),
`SMTP_HOST|PORT|USER|PASS`, `MAIL_FROM`, `SHOP_NOTIFY_EMAIL`, `CRON_SECRET`, `RATE_LIMIT_SALT`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_GATEWAY_API_KEY` (implicitně), `AI_GATEWAY_MODEL`,
fallbacky `COMGATE_MERCHANT|SECRET|TEST`, `PPL_CLIENT_ID|SECRET`, `PACKETA_API_PASSWORD|ESHOP_ID|HOME_CARRIER_ID`. Nastavují se ve Vercelu, lokálně `.env.local` (gitignored).

## Konvence

- Nové stránky patří pod `app/[locale]/…` a musí v `generateMetadata` používat `localizedAlternates()` z `lib/seo.ts` (canonical + hreflang); JSON-LD přes `components/seo/json-ld.tsx`.
- Vše, co obchází RLS nebo drží tajemství, importuje `"server-only"`.
- Toasty v adminu: přesměrování s `?flash=saved|error&msg=…`, komponenta `components/admin/toast.tsx`.
- Formuláře na veřejném webu proti spamu: honeypot + časová past + rate limit přes hash IP (viz `lib/ledx/actions.ts`).
- Složka `Claude outputs/` obsahuje screenshoty z předchozích sezení, není součástí aplikace.
