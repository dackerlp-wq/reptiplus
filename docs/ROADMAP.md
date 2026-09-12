# Reptiplus — Roadmapa dokončení e-shopu

Pracujeme krok za krokem shora dolů. Blog zatím odložen.
Značky: `[ ]` čeká · `[~]` rozpracováno · `[x]` hotovo.

## Fáze 1 — Administrace (základ provozu)
- [x] **1. Slevové kódy — admin CRUD** — hotovo: sekce /admin/discounts (seznam, vytvořit/upravit, %/pevná, platnost, limit, min. objednávka, aktivace/deaktivace, smazání).
- [x] **2. Faktury / daňový doklad** — nahrazeno plnohodnotnou fakturací v bodě 8d (PDF, číselné řady, dobropisy, příloha e-mailu, doklad v účtu).
- [x] **3. Zákazníci — admin** — hotovo: /admin/customers (seznam, hledání, řazení, počet objednávek + útrata), detail (objednávky, adresy, kontakt, změna role). TODO později: export CSV.

## Fáze 2 — Objednávky & pokladna (konverze)
- [x] **4. Výdejní místa v pokladně** — widget Zásilkovna (Packeta) v pokladně; metoda dopravy s příznakem „výdejní místo“ v adminu spustí widget, výběr se uloží do objednávky.
- [x] **5a. Refundace / dobropis** — částečné i plné vrácení; Comgate přes API, dobírka/převod ruční evidence; plná vratka přepne stav na „Vrácená".
- [x] **5b. Ruční vytvoření objednávky** z adminu (/admin/orders/new) — výběr produktů, adresy, doprava/platba, sleva, volitelné „zaplaceno" + potvrzovací e-mail.
- [x] **5c. Editace položek objednávky** po vytvoření — inline editor (množství, cena, přidat/odebrat) přes atomický RPC s korekcí skladu a přepočtem součtů.
- [x] **5d. Štítky dopravce + hromadné podání zásilek** — hromadné vytvoření zásilek + sloučené PDF štítků pro vybrané objednávky.

## Fáze 3 — SEO & marketing
- [x] **6. SEO základ** — `sitemap.xml` (i18n hreflang), `robots.txt`, JSON-LD (Product/Offer/AggregateOffer/AggregateRating, BreadcrumbList, Organization, WebSite+SearchAction), canonical + hreflang alternates, meta descriptions, OG obrázky (produkt = jeho foto, jinak brandovaný default). Pozn.: na Vercelu nastavit `NEXT_PUBLIC_SITE_URL` na hlavní doménu.
- [x] **7. Analytika** — GA4 / Sklik / Meta Pixel přes `<AnalyticsGate/>`, načítané jen po souhlasu (GA4=analytické, Sklik+Pixel=marketingové), reaguje na změnu souhlasu + SPA pageview. IDs se zadávají v adminu (Nastavení → Integrace → Analytika & marketing). Ověřeno: bez souhlasu se nenačte nic, po souhlasu se GA4 načte.
- [x] **7b. E-commerce události + Consent Mode v2** — view_item, add_to_cart, begin_checkout, purchase (GA4 + Meta Pixel ekvivalenty), purchase s dedupe. Consent Mode v2 signály (analytics/ad_storage/ad_user_data/ad_personalization) dle kategorií souhlasu. Vše ověřeno v prohlížeči.
- [x] **8. XML feed** — `/feed/heureka.xml`, `/feed/zbozi.xml`, `/feed/google.xml` (RSS+g:). Varianty jako samostatné položky s ITEMGROUP_ID/item_group_id, kategorie jako cesta, ceny CZK vč. DPH, dostupnost dle skladu, EAN/SKU když jsou. Cache 1 h. Ověřeno well-formed + obsah.
- [x] **8b. Profi osvětlení LEDX — dokončení** — vlastní URL pro každou řadu (`/kategorie/profi-osvetleni/[slug]`, meta, hreflang, breadcrumbs, sitemap, přesměrování starých `#slug` odkazů), opravené CTA kotvy, statistiky + reference editovatelné v adminu (LEDX řady → Statistiky a reference), EN/DE překlady (UI v messages, obsah řad v adminu s AI překladem), poptávky: potvrzovací e-mail zákazníkovi v jeho jazyce, honeypot + časová past + rate limit (hash IP / e-mail), jazyk poptávky v adminu, odznak nevyřízených v menu. Migrace `20260910_0001_ledx_i18n_antispam.sql`.
- [x] **8c. Poptávky LEDX — vyřizování v adminu** — stavy (Nová → V řešení → Nabídka odeslána → Objednáno / Zamítnuto / Zrušeno), seznam s filtry (stav, řada, jazyk, hledání), zvýraznění po lhůtě 2 pracovních dnů a follow-up termínů, detail poptávky (nabídka: částka/měna/platnost/číslo, datum dalšího kontaktu, interní poznámky, historie událostí), e-maily zákazníkovi z adminu v jeho jazyce s editovatelnou šablonou (nabídka, doplňující dotaz, potvrzení objednání, zrušení), bankovní spojení v Nastavení, GDPR anonymizace/smazání, export CSV. Migrace `20260911_0001_ledx_inquiry_workflow.sql`.
- [x] **8d. E-maily a fakturace** — objednávka si ukládá jazyk zákazníka (`order.locale`), všechny e-maily jdou v něm. Potvrzení objednávky s platebními údaji pro převod (účet/IBAN/BIC z Nastavení, VS odvozený z čísla objednávky), názvem dopravy/platby, poznámkou a fakturační adresou; notifikace obchodu s telefonem, poznámkou a odkazem do adminu. Nové e-maily: platba přijata (Comgate webhook i admin) s PDF faktury, zásilka odeslána se sledovacím odkazem (automaticky při vytvoření štítku; u dobírky s fakturou), vrácení peněz s dobropisem, vlastní zpráva z detailu objednávky (šablony: zpoždění, dotaz, reklamace, vyzvednutí). Historie objednávky (`order_event`). **Fakturace:** vlastní číselné řady po rocích (FV2026-0001 / D2026-0001, nastavitelné), sazba DPH na produktu (21/12/0, snapshot na položce), rozpis DPH po sazbách, sleva poměrně, EUR doklady s přepočtem DPH kurzem ČNB, PDF přes pdf-lib (Liberation Sans), automatické vystavení po zaplacení / při odeslání dobírky, dobropis při refundaci, ruční vystavení i dobropis v adminu, seznam faktur s CSV exportem pro účetní, doklady ke stažení na stránce objednávky a v účtu. Auth e-maily: trojjazyčné šablony v `supabase/templates/` + návod `docs/SUPABASE_AUTH_EMAILS.md`. Migrace `20260912_0001`, `20260912_0002`.
- [x] **9. Newsletter** — double opt-in (potvrzovací e-mail s tokenem), po potvrzení uvítací e-mail s jednorázovým kódem (výchozí 100 Kč od 1 000 Kč, 30 dní; nastavitelné v Nastavení → Obchod, EUR přepočet kurzem ČNB), odhlášení odkazem, přihlášení i z účtu. Admin `/admin/newsletter` (potvrzení / čekající / odhlášení, hledání, odhlásit, smazat) + CSV export pro rozesílku (Ecomail apod. — přímé API napojení zatím ne). Migrace `20260912_0004`.
- [x] **9b. Kontaktní stránka** — `/kontakt`: údaje obchodu, IČO/DIČ, otevírací doba (Nastavení → Obchod), formulář (jméno, e-mail, telefon, číslo objednávky, předmět, zpráva, GDPR) s antispamem; e-mail obchodu (reply-to zákazník) + potvrzení zákazníkovi; zpráva k objednávce se zapíše do její historie. Odkazy v hlavičce, patičce a sitemapě.
- [x] **9c. Doprava zdarma od částky** — Nastavení → Doprava (Kč / €), pokladna účtuje 0 (server), lišta „do dopravy zdarma zbývá …“ v košíku.
- [x] **9d. Storno nezaplacených karetních objednávek** — cron `/api/cron/cancel-unpaid` denně 03:30 UTC: objednávky Comgate ve stavu nová / nezaplaceno starší 24 h → RPC `cancel_unpaid_order` (vrátí sklad, stav zrušená, platba failed), záznam do historie, e-mail zákazníkovi.
- [x] **9e. Stránky 404 a chyb** — přeložená 404 v layoutu obchodu, `error.tsx` s tlačítkem Zkusit znovu, `global-error.tsx`. ESLint opraven (`npm run lint`, ESLint 9 + eslint-config-next).

