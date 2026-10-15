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

Štítky se v Ecomailu přepisují celé: zákazník, který je i odběratelem, dostane při hromadné synchronizaci oba (`newsletter`, `zakaznik`).
Při jednotlivém přidání z objednávky se posílá jen `zakaznik` — pokud chcete štítky kombinovat trvale, segmentujte raději podle pole `newsletter=ano`.

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
