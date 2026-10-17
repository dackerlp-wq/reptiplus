# Ecomail pro Reptiplus – návod k používání

Stav k 17. 10. 2026. Návod pro toho, kdo v Ecomailu tvoří kampaně a automatizace pro e-shop Reptiplus: co udělat jednou, co pravidelně, jak postupovat krok za krokem a čemu se vyhnout. Technické pozadí propojení je v souhrnu „Ecomail a e-shop Reptiplus – souhrn pro kampaně“ a pro vývojáře v `docs/ECOMAIL.md`.

## 1. Jak to celé funguje

E-shop je zdroj pravdy. Každou změnu u zákazníka pošle sám do Ecomailu, v Ecomailu se nic ručně neimportuje ani neupravuje.

- **Kdo je v Ecomailu:** jen lidé, kteří potvrdili odběr novinek kliknutím v e-mailu (formulář na webu, zaškrtnutí v pokladně, nebo z účtu). Zákazníci bez souhlasu se do Ecomailu neposílají, to je rozhodnutí z 17. 10. 2026.
- **Co o nich Ecomail ví:** štítky (`newsletter`, `zakaznik`, `zajem-<kategorie>`, `recenzent`, `hlidani-skladu`, `ledx-poptavka`), profil nákupů (počet objednávek, útrata, poslední objednávka a její stav, top kategorie), transakce (každá objednávka s položkami) a události (objednávka vytvořena, odeslána, doručena, recenze, poptávka, zobrazení produktu).
- **Co o návštěvě webu:** po souhlasu s marketingovými cookies posílá web zobrazené produkty a obsah košíku. Návštěvník se s kontaktem spáruje po prokliku z e-mailu, po přihlášení k účtu nebo po objednávce.
- **Zpět do e-shopu** jde jediná věc: odhlášení. Kdo se odhlásí v Ecomailu, je odhlášený i u nás, a naopak.
- **Produktový feed** `https://reptiplus.cz/feed/ecomail.xml` dává Ecomailu názvy, ceny, obrázky a kategorie pro bloky produktů v e-mailech. Obnovuje se každou hodinu.

Tok dat: zákazník udělá něco na webu → e-shop to zapíše k sobě → pošle kontakt, štítky, pole a událost do Ecomailu → automatizace nebo kampaň pošle e-mail → zákazník se prokliknutím vrátí na web a kolo se uzavře.

## 2. První spuštění

Jednorázové kroky. Hotové jsou označené.

| Krok | Kde | Stav |
| --- | --- | --- |
| Propojení přes API klíč, seznam „První seznam“ (ID 1), sledování webu, webhook pro odhlášení | Nastaveno z e-shopu | Hotovo |
| Odesílací doména `reptiplus.cz` a DNS záznamy (DKIM, DMARC) | Ecomail → Domény | Hotovo, zkontrolovat zelený stav „Ověřená“ |
| Produktový feed | Ecomail → Produktové feedy | Hotovo |
| Nahrát stávající odběratele | Admin e-shopu → Newsletter → „Synchronizovat do Ecomailu“ | Udělat |
| Zkontrolovat, že kontakty dorazily | Ecomail → Kontakty → „První seznam“; sloupec „Ecomail“ v adminu e-shopu ukazuje „v seznamu“ | Udělat |
| Testovací průchod: přihlásit vlastní e-mail k novinkám, potvrdit, objednat | Web → Ecomail → Kontakty → váš kontakt → Události a Vlastní pole | Udělat |
| Založit automatizace 1 až 3 (uvítání, opuštěný košík, po nákupu) | Ecomail → Automatizace | Udělat |
| Vypnout vlastní připomínku opuštěného košíku v e-shopu, až poběží z Ecomailu | Řekněte vývoji, je to změna v kódu | Udělat po bodu 7 |
| Doplnit ceny u 17 produktů bez ceny, aby byly ve feedu | Admin e-shopu → Produkty | Udělat |

