# Ecomail a e-shop Reptiplus – co se posílá, štítky a segmenty

Stav k 17. 10. 2026. Přehled pro toho, kdo v Ecomailu tvoří kampaně: jaká data e-shop do Ecomailu posílá, co znamenají štítky a pole u kontaktu a jaké segmenty se z nich dají postavit.

## 1. Základní princip

E-shop je zdroj pravdy. Každou změnu u zákazníka pošle sám do Ecomailu, v Ecomailu se nic ručně neimportuje ani neupravuje.

- **V Ecomailu jsou jen odběratelé novinek**, tedy lidé, kteří potvrdili odběr kliknutím v e-mailu. Přihlásit se mohou formulářem na webu, zaškrtnutím v pokladně nebo z účtu. Zákazníci bez souhlasu se do Ecomailu neposílají.
- **U odběratele e-shop sleduje všechno**, co u nás dělá: objednávky, jejich stavy, recenze, poptávky LEDX osvětlení, hlídání vyprodaného zboží a po souhlasu s cookies i pohyb na webu.
- **Jediný seznam** kontaktů se jmenuje „První seznam“ (ID 1).
- **Zpět do e-shopu** se propisuje jediná věc: odhlášení. Kdo se odhlásí v Ecomailu, je odhlášený i u nás, a naopak.

Tok dat: zákazník udělá něco na webu → e-shop to zapíše k sobě → pošle kontakt, štítky, pole a událost do Ecomailu → kampaň nebo automatizace pošle e-mail → zákazník se proklikem vrátí na web.

## 2. Co e-shop posílá

| Co se stane na e-shopu | Co z toho vznikne v Ecomailu |
| --- | --- |
| Zákazník potvrdí odběr novinek | Kontakt v seznamu, štítek `newsletter`, pole `jazyk`, událost `newsletter_confirmed`. E-shop sám pošle uvítací e-mail s jednorázovým slevovým kódem `VITEJ-…` |
| Zákazník se odhlásí (odkaz v e-mailu, účet, admin) | Odhlášení v Ecomailu |
| Nová objednávka | Jméno, adresa, telefon; štítek `zakaznik` a štítky zájmů podle kategorií; přepočet profilu nákupů (pole níže); transakce s částkou, položkami a kategoriemi; událost `order_created` |
| Zaplaceno | Transakce `completed`, událost `order_paid` |
| Odesláno, doručeno | Pole `posledni_objednavka_stav`, `posledni_odeslani`, `posledni_doruceni`; události `order_shipped`, `order_delivered` |
| Storno, vrácení peněz | Transakce `canceled`, události `order_cancelled`, `order_refunded` |
| Zákazník napíše recenzi | Štítek `recenzent`, pole `posledni_recenze`, událost `review_left` s hodnocením |
| Zákazník si nechá hlídat vyprodané zboží | Štítek `hlidani-skladu`, pole `hlidany_produkt`, událost `stock_alert_created`. E-mail o naskladnění posílá e-shop sám |
| Poptávka LEDX osvětlení a změny jejího stavu v adminu | Štítek `ledx-poptavka`, pole `ledx_poptavka_stav`, `ledx_poptavka_datum`, `ledx_poptavka_model`; událost `inquiry_new`, `inquiry_quoted`, `inquiry_won`, `inquiry_lost` |
| Přihlášený zákazník si prohlíží produkt | Událost `product_viewed` s názvem, cenou a odkazem |
| Pohyb na webu po souhlasu s cookies | Zobrazené stránky a produkty, obsah košíku (i prázdný); návštěvník se s kontaktem spáruje po prokliku z e-mailu, po přihlášení nebo po objednávce |

Co e-shop posílá navíc mimo kontakty: **produktový feed** `https://reptiplus.cz/feed/ecomail.xml` s názvy, cenami, obrázky a kategoriemi pro bloky produktů v e-mailech, obnovovaný každou hodinu. Produkty bez vyplněné ceny ve feedu nejsou.

Co e-shop neposílá: druh chovaného zvířete, datum narození, obsah zpráv z kontaktního formuláře, reklamace. Potvrzení objednávky, faktury a stavy zásilky posílá zákazníkovi e-shop sám, v Ecomailu se neduplikují.

## 3. Pole kontaktu

Vlastní pole vznikají v Ecomailu automaticky při prvním odeslání. Slouží do podmínek automatizací, do segmentů a jako personalizace v textu e-mailu. E-shop je přepisuje při každé změně, ručně je neupravujte, nemažte ani nepřejmenovávejte.