## Fáze 4 — Sklad & dashboard
- [ ] **10. Sklad** — import z CSV, e-mail upozornění na docházející sklad, historie pohybů, hromadná úprava.
- [ ] **11. Dashboard** — grafy tržeb v čase, průměrná hodnota objednávky, konverze, nejprodávanější, opuštěné košíky.

## Fáze 5 — Zákazník / UX
- [x] **12. Oblíbené (wishlist)** — srdíčko na kartě i v detailu (`components/reptiplus/wishlist-button.tsx`, ID přes `/api/wishlist`), seznam v účtu.
- [x] **13. Účet zákazníka** — sekce Přehled / Objednávky / Adresy / Oblíbené / Recenze / Profil (`app/[locale]/(shop)/ucet/*`, `lib/account/*`). Adresy s firemními údaji (IČO/DIČ) a výchozí adresou, předvyplnění a uložení adresy v pokladně, přepínač „Nakupuji na firmu“. Detail objednávky s průběhem, sledováním zásilky, doklady a „Objednat znovu“. Profil: jméno, telefon, změna hesla, změna e-mailu (s potvrzením), newsletter, smazání účtu (GDPR — objednávky a doklady zůstanou anonymizované). Hostovské objednávky se stejným ověřeným e-mailem se při přihlášení připojí k účtu. Migrace `20260912_0003`.
- [x] **14. „Naskladnit — upozornit mě"** — formulář u vyprodaného produktu/varianty (`stock_alert`), e-mail po naskladnění z adminu (`lib/stock-alerts/notify.ts`).
- [ ] **15. Recenze+** — ověřený nákup, odpověď obchodu, fotky.

## Fáze 6 — Provoz / technika
- [ ] **16. Monitoring chyb** (Sentry).
- [ ] **17. Opuštěný košík** — recovery e-mail.
- [ ] **18. Audit log adminu** — kdo/kdy co změnil.
- [ ] **19. Automatické testy** klíčových toků.

## Odloženo
- Blog / Průvodce chovem (tabulka `article` existuje; odkaz zatím z menu skrýt, nebo dodělat později).