Synchronizaci v adminu můžete spustit kdykoli znovu, nic se nezduplikuje. Hodí se po výpadku nebo když si nejste jistí, že kontakt dorazil.

## 3. Pravidelná rutina

| Jak často | Co | Kde |
| --- | --- | --- |
| Denně | Projít nové kontakty a události u včerejších objednávek, zda chodí | Ecomail → Kontakty, filtr „přidáno včera“ |
| Denně | Doručitelnost posledních e-mailů: otevření nad 25 %, stížnosti pod 0,1 %, odhlášení pod 0,5 % | Ecomail → Kampaně → statistiky; Automatizace → statistiky |
| Týdně | Zkontrolovat běžící automatizace: počet lidí v jednotlivých krocích, chybové stavy | Ecomail → Automatizace |
| Týdně | Projít segmenty, zda rostou (noví odběratelé z pokladny a webu) | Ecomail → Segmenty |
| Měsíčně | Poslat alespoň jeden newsletter každému jazyku; jinak kontakty „vychladnou“ a doručitelnost klesá | Kampaně |
| Měsíčně | Zkontrolovat stav domény a DMARC reporty | Ecomail → Domény |
| Měsíčně | Ověřit, že feed obsahuje aktuální produkty a ceny | Otevřít adresu feedu v prohlížeči |
| Čtvrtletně | Vyčistit neaktivní: kdo 6 měsíců nic neotevřel, dostane „chcete odběr zachovat?“, bez reakce odhlásit | Segment „neaktivní“ + kampaň |

## 4. Jak poslat kampaň krok za krokem

1. **Komu:** vyberte segment (část 6). Nikdy neposílejte celému seznamu bez rozdělení podle jazyka, Čech by dostal angličtinu.
2. **Co:** Kampaně → Nová kampaň → název interně („2026-11 Topná sezóna CZ“), předmět do 50 znaků, preheader (text pod předmětem) do 90 znaků, odesílatel „Reptiplus“ a adresa na doméně `reptiplus.cz`.
3. **Šablona:** vyjděte z existující šablony Reptiplus, aby se drželo logo, barvy a patička. V patičce musí být odkaz na odhlášení (Ecomail ho vkládá sám) a adresa firmy.
4. **Produkty:** blok „Produkty z feedu“ → vyberte feed Reptiplus → ručně konkrétní produkty, nebo filtr podle pole `custom_label_0` (slug kategorie, například `osvetleni`). Zobrazí se název, obrázek, cena a tlačítko s odkazem na produkt.
5. **Personalizace:** tlačítko Personalizace vloží jméno nebo vlastní pole, například `top_kategorie`. Vždy vyplňte náhradní text pro prázdnou hodnotu („chovateli“ místo jména).
6. **Odkazy:** nechte zapnuté přidávání parametru `ecmid` do odkazů, díky němu Ecomail spáruje návštěvu webu s kontaktem. Pro Google Analytics přidejte UTM: `utm_source=ecomail&utm_medium=email&utm_campaign=<název>`.
7. **Test:** pošlete testovací e-mail sobě a jednomu kolegovi, zkontrolujte na mobilu: předmět, obrázky, odkazy, personalizaci s prázdným polem, zobrazení v Gmailu a Seznamu.
8. **Odeslání:** úterý až čtvrtek mezi 9 a 11 nebo 18 a 20 hodinou funguje u chovatelů nejlépe. Větší seznam (nad 2 000 kontaktů) odesílejte s rozložením v čase, volba v kroku odeslání.
9. **Vyhodnocení po 48 hodinách:** otevření, kliknutí, objednávky z kampaně (transakce s datem po odeslání u kontaktů, kteří klikli), odhlášení. Zapište si, co fungovalo, do tabulky kampaní.

Zlaté pravidlo: jeden e-mail, jedno hlavní sdělení, jedno tlačítko nahoře.

## 5. Jak založit automatizaci

Postup je u všech stejný:

1. Automatizace → Nová automatizace → název.
2. **Spouštěč:** co ji startuje (přidání do seznamu, vlastní událost, opuštěný košík, datum v poli).
3. **Podmínka na jazyk:** první krok vždy „Vlastní pole `jazyk` je rovno `cs`“ s větvemi `en` a `de`. Bez cizojazyčných šablon nechte větve `en` a `de` prázdné.
4. **Čekání a podmínky:** kroky „Čekat“ a „Podmínka“ podle receptu níže.
5. **E-mail:** krok „Odeslat e-mail“ se šablonou. Jedna automatizace smí mít víc e-mailů.
6. **Omezení:** zaškrtněte „kontakt může projít jen jednou“ u uvítání a po nákupu; u opuštěného košíku nastavte nejvýše jednou za 7 dní.
7. **Test:** zapněte, projděte spouštěč vlastním e-mailem a sledujte u svého kontaktu záložku Automatizace.

Šest receptů v pořadí podle přínosu:

| # | Automatizace | Spouštěč | Kroky |
| --- | --- | --- | --- |
| 1 | Uvítání | Přidání do seznamu se štítkem `newsletter` | Čekat 1 den (e-shop pošle slevový kód `VITEJ-…` ihned) → šablona „Uvítací série – e-mail 1“ → čekat 3 dny → pokud `pocet_objednavek` je prázdné nebo 0 → „e-mail 2/2: Doporučené kategorie“ → čekat 20 dní → stále bez nákupu → připomínka, že kód za týden propadne (platí 30 dní) |
| 2 | Opuštěný košík | Opuštěný košík ze sledování webu | Čekat 2 hodiny → pokud bez transakce → e-mail s blokem „Obsah košíku“ → čekat 24 hodin → stále bez transakce → druhý e-mail bez slevy, nebo s dopravou zdarma |
| 3 | Po nákupu a recenze | Událost `order_shipped` | Čekat 4 dny → tipy podle `top_kategorie` (větve podle štítků `zajem-…`) → čekat 7 dní → pokud nemá štítek `recenzent` → prosba o recenzi s odkazem na přihlášení (recenzi napíše jen přihlášený) |
| 4 | Následná nabídka LEDX | Událost `inquiry_quoted` | Čekat 5 dní → pokud `ledx_poptavka_stav` = `quoted` → „Máte k nabídce otázky?“ → čekat 10 dní → stejná podmínka → reference a nabídka konzultace |
| 5 | Oživení | Datum v poli `posledni_objednavka` + 90 dní, podmínka štítek `zakaznik` | Novinky z kategorií podle `zajem-…` → čekat 14 dní → `posledni_objednavka` se nezměnila → slevový kód z adminu e-shopu (část 7) |
| 6 | Prohlížel, nekoupil | Událost `product_viewed` nebo zobrazení produktu ze sledování | Čekat 1 den → bez transakce → blok „Prohlížené produkty“; omezení jednou za 14 dní |

Co nedělat automatizací: e-mail o naskladnění hlídaného zboží posílá e-shop sám. Potvrzení objednávky, faktury a stavy zásilky posílá e-shop sám. Tyto e-maily v Ecomailu neduplikujte.

## 6. Segmenty, které si založit hned

Segment = uložený filtr kontaktů. Založte je v Ecomail → Kontakty → Segmenty, používejte v kampaních i podmínkách automatizací.

| Segment | Podmínky | K čemu |
| --- | --- | --- |
| CZ odběratelé | `jazyk` = `cs` | Základ pro každou českou kampaň |
| EN odběratelé | `jazyk` = `en` | Anglické kampaně (zákazníci z .eu a .shop) |
| DE odběratelé | `jazyk` = `de` | Německé kampaně |
| Zákazníci | štítek `zakaznik` | Novinky, věrnostní nabídky |
| Zájemci bez nákupu | štítek `newsletter` a ne `zakaznik` | Vzdělávací obsah, první nákup |
| Osvětlení, Terária, Krmiva, … | štítek `zajem-osvetleni`, `zajem-teraria`, `zajem-krmiva` | Tematické kampaně; názvy štítků podle hlavních kategorií e-shopu |
| VIP | `celkova_utrata_czk` větší než 5 000 | Předpremiéry, osobní nabídky |
| Spící zákazníci | štítek `zakaznik` a `posledni_objednavka` dříve než před 120 dny | Oživení |
| Čeká na zboží | štítek `hlidani-skladu` | Kampaň po velkém naskladnění |
| Poptávky LEDX | štítek `ledx-poptavka` | B2B obsah, reference |
| Neaktivní | neotevřel žádný e-mail 180 dní | Čištění seznamu |

