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
- `app/api/` — route handlers: `comgate/webhook` (platební PUSH), `cron/cleanup-carts` (chráněno `CRON_SECRET`), `admin/translate` (AI překlad), `admin/orders/*/label` (štítky PDF), `invoices/[id]` (PDF dokladu), `admin/invoices/export`, `admin/inquiries/export`, `wishlist` (ID oblíbených), `search`, `exchange-rate`.
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
- Objednávka: `lib/checkout/actions.ts` → `place_order` (ukládá `locale`, názvy položek vč. varianty, `vat_rate`) → `sendOrderConfirmation()` → případně Comgate platba (`lib/comgate/client.ts`); zaplacení řeší webhook přes `markOrderPaid()`. Bez SMTP env se e-maily tiše přeskočí. Číslo objednávky `RPyyMMdd-XXXX`.
- Doprava: `lib/shipping/` (Packeta = Zásilkovna, PPL) — tvorba zásilek a PDF štítky (`pdf-lib` slučuje hromadné štítky).

### E-maily objednávek a historie
- Odesílání: `lib/email/client.ts` (`sendMail`, podporuje přílohy; odesílatel „Reptiplus <MAIL_FROM>"). Šablony v `lib/email/templates.ts` (cs/en/de podle `order.locale`,
  staré objednávky bez locale podle měny přes `orderLocale()` v `lib/orders/notify.ts`).
- Toky (vše `server-only`, nikdy nevyhazují, logují do `order_event` přes `lib/orders/events.ts`):
  `lib/orders/confirmation.ts` (potvrzení + notifikace obchodu, platební údaje pro převod, VS z `lib/orders/vs.ts`),
  `lib/orders/payment.ts` `markOrderPaid()` (Comgate webhook i admin → zaplaceno + faktura + e-mail s PDF; idempotentní),
  `lib/orders/shipment.ts` `afterShipmentCreated()` (po štítku: e-mail se sledováním, u dobírky vystaví fakturu),
  `lib/orders/refund.ts` `afterRefund()` (dobropis + e-mail), `lib/orders/notify.ts` `sendOrderStatusEmail()` (stavy paid/processing/shipped/delivered/cancelled).
- Vlastní zpráva z adminu: šablony `lib/orders/message-drafts.ts`, editor `components/admin/order-email-composer.tsx`, akce `lib/admin/order-actions.ts`.
- Změna stavu platby na „paid" v adminu **vždy** jde přes `markOrderPaid`, ne přímým update (jinak nevznikne faktura).

### Fakturace (`invoice`, `invoice_counter`)
- Výpočet: `lib/invoices/calc.ts` (čisté funkce; ceny vč. DPH → základ = cena/(1+sazba); sleva poměrně po položkách; doprava a poplatek 21 %).
  Sazba DPH je na produktu (`product.vat_rate` 0/12/21) a snapshotem na `order_item.vat_rate` (plní RPC `place_order` a `admin_edit_order_items`).
- Vystavení: `lib/invoices/issue.ts` — `issueInvoiceForOrder()` (idempotentní, jedna faktura na objednávku), `issueCreditNoteForRefund()` (dobropis poměrně
  po sazbách původní faktury), číslo přes RPC `next_invoice_number(series, year)` + prefix z `app_setting` `invoices.settings` (`getInvoiceSettings()`).
  Doklad je neměnný snapshot (seller/buyer/items/vat_breakdown v JSONB); plátcovství DPH = vyplněné DIČ v `shop.general`; EUR doklady mají kurz ČNB a DPH v CZK.
- PDF: `lib/invoices/pdf.ts` (pdf-lib + fontkit, fonty `public/fonts/LiberationSans-*.ttf` kvůli diakritice; jazyk podle `buyer.locale`).
  Download `app/api/invoices/[id]` (admin, vlastník, nebo `?o=<číslo objednávky>` z e-mailu). E-mail s PDF: `lib/invoices/email.ts`.
- Admin: `app/[locale]/admin/invoices` (+ CSV export `app/api/admin/invoices/export`), karta Doklady v detailu objednávky, akce `lib/admin/invoice-actions.ts`,
  nastavení řady v Nastavení → Fakturace. Zákazník: odkazy na stránce objednávky a v účtu (RLS `invoice owner read`).
- Přihlašovací e-maily (registrace, reset hesla) posílá Supabase Auth: šablony `supabase/templates/*.html`, postup `docs/SUPABASE_AUTH_EMAILS.md`.

### Nastavení obchodu (`app_setting`)
Tabulka key/value JSONB, čtená přes `lib/settings.ts` service klientem. Klíče: `shop.general`, `appearance.theme`, `appearance.hero`,
`legal.terms|privacy|claims`, `content.about`, `integrations.comgate|ppl|zasilkovna|analytics|ai`, `ledx.page`, `invoices.settings`.
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