| Pole | Hodnota | Co říká |
| --- | --- | --- |
| `jazyk` | `cs`, `en`, `de` | V jakém jazyce se zákazník přihlásil nebo nakoupil |
| `newsletter` | `ano` | Vždy `ano`, do seznamu jdou jen odběratelé |
| `pocet_objednavek` | číslo | Počet nestornovaných objednávek |
| `celkova_utrata_czk` | Kč | Součet útraty, EUR přepočteno kurzem ČNB |
| `prumerna_objednavka_czk` | Kč | Průměrná hodnota objednávky |
| `prvni_objednavka` | datum | První nákup |
| `posledni_objednavka` | datum | Poslední nákup |
| `posledni_objednavka_cislo` | číslo objednávky | Například RP261017-28KB |
| `posledni_objednavka_stav` | `new`, `paid`, `processing`, `shipped`, `delivered`, `cancelled` | Kde je poslední objednávka |
| `posledni_odeslani`, `posledni_doruceni` | datum | Kdy byla poslední objednávka odeslána a doručena |
| `top_kategorie` | název hlavní kategorie | Kam zákazník utratil nejvíc |
| `posledni_recenze` | datum | Kdy naposledy napsal recenzi |
| `hlidany_produkt`, `hlidani_skladu_datum` | název produktu, datum | Na co čeká |
| `ledx_poptavka_stav`, `ledx_poptavka_datum`, `ledx_poptavka_model` | stav, datum, řada a model | Poptávka LEDX; stavy `new`, `in_progress`, `quoted`, `won`, `lost`, `cancelled` |

Pole k objednávkám jsou vyplněná jen u kontaktů, které nějakou objednávku mají.

## 4. Štítky

Štítek je příznak na kontaktu. E-shop je při každé změně znovu spočítá a v Ecomailu přepíše celou sadu. Štítek přidaný ručně v Ecomailu při další aktualizaci zmizí, proto pro vlastní třídění používejte segmenty, ne štítky.

| Štítek | Kdo ho má | Kdy vznikne a zanikne |
| --- | --- | --- |
| `newsletter` | Každý kontakt v seznamu | Při potvrzení odběru; po odhlášení je kontakt odhlášený celý |
| `zakaznik` | Má aspoň jednu nestornovanou objednávku | Při první objednávce; zůstává |
| `zajem-osvetleni` | Nakoupil něco z hlavní kategorie Osvětlení | Při objednávce; řazeno podle útraty, nejvýše 10 štítků zájmu |
| `zajem-teraria` | Nakoupil něco z kategorie Terária | stejně |
| `zajem-kase-pro-plazy` | Nakoupil něco z kategorie Kaše pro plazy | stejně |
| `zajem-vitaminy-a-mineraly` | Nakoupil něco z kategorie Vitamíny a minerály | stejně |
| `zajem-substraty` | Nakoupil něco z kategorie Substráty | stejně |
| `recenzent` | Napsal recenzi | Při první recenzi; zůstává |
| `hlidani-skladu` | Má aktivní hlídání vyprodaného zboží | Při založení hlídání; zmizí, jakmile mu přijde e-mail o naskladnění |
| `ledx-poptavka` | Poslal poptávku LEDX osvětlení | Při poptávce; zůstává i po vyřízení, stav je v poli `ledx_poptavka_stav` |

Štítky zájmů odpovídají hlavním kategoriím e-shopu. Vzniknou-li v e-shopu nové hlavní kategorie, objeví se nové štítky `zajem-<název>` samy. Stejný název kategorie je u každého produktu v produktovém feedu v poli `custom_label_0`, takže blok produktů v e-mailu lze omezit na kategorii, o kterou má kontakt zájem.

## 5. Segmenty

Segment je uložený filtr kontaktů v Ecomailu. Staví se z podmínek na štítky, pole, transakce, události a na aktivitu v e-mailech, kterou měří Ecomail sám. Ecomail žádný segment nevytváří automaticky a e-shop je založit neumí, zakládají se ručně v Kontakty → Segmenty. K 17. 10. 2026 v účtu žádný není. Jakmile segment vznikne, naplní se okamžitě, data už na kontaktech jsou.

### Základní segmenty

| Segment | Podmínka | Použití |
| --- | --- | --- |
| CZ odběratelé | `jazyk` = `cs` | Základ pro každou českou kampaň |
| EN odběratelé | `jazyk` = `en` | Anglické kampaně (zákazníci z .eu a .shop) |
| DE odběratelé | `jazyk` = `de` | Německé kampaně |
| Zákazníci | štítek `zakaznik` | Novinky, věrnostní nabídky |
| Zájemci bez nákupu | štítek `newsletter` a ne `zakaznik` | Vzdělávací obsah, první nákup |
| Osvětlení, Terária, Kaše pro plazy, Vitamíny a minerály, Substráty | štítek `zajem-osvetleni`, `zajem-teraria`, `zajem-kase-pro-plazy`, `zajem-vitaminy-a-mineraly`, `zajem-substraty` (jeden segment na štítek) | Tematické kampaně |
| VIP | `celkova_utrata_czk` větší než 5 000 | Předpremiéry, osobní nabídky |