## 7. Slevové kódy

Kódy vznikají a platí v e-shopu, Ecomail je jen doručuje v textu e-mailu.

- **Uvítací kód `VITEJ-XXXXXX`** vzniká automaticky při potvrzení odběru, je jednorázový a vázaný na e-mail. Výši, minimální objednávku a platnost nastavuje Admin → Nastavení → Obchod (dnes 100 Kč od 1 000 Kč, 30 dní). Posílá ho e-shop, v Ecomailu ho nevytvářejte.
- **Kampaňové kódy** zakládejte v Admin → Slevy: název kódu (například `ZPET10`), typ procento nebo pevná částka, minimální objednávka, platnost od–do, omezení počtu použití celkem i na zákazníka. Pevné částky jsou v Kč, pro EUR košík se přepočítají kurzem ČNB automaticky.
- **Do e-mailu** vložte kód jako text velkými písmeny a k němu tlačítko na web. Napište podmínky (minimální objednávka, platnost) přímo do e-mailu.
- **Jeden kód na kampaň.** Pak ve Slevách vidíte, kolikrát se použil, a znáte výsledek kampaně.
- Kód nikdy neposílejte lidem, kteří ho nemohou uplatnit (například EN segment s kódem, který má minimální objednávku jen v Kč, je v pořádku, přepočet proběhne; ale kód s platností do včerejška v pořádku není).

## 8. Jazyky

- Pole `jazyk` u kontaktu říká, v jakém jazyce se přihlásil nebo nakoupil: `cs`, `en`, `de`.
- Každá kampaň má jeden jazyk a jde jednomu jazykovému segmentu. Každá automatizace začíná větvením podle `jazyk`.
- Dokud nejsou anglické a německé šablony, nechte zahraniční větve prázdné. Lepší žádný e-mail než česky Němci.
- Odkazy v EN a DE e-mailech vedou na `reptiplus.eu`, kde se zboží ukáže v eurech. Feed má cenu v EUR v poli `custom_label_2`.
- Při psaní předmětů: čeština do 50 znaků, němčina bývá delší, zkraťte.

## 9. Roční kalendář kampaní pro teraristiku

Orientační plán, jeden hlavní newsletter měsíčně, k tomu automatizace běží samy.

| Měsíc | Téma | Segment |
| --- | --- | --- |
| Leden | Kontrola topení a osvětlení po Vánocích, výměna UV zářivek (po 6–12 měsících ztrácejí výkon) | Osvětlení, Zákazníci |
| Únor | Příprava na jaro: konec zimování, krmení, vitamíny | Krmiva, Zákazníci |
| Březen | Jarní úklid terária: substráty, dezinfekce, dekorace | Terária |
| Duben | Výstavy a burzy, nové přírůstky: startovací sety pro začátečníky | Zájemci bez nákupu |
| Květen | Letní teploty: termostaty, větrání, hydratace | Všichni CZ/EN/DE |
| Červen | Dovolená: automatické krmení, časovače, kontrola na dálku | Zákazníci |
| Červenec | Letní akce, doprava zdarma od částky | Všichni |
| Srpen | Zpět do rutiny: krmný hmyz, doplňky, kalcium | Krmiva |
| Září | Topná sezóna začíná: topné kameny, kabely, žárovky, termostaty | Osvětlení, Terária |
| Říjen | Zimování: kdo ano, kdo ne, jak připravit | Zákazníci |
| Listopad | Black Friday nebo vlastní „Terarijní pátek“, dárkový průvodce | Všichni, VIP předem |
| Prosinec | Vánoční doručení do data, poslední objednávky, LEDX osvětlení jako dárek | Všichni, Poptávky LEDX |

