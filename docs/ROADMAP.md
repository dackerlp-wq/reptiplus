# Reptiplus — Roadmapa dokončení e-shopu

Pracujeme krok za krokem shora dolů. Blog zatím odložen.
Značky: `[ ]` čeká · `[~]` rozpracováno · `[x]` hotovo.

## Fáze 1 — Administrace (základ provozu)
- [x] **1. Slevové kódy — admin CRUD** — hotovo: sekce /admin/discounts (seznam, vytvořit/upravit, %/pevná, platnost, limit, min. objednávka, aktivace/deaktivace, smazání).
- [ ] **2. Faktury / daňový doklad** — generování PDF a odeslání (ideálně napojení Fakturoid/iDoklad).
- [ ] **3. Zákazníci — admin** — seznam + hledání, detail (objednávky, útrata, role), export.

## Fáze 2 — Objednávky & pokladna (konverze)
- [ ] **4. Výdejní místa v pokladně** — widget Zásilkovna/PPL pobočka.
- [ ] **5a. Refundace / dobropis** — vrácení peněz přes Comgate (částečné i plné).
- [ ] **5b. Ruční vytvoření objednávky** z adminu (telefonická/na prodejně).
- [ ] **5c. Editace položek objednávky** po vytvoření.
- [ ] **5d. Štítky dopravce + hromadné podání zásilek** (ověřit stávající label route).

## Fáze 3 — SEO & marketing
- [ ] **6. SEO základ** — `sitemap.xml`, `robots.txt`, JSON-LD (Product/Offer/BreadcrumbList), meta description + OG obrázky.
- [ ] **7. Analytika** — GA4 / Sklik / Meta Pixel, načítané jen se souhlasem cookies (napojit na `getConsent`).
- [ ] **8. XML feed** — Heureka / Zboží.cz / Google Merchant.
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