### Poptávky LEDX (`ledx_inquiry`)
Formulář `components/reptiplus/ledx/inquiry-form.tsx` → `lib/ledx/actions.ts` (antispam, uložení, potvrzení zákazníkovi + notifikace obchodu).
Stavy `new → in_progress → quoted → won | lost | cancelled` (konstanty, štítky a pomocné funkce v `lib/ledx/inquiry-status.ts`, bez `server-only`);
sloupec `handled` drží DB trigger jen kvůli zpětné kompatibilitě, kód ho nečte. Historie v `ledx_inquiry_event` (note/status/email/quote/follow_up/system).
Admin: seznam `app/[locale]/admin/inquiries` (filtry přes GET searchParams), detail `[id]` (nabídka, follow-up, poznámky, historie, GDPR),
akce v `lib/admin/inquiry-actions.ts` (každá loguje událost přes `logEvent`). E-maily z adminu: návrhy textu v jazyce zákazníka generuje
`lib/ledx/inquiry-drafts.ts`, editor `components/admin/inquiry-email-composer.tsx`, odeslání `sendInquiryEmailAction` → `ledxInquiryMessageEmail()`
(prostý text → HTML, odstavce oddělené prázdným řádkem, řádky „– “ jako odrážky). Bankovní spojení pro potvrzení objednání je v `shop.general` (`bankAccount`, `iban`, `bic`).
Export CSV: `app/api/admin/inquiries/export/route.ts`.

### Zákaznický účet (`app/[locale]/(shop)/ucet/*`)
- Layout volá `requireCustomer()` (`lib/account/queries.ts`): bez přihlášení redirect na `/prihlaseni`, zároveň `linkGuestOrders()` (`lib/account/link-orders.ts`)
  připojí hostovské objednávky se stejným e-mailem — **jen pokud má účet ověřený e-mail**. Podstránky: `objednavky`, `adresy`, `oblibene`, `recenze`, `profil`.
- Akce v `lib/account/actions.ts` (Server Actions se stavem pro `useActionState`; klientské formuláře v `components/reptiplus/account/*`).
  Adresy a oblíbené jdou přes SSR klienta (RLS owner), recenze zákazníka a newsletter přes service klienta. Smazání účtu anonymizuje objednávky
  (e-mail, jméno, ulice, telefon) a smaže auth uživatele přes `auth.admin.deleteUser`; doklady (`invoice`) zůstávají netknuté (zákonná archivace).
- Pokladna: `CheckoutForm` dostává `savedAddresses` + `loggedIn`; výběr uložené adresy remountuje `AddressFields` přes `key`; firemní údaje
  (`billing_company|ico|dic`) se ukládají do `billing_address` JSONB (i když je shodná s dodací) a propisují na fakturu (`buyerParty()`).
- Oblíbené: `WishlistButton` (client) načte ID jednou přes `/api/wishlist` (modulová cache), toggle přes `toggleWishlistAction`; nepřihlášený → `/prihlaseni?redirectTo=`.
- Hlídání skladu: `StockAlertForm` u vyprodaného produktu/varianty → `stock_alert` (service role, honeypot, unikát product+variant+email);
  `notifyStockAlerts(productId)` v `lib/stock-alerts/notify.ts` se volá po uložení produktu a inline změně skladu v adminu.
- Přihlášení: `/prihlaseni?redirectTo=/cs/...` (jen relativní cesty), po přihlášení se sloučí hostův košík a připojí objednávky.

### Analytika a souhlas
`components/reptiplus/cookie-consent.tsx` ukládá volbu do cookie `rp_consent` a vysílá event `rp-consent-changed`; `AnalyticsGate` načte GA4 / Sklik / Meta Pixel až po souhlasu
(GA4 = analytické, Sklik + Pixel = marketingové), Consent Mode v2. E-commerce události v `lib/analytics/events.ts`. IDs se zadávají v adminu, ne v env.

## Env proměnné

Kód čte: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (kanonická doména pro SEO/sitemap),
`SMTP_HOST|PORT|USER|PASS`, `MAIL_FROM`, `MAIL_FROM_NAME`, `SHOP_NOTIFY_EMAIL`, `CRON_SECRET`, `RATE_LIMIT_SALT`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_GATEWAY_API_KEY` (implicitně), `AI_GATEWAY_MODEL`,
fallbacky `COMGATE_MERCHANT|SECRET|TEST`, `PPL_CLIENT_ID|SECRET`, `PACKETA_API_PASSWORD|ESHOP_ID|HOME_CARRIER_ID`. Nastavují se ve Vercelu, lokálně `.env.local` (gitignored).

## Konvence

- Nové stránky patří pod `app/[locale]/…` a musí v `generateMetadata` používat `localizedAlternates()` z `lib/seo.ts` (canonical + hreflang); JSON-LD přes `components/seo/json-ld.tsx`.
- Vše, co obchází RLS nebo drží tajemství, importuje `"server-only"`.
- Toasty v adminu: přesměrování s `?flash=saved|error&msg=…`, komponenta `components/admin/toast.tsx`.
- Formuláře na veřejném webu proti spamu: honeypot + časová past + rate limit přes hash IP (viz `lib/ledx/actions.ts`).
- Složka `Claude outputs/` obsahuje screenshoty z předchozích sezení, není součástí aplikace.
