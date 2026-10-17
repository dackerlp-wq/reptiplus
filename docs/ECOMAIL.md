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

| Událost | Ecomail |
|---|---|
| Zákazník potvrdí newsletter (e-mail nebo z účtu) | kontakt do seznamu, štítek `newsletter`, pole `jazyk`, `newsletter=ano`, zdroj `reptiplus-web|account`; spouští automatizace |
| Odhlášení (odkaz v e-mailu, účet, admin, smazání) | odhlášení v seznamu |
| Nová objednávka (pokladna i ruční z adminu) — jen pokud je zapnuto „zákazníci z objednávek“ | kontakt se štítkem `zakaznik`, jméno/adresa/telefon, pole `posledni_objednavka`, `posledni_objednavka_cislo` (stávající kontakt se nepřihlašuje znovu, jen aktualizuje) |
| Nová objednávka — jen pokud je zapnuto „transakce“ | transakce: číslo objednávky, částka, DPH, doprava, položky s kategoriemi, stav `pending` (`completed` u už zaplacené) |
| Zaplaceno (`markOrderPaid`) | transakce → `completed` |
| Storno / vrácení (vč. automatického storna nezaplacených) | transakce → `canceled` |

Štítky se v Ecomailu přepisují celé, proto se vždy počítají z našich dat: odběratel newsletteru dostane `newsletter`, zákazník s nestornovanou
objednávkou `zakaznik` (jen při zapnutém přepínači), kdo je obojí, dostane oba.

## 2b) Souhlas v pokladně a sledování webu

- V pokladně je zaškrtávátko „Chci dostávat novinky a slevy e-mailem“ (výchozí nezaškrtnuté). Přihlášený zákazník s ověřeným e-mailem se přihlásí
  rovnou (uvítací e-mail se slevou), host dostane potvrzovací e-mail (double opt-in). Zdroj `checkout`.
- **Sledování webu**: v Nastavení → Integrace → Ecomail vyplňte „Sledování webu — ID účtu“ (část adresy před `.ecomailapp.cz`). Měřicí kód
  (`lib/ecomail/tracker.ts`) se načte jen po souhlasu s marketingovými cookies, posílá zobrazení stránek, identitu z parametru `ecmid`
  v odkazech kampaní, obsah košíku na stránce košíku (i prázdný) a po objednávce spáruje návštěvníka s e-mailem a vyprázdní košík —
  to je základ pro automatizaci „opuštěný košík“ v Ecomailu. CSP povoluje `d70shl7vidtft.cloudfront.net` (skript `ecmtr-2.4.2.js`, dle kódu v Ecomailu → Správa účtu → Integrace) a `d2dpiwfhf3tz0r.cloudfront.net` (kolektor).
- V adminu Newsletter sloupec „Ecomail“ ukazuje, zda byl odběratel do seznamu odeslán (`newsletter_subscriber.ecomail_synced_at`).

## 3) Webhook (odhlášení z Ecomailu → odhlásit i u nás)

Po prvním uložení nastavení admin ukáže URL ve tvaru `https://reptiplus.cz/api/ecomail/webhook?t=<token>`.
V Ecomailu: **Správa účtu → Integrace → Webhook** (nebo přes API `POST account/settings/webhook`) → vložit tuto URL.
Zpracovávají se události `list_unsubscribe` a `link_unsubscribe`; ostatní (doručení, otevření, kliknutí) se ignorují. Autorizace je tokenem v URL
(Ecomail požadavky nepodepisuje) — URL nikam nezveřejňovat.

## 4) GDPR

- Odběratelé newsletteru dali souhlas (double opt-in) — do Ecomailu jdou vždy.
- Zákazníci z objednávek bez souhlasu lze oslovovat jen v rámci oprávněného zájmu (vlastní podobné zboží, jasná možnost odhlášení, informace
  v zásadách ochrany osobních údajů). Proto je to samostatný přepínač, výchozí vypnutý, a kontakty mají jen štítek `zakaznik`.
- Smazání účtu / odběratele v adminu odhlásí kontakt v Ecomailu; úplné smazání kontaktu z Ecomailu udělejte ručně tam.
