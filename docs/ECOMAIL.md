# Napojení na Ecomail

Kód: `lib/ecomail/client.ts` (API v2, https://docs.ecomail.cz/api-reference), `lib/ecomail/sync.ts` (co a kdy se posílá, nikdy nevyhazuje),
webhook `app/api/ecomail/webhook/route.ts`, admin akce `lib/admin/ecomail-actions.ts`. Nastavení v `app_setting` `integrations.ecomail`.

## 1) Nastavení v adminu (Nastavení → Integrace → Ecomail)

1. V Ecomailu: **Správa účtu → Integrace → API** → zkopírovat API klíč.
2. V Ecomailu: **Kontakty → Seznamy** → ID seznamu, do kterého se mají kontakty ukládat (číslo v URL nebo v detailu seznamu). Seznam by měl mít
   **vypnutý double opt-in** v Ecomailu — potvrzení řeší náš web, kontakty posíláme už potvrzené.
3. V adminu vyplnit klíč a ID, uložit, kliknout **Otestovat spojení** (vypíše seznamy v účtu a ověří, že ID existuje).
4. **Newsletter → Synchronizovat do Ecomailu** nahraje všechny dosud potvrzené odběratele (a odhlásí odhlášené). Lze opakovat, nic se neduplikuje.

## 2) Co se posílá automaticky

Kdo smí do seznamu: **potvrzený odběratel newsletteru vždy** (souhlas). Ostatní — zákazníci z objednávek, poptávky LEDX, hlídání skladu —
**jen při zapnutém přepínači** „Přidávat i kontakty bez souhlasu“ (oprávněný zájem; zásady ochrany údajů tento účel uvádějí od 17. 10. 2026).
Logika je v `upsertContact()` v `lib/ecomail/sync.ts`: každé volání znovu spočítá štítky i profil z našich dat (Ecomail štítky přepisuje celé).

| Událost u nás | Ecomail |
|---|---|
| Potvrzení newsletteru (e-mail, účet, pokladna) | kontakt (status přihlášen), štítek `newsletter`, událost `newsletter_confirmed`; spouští automatizace |
| Odhlášení (odkaz, účet, admin, smazání) | odhlášení v seznamu |
| Nová objednávka (pokladna i ruční) | kontakt s adresou/telefonem, profil, štítky; událost `order_created`; při „transakcích“ transakce `pending` / `completed` |
| Změna stavu objednávky (paid / processing / shipped / delivered / cancelled / refunded) | pole `posledni_objednavka_stav` (+ `posledni_odeslani`, `posledni_doruceni`), událost `order_<stav>`; storno → transakce `canceled` |
| Zaplaceno (`markOrderPaid`) | transakce → `completed` |
| Recenze zákazníka | štítek `recenzent`, pole `posledni_recenze`, událost `review_left` (hodnocení v `value`) |
| Hlídání skladu (formulář u vyprodaného zboží) | štítek `hlidani-skladu`, pole `hlidany_produkt`, `hlidani_skladu_datum`, událost `stock_alert_created` |
| Poptávka LEDX (nová i změna stavu v adminu) | štítek `ledx-poptavka`, pole `ledx_poptavka_stav|datum|model`, událost `inquiry_<stav>` (`inquiry_new`, `inquiry_quoted`, `inquiry_won`…) |
| Zobrazení produktu přihlášeným zákazníkem | událost `product_viewed` (název, ID, cena, URL, kategorie) — anonymní návštěvy řeší JS tracker níže |

**Profil kontaktu (vlastní pole, vytvoří se v Ecomailu automaticky při prvním odeslání):** `jazyk`, `newsletter` (ano/ne), `pocet_objednavek`,
`celkova_utrata_czk`, `prumerna_objednavka_czk` (EUR kurzem ČNB), `prvni_objednavka`, `posledni_objednavka`, `posledni_objednavka_cislo`,
`posledni_objednavka_stav`, `top_kategorie`. Výpočet je čistá funkce `lib/ecomail/profile.ts` (testy `tests/unit/ecomail-profile.test.ts`).

**Štítky:** `newsletter`, `zakaznik` (má nestornovanou objednávku), `zajem-<slug kořenové kategorie>` (podle útraty, max 10 — např. `zajem-osvetleni`),
`recenzent`, `hlidani-skladu` (aktivní hlídání), `ledx-poptavka`. Segmenty v Ecomailu stavte na štítcích a polích, automatizace na událostech.

## 2b) Souhlas v pokladně a sledování webu

- V pokladně je zaškrtávátko „Chci dostávat novinky a slevy e-mailem“ (výchozí nezaškrtnuté). Přihlášený zákazník s ověřeným e-mailem se přihlásí
  rovnou (uvítací e-mail se slevou), host dostane potvrzovací e-mail (double opt-in). Zdroj `checkout`.
- **Sledování webu**: v Nastavení → Integrace → Ecomail je „Sledování webu — ID účtu“ (`reptiplus`). Měřicí kód (`lib/ecomail/tracker.ts`,
  skript `ecmtr-2.4.2.js` z `d70shl7vidtft.cloudfront.net`, kolektor `d2dpiwfhf3tz0r.cloudfront.net`, obojí v CSP) se načte jen po souhlasu
  s marketingovými cookies a posílá: zobrazení stránek, identitu z parametru `ecmid` v odkazech kampaní, **identitu přihlášeného zákazníka**
  (`setUserId` z layoutu), **zobrazení produktu** (`ViewProduct`, `components/reptiplus/ecomail-basket.tsx`), obsah košíku na stránce košíku
  (i prázdný) a po objednávce spárování s e-mailem + prázdný košík — základ pro automatizace „opuštěný košík“ a „prohlížel, nekoupil“.
- V adminu Newsletter sloupec „Ecomail“ ukazuje, zda byl odběratel do seznamu odeslán (`newsletter_subscriber.ecomail_synced_at`).
- **Produktový feed** pro dynamický obsah e-mailů a doporučení: v Ecomailu → Produktové feedy → přidat `https://reptiplus.cz/feed/google.xml`
  (formát Google Merchant; EN varianta `https://reptiplus.eu/feed/google.xml`).

## 3) Webhook (odhlášení z Ecomailu → odhlásit i u nás)

Po prvním uložení nastavení admin ukáže URL ve tvaru `https://reptiplus.cz/api/ecomail/webhook?t=<token>`.
V Ecomailu: **Správa účtu → Integrace → Webhook** (nebo přes API `POST account/settings/webhook`) → vložit tuto URL. V produkci je webhook
zaregistrovaný od 17. 10. 2026 (přes API); při změně tokenu ho zaregistrovat znovu.
Zpracovávají se události `list_unsubscribe` a `link_unsubscribe`; ostatní (doručení, otevření, kliknutí) se ignorují. Autorizace je tokenem v URL
(Ecomail požadavky nepodepisuje) — URL nikam nezveřejňovat.

## 4) GDPR

- Odběratelé newsletteru dali souhlas (double opt-in) — do Ecomailu jdou vždy.
- Zákazníci z objednávek bez souhlasu lze oslovovat jen v rámci oprávněného zájmu (vlastní podobné zboží, jasná možnost odhlášení, informace
  v zásadách ochrany osobních údajů). Proto je to samostatný přepínač, výchozí vypnutý, a kontakty mají jen štítek `zakaznik`.
- Smazání účtu / odběratele v adminu odhlásí kontakt v Ecomailu; úplné smazání kontaktu z Ecomailu udělejte ručně tam.
- Zásady ochrany údajů (`app_setting` `legal.privacy`, bod 2 a 3) uvádějí Ecomail jako zpracovatele, obchodní sdělení zákazníkům z oprávněného
  zájmu a sledování prohlížených produktů po souhlasu s marketingovými cookies.

## 5) Co nastavit v Ecomailu (ručně, nejde přes API)

1. **Odesílací doména** `reptiplus.cz` je založená (API `POST /domains`). V Ecomailu: e-mail vpravo nahoře → **Domény** → `reptiplus.cz` →
   „Zobrazit ověřovací údaje“ → do DNS přidat TXT `ecomail._domainkey` (DKIM, hodnota z Ecomailu) a TXT `_dmarc` = `v=DMARC1; p=none;`,
   pak „Kontrola nastavení“. SPF si Ecomail hlídá sám (volitelně `include:sparkpostmail.com`). Bez ověření jdou kampaně do spamu.
2. **Produktový feed** (viz 2b).
3. **Automatizace** (Automatizace → Nová): uvítání po přihlášení (spouštěč: přidání do seznamu; náš vlastní uvítací e-mail se slevou pak vypnout
   v Nastavení → Obchod, aby nechodil dvakrát), opuštěný košík (spouštěč: košík bez objednávky po 2–24 h), poděkování / péče po nákupu
   (událost `order_delivered` nebo `order_shipped`), žádost o recenzi (`order_delivered` + 10 dní, podmínka: štítek `recenzent` chybí),
   oživení (bez objednávky 90 dní, pole `posledni_objednavka`), následná nabídka LEDX (`inquiry_quoted` + 5 dní, pokud stav není `won`),
   „prohlížel, nekoupil“ (`product_viewed` / sledování webu bez nákupu do 2 dnů).
4. **Segmenty** podle pole `jazyk` (cs / en / de) — EN a DE zákazníci potřebují vlastní verze kampaní; podle štítků `zajem-*` tematické kampaně.
5. V nastavení kampaní zkontrolovat, že se do odkazů přidává parametr `ecmid` (identifikace návštěvy z e-mailu).
