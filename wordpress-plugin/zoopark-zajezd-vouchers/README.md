# Zoopark Zájezd Vouchers – WooCommerce Plugin (v3.0.0)

Sjednocení dvou původních pluginů do jednoho:

- **Zoo Vouchers v2** – generování voucherů (PDF + QR + email + Amelia + WC kupony), admin přehled, ruční tvorba, nastavení.
- **Zoo Voucher Checker v1.9** – prémiové pokladní ověřování (skener QR kamerou, zvuková signalizace, souhrnné dlaždice, hromadné uplatnění).

Pokladní obrazovka nyní ověřuje **obě generace voucherů zároveň**: nejdřív nové
vouchery z tabulky `wp_zoo_vouchers`, a když kód nenajde, zkusí i starší
SkyVerge PDF Product Vouchers (`post_type wc_voucher`). Podporu SkyVerge lze
vypnout filtrem `add_filter( 'zoo_vouchers_legacy_skyverge', '__return_false' )`.

## Typy voucherů

| Typ | Popis | Amelia |
|-----|-------|--------|
| `vstupenka` | Dárková vstupenka | ❌ – QR na pokladně |
| `permanentka_neprenosna` | Nepřenosná permanentka | ❌ – QR na pokladně |
| `permanentka_prenosna` | Přenosná permanentka | ❌ – QR na pokladně |
| `krmeni` | Poukaz na krmení zvířat | ✅ – 100% kupon v Amelii |

---

## Instalace

1. Nahraj adresář pluginu do `wp-content/plugins/` (nebo použij *Nahrát plugin* přes ZIP)
2. Aktivuj plugin v WP Admin → Pluginy
   - Při aktivaci se založí databázová tabulka `wp_zoo_vouchers`.
3. Vyžaduje **aktivní WooCommerce**.

> **Composer není potřeba.** PDF (tFPDF) i QR (phpqrcode / vlastní fallback)
> knihovny jsou přibalené v `lib/` včetně fontu DejaVuSans. `composer install`
> stáhne pouze nevyužité TCPDF a lze ho vynechat.

---

## Nastavení produktu

V každém produktu (nebo variabilním produktu) v záložce **Obecné**:

- **Typ voucheru** – vyber typ dokumentu
- **Varianta** – pro vstupenky/permanentky (dítě, dospělý, rodina 2+2…)
  - U variabilních produktů nechej prázdné – plugin detekuje z názvu variace automaticky
- **Zvíře (Amelia)** – pouze pro krmení; mapuje na Amelia service ID
- **Platnost (měsíce)** – výchozí 12

### Automatická detekce varianty u variabilních produktů
Plugin hledá klíčová slova v názvech atributů WooCommerce variace:
- `dítě`, `dite`, `child` → dítě
- `dospělý`, `dospel`, `adult` → dospělý
- `2+2` → rodina 2+2
- `2+3` → rodina 2+3
- `senior`, `ztp` → senior
- `student` → student
- `víkend`, `svátek` → víkend a státní svátky (krmení)
- vše ostatní → všední den (krmení)

---

## Pozadí PDF

Originální obrázky jsou uloženy v `assets/backgrounds/`:

| Soubor | Použití |
|--------|---------|
| `vstupenka-dite.jpg` | Dárková vstupenka – dítě |
| `vstupenka-dospely.jpg` | Dárková vstupenka – dospělý |
| `vstupenka-rodina22.jpg` | Dárková vstupenka – rodina 2+2 |
| `vstupenka-rodina23.jpg` | Dárková vstupenka – rodina 2+3 |
| `vstupenka-senior.jpg` | Dárková vstupenka – senior |
| `vstupenka-student.jpg` | Dárková vstupenka – student |
| `permanentka-neprenosna-dite.jpg` | Nepřenosná permanentka – dítě |
| `permanentka-neprenosna-rodina22.jpg` | Nepřenosná permanentka – rodina 2+2 |
| `permanentka-neprenosna-rodina23.jpg` | Nepřenosná permanentka – rodina 2+3 |
| `krmeni-vsedni.jpg` | Poukaz krmení – všední den |
| `krmeni-vikend.jpg` | Poukaz krmení – víkend/svátky |