### Podle nákupního chování

| Segment | Podmínka | Použití |
| --- | --- | --- |
| Noví zákazníci | `pocet_objednavek` = 1 | Druhý nákup, doporučení doplňků |
| Stálí zákazníci | `pocet_objednavek` 3 a více | Věrnostní nabídky |
| Velký nákup | `prumerna_objednavka_czk` větší než 2 000 | Dražší vybavení, terária, LEDX |
| Drobní nakupující | `prumerna_objednavka_czk` menší než 500 | Spotřební zboží, balíčky, doprava zdarma od částky |
| Čerstvě nakoupili | `posledni_objednavka` v posledních 14 dnech | Vyloučit z akčních kampaní |
| Čekají na zboží | `posledni_objednavka_stav` = `new` nebo `processing` | Vyloučit z kampaní, dokud nemají zboží doma |
| Spící 90 dní | štítek `zakaznik` a `posledni_objednavka` dříve než před 90 dny | Oživení se slevou |
| Ztracení 180 dní | `posledni_objednavka` dříve než před 180 dny | Poslední pokus, pak útlum frekvence |
| Výročí prvního nákupu | `prvni_objednavka` před 11 až 12 měsíci | Poděkování, kód k výročí |
| Nakoupili v kategorii nedávno | štítek `zajem-…` a `posledni_objednavka` v posledních 60 dnech | Návazné zboží: po teráriu osvětlení a substrát |

### Podle zapojení (data měří Ecomail)

| Segment | Podmínka | Použití |
| --- | --- | --- |
| Aktivní čtenáři | otevřel e-mail v posledních 30 dnech | Hlavní newsletter, testování předmětů |
| Klikači | klikl v posledních 90 dnech | Nabídky a akce, nejvyšší konverze |
| Vlažní | neotevřel 90 dní, ale méně než 180 | Jiný předmět, kratší e-mail, méně často |
| Neaktivní | neotevřel 180 dní | Reaktivační e-mail, pak odhlásit |
| Noví odběratelé | přidán do seznamu v posledních 7 dnech | Vyloučit z newsletteru, dostávají uvítací sérii |
| Reagovali na kampaň | klikl v konkrétní kampani | Navazující nabídka |

### Podle událostí a dalších štítků

| Segment | Podmínka | Použití |
| --- | --- | --- |
| Prohlíželi, nekoupili | událost `product_viewed` v posledních 7 dnech a bez transakce | Připomenutí produktu |
| Měli košík | událost `Basket` v posledních 7 dnech a bez transakce | Doplněk k opuštěnému košíku |
| Recenzenti | štítek `recenzent` | Poděkování, žádost o fotku do galerie |
| Bez recenze po nákupu | štítek `zakaznik` bez `recenzent` a `posledni_objednavka` před více než 14 dny | Žádost o recenzi |
| Čekají na naskladnění | štítek `hlidani-skladu` | Kampaň po velkém naskladnění |
| Poptávka LEDX rozpracovaná | `ledx_poptavka_stav` = `new` nebo `quoted` | Reference, připomenutí nabídky |
| Zákazníci LEDX | `ledx_poptavka_stav` = `won` | Péče, doplňky, doporučení známým |
| Ztracené poptávky LEDX | `ledx_poptavka_stav` = `lost` | Po půl roce nová řada, akce |

### Příklady kombinací

- Topná sezóna v září: `zajem-teraria` nebo `zajem-osvetleni`, `jazyk` = `cs`, bez „Čerstvě nakoupili“.
- Black Friday předem pro VIP: `celkova_utrata_czk` nad 5 000 nebo `pocet_objednavek` nad 3, aktivní čtenáři.
- Vánoční dárky LEDX: `jazyk` = `cs`, bez `ledx-poptavka`, klikači.

Doporučení k názvům: jednotný tvar „CZ · Zákazníci · Spící 90“, jeden segment na jeden účel. Ke každé kampani přidat vyloučení „Čerstvě nakoupili“ a „Noví odběratelé“.

## 6. Jak segmenty používat

Segmenty jsou založené (27 segmentů k 17. 10. 2026). Používají se na třech místech: jako příjemci kampaně, jako vyloučení z kampaně a jako podmínka v automatizaci. Segment se počítá živě, při každém použití se do něj vezmou kontakty, které podmínku splňují právě teď.

### V kampani

