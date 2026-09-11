# Reptiplus — Roadmapa dokončení e-shopu

Pracujeme krok za krokem shora dolů. Blog zatím odložen.
Značky: `[ ]` čeká · `[~]` rozpracováno · `[x]` hotovo.

## Fáze 1 — Administrace (základ provozu)
- [x] **1. Slevové kódy — admin CRUD** — hotovo: sekce /admin/discounts (seznam, vytvořit/upravit, %/pevná, platnost, limit, min. objednávka, aktivace/deaktivace, smazání).
- [x] **2. Faktury / daňový doklad** — tisknutelný doklad (/faktura/[id], admin-only) → Tisk/Uložit PDF; identifikace dodavatele, odběratel, položky, DPH (pokud plátce). TODO později: automatická PDF příloha do e-mailu + doklad pro zákazníka v účtu.
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
- [ ] **9. Newsletter** — napojení Ecomail + jednorázová sleva 100 Kč za přihlášení + admin odběratelů.

## Fáze 4 — Sklad & dashboard
- [ ] **10. Sklad** — import z CSV, e-mail upozornění na docházející sklad, historie pohybů, hromadná úprava.
- [ ] **11. Dashboard** — grafy tržeb v čase, průměrná hodnota objednávky, konverze, nejprodávanější, opuštěné košíky.

## Fáze 5 — Zákazník / UX
- [ ] **12. Oblíbené (wishlist)** — UI (tabulka `wishlist_item` existuje).
- [ ] **13. Účet zákazníka** — správa adres, znovuobjednání, faktury ke stažení.
- [ ] **14. „Naskladnit — upozornit mě"** u vyprodaných.
- [ ] **15. Recenze+** — ověřený nákup, odpověď obchodu, fotky.

## Fáze 6 — Provoz / technika
- [ ] **16. Monitoring chyb** (Sentry).
- [ ] **17. Opuštěný košík** — recovery e-mail.
- [ ] **18. Audit log adminu** — kdo/kdy co změnil.
- [ ] **19. Automatické testy** klíčových toků.

## Odloženo
- Blog / Průvodce chovem (tabulka `article` existuje; odkaz zatím z menu skrýt, nebo dodělat později).