**Přenosné permanentky** – zatím sdílí stejné pozadí jako nepřenosné.
Až nahraneš vlastní obrázky, přidej je jako `permanentka-prenosna-*.jpg`
a uprav mapování v `class-config.php` → metoda `background_path()`.

---

## ⚠️ Kalibrace pozic textu v PDF

Dynamická pole (jméno, kód, platnost) se překrývají přes originální obrázek.
**Pozice je nutné doladit** po první instalaci – jsou nastaveny jako odhadované hodnoty.

Uprav v `class-pdf.php` metody `overlay_krmeni()` a `overlay_vstup()`:
- `SetXY( X, Y )` – pozice v mm od levého/horního okraje
- `Cell( šířka, výška, text )` – rozměry buňky

Doporučený postup: vygeneruj testovací PDF z admin panelu a porovnej s originálem.

---

## Validace na pokladně

Přidej shortcode `[zoo_voucher_validator]` (nebo alias `[voucher_checker]`) na
interní stránku. Rozhraní je společné pro obě generace voucherů.

### Co se na pokladně uplatňuje

Na pokladně se uplatňují (= označí jako použité) **pouze vstupenky** (`vstupenka`),
a to vždy **ručním potvrzením** zaměstnance (nikdy automaticky při naskenování).

- **Permanentky** se NEuplatňují — jde o opakovaný vstup, nesmí se „spálit" na
  první sken. Zobrazí se jen jako platné (view-only).
- **Krmení** se na pokladně **vůbec nezobrazuje** ani nepotvrzuje (ani v
  „Uplatnit vše") — řeší se rezervací v Amelii.

Seznam uplatnitelných typů lze upravit filtrem `zoo_vouchers_redeemable_types`,
skryté typy filtrem `zoo_vouchers_hidden_types` (výchozí `['krmeni']`).

Pokladní může:

- **Naskenovat QR kamerou** (mobil/tablet – tlačítko 📷 QR) nebo zadat kód ručně.
  Vstupenka se **NEuplatní automaticky** — jen se ověří a zobrazí s výrazným
  oranžovým upozorněním *„Vstupenka zatím NEuplatněna — potvrďte tlačítkem
  Uplatnit"*. Zaměstnanec musí uplatnění **potvrdit ručně**.
- Naskenovaná vstupenka se zobrazí **nahoře a zvýrazněná**, pod ní ostatní
  vstupenky téže objednávky.
- Po potvrzení (nebo když už byla uplatněna dnes) se ukáže zelené
  **„Vstupenka uplatněna dnes — Vstup povolen"**. Uplatnění v jiný den →
  červené varování *„NEPOVOLOVAT vstup"*.
- **Vyhledat celou objednávku** podle čísla → zobrazí všechny vstupenky
  objednávky (nové i staré SkyVerge) se souhrnnými dlaždicemi.
- **Uplatnit jednotlivě** nebo tlačítkem **„Uplatnit všechny aktivní vstupenky"**.

### REST API (namespace `zoo/v1`)

| Endpoint | Metoda | Popis |
|----------|--------|-------|
| `/check-voucher` | POST `{ code }` | Ověří a uplatní jeden kód |
| `/order` | GET `?order_id=` | Vouchery objednávky (oba zdroje) |
| `/redeem` | POST `{ items:[{source,id}] }` | Hromadné uplatnění |

`source` je `zoo` (nový voucher) nebo `sky` (SkyVerge).

### Reset uplatnění

- **Nové vouchery** – tlačítko „Reaktivovat" v přehledu *Zoo Vouchery*.
- **Staré SkyVerge** – *WooCommerce → Metadata čtečky (SkyVerge)* vymaže
  `_zvc_redeemed_at`. Stav v SkyVerge (`post_status`) musíte vrátit ručně.

---

## Amelia – mapování zvířat

| Plugin klíč | Amelia Service ID | Název |
|-------------|-------------------|-------|
| `korsak` | 6 | Corsac – liška |
| `lemur` | 1 | Lemur |
| `odvazne` | 7 | Pro odvážné |
| `surikata` | 2 | Surikata |
| `tamarin` | 4 | Tamarín |
| `velbloud` | 3 | Velbloud |
| `vevericka` | 5 | Veverka |

Změny v `class-config.php` → konstanta `AMELIA_SERVICES`.