1. Kampaně → Nová kampaň → v kroku **Příjemci** zvolte seznam „První seznam“ a místo „všichni“ vyberte **segment**. Lze vybrat více segmentů, kontakt pak stačí mít v jednom z nich.
2. Ve stejném kroku přidejte **vyloučení**: segmenty, kterým e-mail nemá přijít. Standardně vždy „Čerstvě nakoupili“ a „Noví odběratelé“, u akcí navíc „Čeká na zboží“.
3. Ecomail ukáže výsledný počet příjemců. Když je nula nebo podezřele málo, zkontrolujte podmínky segmentu v Kontakty → Segmenty.
4. Jazyk: v této chvíli jsou v seznamu jen české kontakty, přesto do příjemců vždy přidejte „CZ odběratelé“ jako první podmínku. Až přibudou EN a DE kontakty, budou mít vlastní segmenty a nebudou dostávat češtinu.

### V automatizaci

- **Podmínka „je v segmentu“** rozdělí průběh na dvě větve. Příklad: po události `order_shipped` větev „Recenzenti“ dostane poděkování bez žádosti o recenzi, ostatní dostanou žádost.
- **Vstupní podmínka** omezí, kdo do automatizace vůbec vstoupí. Příklad: oživení spustí jen kontakt v segmentu „Spící 90 dní“.
- **Čekání na podmínku**: krok „Čekat, dokud není v segmentu“ pozdrží e-mail, dokud kontakt nesplní podmínku, například dokud nebude v „Zákazníci“ (první nákup).

### Co komu posílat

| Segment | Co posílat | Jak často | Co vyloučit |
| --- | --- | --- | --- |
| CZ odběratelé | Hlavní měsíční newsletter | 1× měsíčně | Noví odběratelé, Čerstvě nakoupili |
| Zákazníci | Novinky v sortimentu, věrnostní nabídky | 1× měsíčně | Čerstvě nakoupili |
| Noví zákazníci | Tipy k první objednávce, doporučení doplňků | Jednou, 2 týdny po nákupu | Recenzenti |
| Stálí zákazníci | Předpremiéry, poděkování, kód k výročí | Podle příležitosti | Čeká na zboží |
| VIP | Osobní nabídky, Black Friday o den dřív | Max. 1× za 2 měsíce navíc k newsletteru | |
| Velký nákup | Terária, LEDX osvětlení, vybavení | Při nové řadě | Čerstvě nakoupili |
| Drobní nakupující | Spotřební zboží, balíčky, doprava zdarma od částky | 1× za 2 měsíce | |
| Osvětlení, Terária, Kaše pro plazy, Vitamíny a minerály, Substráty | Tematické kampaně: sezónní rady a zboží z dané kategorie, blok produktů z feedu omezený na `custom_label_0` = slug kategorie | Podle kalendáře, 1× za 1 až 2 měsíce na téma | Čerstvě nakoupili |
| Spící 90 dní | Oživení: novinky, pak kód | 2 e-maily s odstupem 14 dní | Čeká na zboží |
| Ztracení 180 dní | Poslední nabídka, pak útlum frekvence | Jednou | |
| Výročí prvního nákupu | Poděkování s kódem | Jednou ročně | |
| Čeká na zboží, Čerstvě nakoupili, Noví odběratelé | Nic, slouží k vyloučení | | |
| Aktivní čtenáři, Klikači | Vše, co má prodávat; sem posílejte akční nabídky nejdřív | | |
| Vlažní | Jiný předmět, kratší e-mail, méně často | Max. 1× měsíčně | |
| Neaktivní | „Chcete odběr zachovat?“, bez reakce po 30 dnech odhlásit | 1× za čtvrt roku | |
| Prohlíželi, nekoupili; Měli košík | Připomenutí produktu nebo košíku ručně, dokud neběží automatizace | 1× týdně výběr | Čerstvě nakoupili |
| Recenzenti | Poděkování, žádost o fotku do galerie | Podle příležitosti | |
| Bez recenze po nákupu | Žádost o recenzi s odkazem na přihlášení | 1× za 2 měsíce | |
| Čekají na naskladnění | Kampaň po velkém naskladnění, alternativy | Při naskladnění | |

### Na co dát pozor teď na začátku

- Segmenty „Neaktivní“ a „Noví odběratelé“ dnes obsahují všechny kontakty, protože z Ecomailu ještě nic neodešlo. Segmenty podle zapojení (Aktivní čtenáři, Klikači, Vlažní, Neaktivní) začnou dávat smysl až po dvou až třech kampaních.
- Segmenty podle útraty a počtu objednávek berou jen objednávky odběratelů novinek. Zákazník bez souhlasu v Ecomailu není, i kdyby nakoupil desetkrát.
- Počty v segmentech se přepočítávají průběžně. Po objednávce se kontakt přesune mezi segmenty do minuty.
- Jeden kontakt může být ve více segmentech najednou. Při odesílání dostane e-mail jen jednou, Ecomail duplicity sloučí.
- Vyloučení má přednost před zařazením. Kontakt v „Zákazníci“ i v „Čerstvě nakoupili“ e-mail nedostane, pokud je druhý segment ve vyloučení.