Doplňte vlastní události: naskladnění nové řady LEDX, výstava, nový dodavatel. K nim segment „Čeká na zboží“ a tematické segmenty.

## 10. Časté chyby a co nedělat

- **Neupravovat ručně štítky a vlastní pole** u kontaktů. E-shop je při další změně přepíše. Pro vlastní třídění použijte segmenty nebo skupiny.
- **Nemazat ani nepřejmenovávat vlastní pole.** E-shop je zná pod přesnými názvy.
- **Neimportovat kontakty z tabulek** bez souhlasu. Do seznamu patří jen potvrzení odběratelé, ostatní se do Ecomailu nedostanou a nemají tam být.
- **Neposílat před ověřením domény.** Bez DKIM skončí e-maily ve spamu a poškodí reputaci na týdny.
- **Neduplikovat e-maily e-shopu:** potvrzení objednávky, fakturu, stavy zásilky, naskladnění a uvítací kód posílá e-shop.
- **Nepustit uvítací automatizaci bez čekání.** E-shop posílá uvítací kód ihned, Ecomail má přijít nejdřív o den později.
- **Nepouštět dvě připomínky košíku.** Až poběží opuštěný košík z Ecomailu, vlastní připomínku e-shopu vypněte.
- **Nezapínat „kontakty bez souhlasu“** v adminu e-shopu. Rozhodnutí je nepoužívat je.
- **Nezapomínat na jazyky.** Každá kampaň jednomu jazyku.
- **Nepřehánět frekvenci.** Víc než dva marketingové e-maily týdně jednomu kontaktu zvyšují odhlášení.

## 11. Když něco nefunguje

**Kontakt není v Ecomailu**

1. Admin e-shopu → Newsletter: je u něj „potvrzeno“? Nepotvrzený odběratel se neposílá.
2. Sloupec „Ecomail“ v tom seznamu: „neodesláno“ znamená, že odeslání selhalo nebo ještě neproběhlo. Klikněte „Synchronizovat do Ecomailu“.
3. Admin → Nastavení → Integrace → Ecomail → „Otestovat spojení“. Musí vypsat seznamy a potvrdit ID 1.

**Události nebo pole nechodí**

1. Ecomail → Kontakty → kontakt → Události a Vlastní pole. Události jdou jen ke kontaktům, které už v seznamu jsou.
2. Zkontrolujte, že jde o odběratele novinek. U ostatních se nic neposílá.
3. Po nové objednávce se pole přepočítají do minuty. Pokud ne, požádejte vývoj o kontrolu logu.

**Opuštěný košík nic neposílá**

1. Návštěvník musí mít souhlas s marketingovými cookies a musí být Ecomailu znám (proklik z e-mailu s `ecmid`, přihlášení, nebo dřívější objednávka).
2. Ověřte, že v kampaních je zapnuté přidávání `ecmid` do odkazů.
3. V Ecomail → Sledování webu zkontrolujte, že chodí zobrazení stránek z `reptiplus.cz`.

**E-maily padají do spamu**

1. Ecomail → Domény: `reptiplus.cz` musí být „Ověřená“.
2. V DNS je jen jeden DMARC záznam (`v=DMARC1; p=quarantine`).
3. Odesílatel kampaně je na doméně `reptiplus.cz`, ne gmail nebo centrum.

**Odhlášení se nepropsalo**

1. Ecomail → Správa účtu → Integrace → Webhook: adresa `https://reptiplus.cz/api/ecomail/webhook?t=…` musí být vyplněná. Zobrazuje se v Admin → Nastavení → Integrace → Ecomail.
2. Pokud ji někdo smazal, zkopírujte ji z adminu zpět.

Cokoli dalšího: napište vývoji s e-mailem kontaktu a časem, kdy se akce stala. V e-shopu se každá odeslaná událost dá dohledat.
