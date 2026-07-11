<?php
defined( 'ABSPATH' ) || exit;

/**
 * Centrální konfigurace celého systému voucherů.
 * Vše na jednom místě — typy, varianty, pozadí, Amelia ID.
 */
class Zoo_Vouchers_Config {

    // ── Typy dokumentů ──────────────────────────────────────────────────────

    const TYPES = [
        'vstupenka'             => 'Dárková vstupenka',
        'permanentka_neprenosna'=> 'Nepřenosná permanentka',
        'permanentka_prenosna'  => 'Přenosná permanentka',
        'krmeni'                => 'Poukaz – Krmení zvířat',
    ];

    // ── Varianty vstupů / permanentek ────────────────────────────────────────

    const ENTRY_VARIANTS = [
        'dite'      => 'Dítě',
        'dospely'   => 'Dospělý',
        'rodina22'  => 'Rodina 2+2',
        'rodina23'  => 'Rodina 2+3',
        'senior'    => 'Senior / ZTP',
        'student'   => 'Student',
    ];

    // ── Varianty krmení ──────────────────────────────────────────────────────

    const KRMENI_VARIANTS = [
        'vsedni' => 'Všední den',
        'vikend' => 'Víkend a státní svátky',
    ];

    // ── Zvířata pro krmení (název => Amelia service ID) ──────────────────────

    const AMELIA_SERVICES = [
        'korsak'    => 6,
        'lemur'     => 1,
        'odvazne'   => 7,
        'surikata'  => 2,
        'tamarin'   => 4,
        'velbloud'  => 3,
        'vevericka' => 5,
    ];

    const AMELIA_SERVICE_LABELS = [
        'korsak'    => 'Corsac – liška',
        'lemur'     => 'Lemur',
        'odvazne'   => 'Pro odvážné',
        'surikata'  => 'Surikata',
        'tamarin'   => 'Tamarín',
        'velbloud'  => 'Velbloud',
        'vevericka' => 'Veverka',
    ];

    // Amelia kategorie krmení
    const AMELIA_CATEGORY_ID = 1;

    // ── Mapování typ+varianta → soubor pozadí ────────────────────────────────

    /**
     * Vrátí absolutní cestu k obrázku pozadí pro daný typ a variantu.
     */
    public static function background_path( string $type, string $variant ): string {
        $map = [
            // Dárkové vstupenky
            'vstupenka:dite'      => 'vstupenka-dite.jpg',
            'vstupenka:dospely'   => 'vstupenka-dospely.jpg',
            'vstupenka:rodina22'  => 'vstupenka-rodina22.jpg',
            'vstupenka:rodina23'  => 'vstupenka-rodina23.jpg',
            'vstupenka:senior'    => 'vstupenka-senior.jpg',
            'vstupenka:student'   => 'vstupenka-student.jpg',

            // Nepřenosné permanentky
            'permanentka_neprenosna:dite'     => 'permanentka-neprenosna-dite.jpg',
            'permanentka_neprenosna:rodina22' => 'permanentka-neprenosna-rodina22.jpg',
            'permanentka_neprenosna:rodina23' => 'permanentka-neprenosna-rodina23.jpg',

            // Přenosné permanentky (stejné obrázky – nadpis se přepíše přes PDF)
            // Až nahraneš vlastní obrázky, přidej je sem jako permanentka-prenosna-*.jpg
            'permanentka_prenosna:dite'     => 'permanentka-neprenosna-dite.jpg',
            'permanentka_prenosna:rodina22' => 'permanentka-neprenosna-rodina22.jpg',
            'permanentka_prenosna:rodina23' => 'permanentka-neprenosna-rodina23.jpg',

            // Krmení
            'krmeni:vsedni' => 'krmeni-vsedni.jpg',
            'krmeni:vikend' => 'krmeni-vikend.jpg',
        ];

        $key  = "{$type}:{$variant}";
        $file = $map[ $key ] ?? null;

        if ( ! $file ) return '';

        return ZOO_VOUCHERS_PATH . 'assets/backgrounds/' . $file;
    }

    /**
     * Vrátí rozměry PDF stránky v mm pro daný typ [šířka, výška].
     * Vstupenky a krmení jsou na šířku (landscape), permanentky taky.
     */
    /**
     * Vrátí URL k výchozímu obrázku pozadí (pro zobrazení v adminu).
     */
    public static function background_url( string $type, string $variant ): string {
        $file = basename( self::background_path( $type, $variant ) );
        return $file ? ZOO_VOUCHERS_URL . 'assets/backgrounds/' . $file : '';
    }

    public static function page_size( string $type ) {
        return array( 297, 140 );
    }

    /**
     * Rozpozná variantu krmení (vsedni/vikend) z názvu WC varianty produktu.
     * Hledá klíčová slova v názvu atributu.
     */
    public static function detect_krmeni_variant( string $variation_name ): string {
        $name = mb_strtolower( $variation_name );
        if ( str_contains( $name, 'víkend' ) || str_contains( $name, 'vikend' ) ||
             str_contains( $name, 'svátek' ) || str_contains( $name, 'svatek' ) ) {
            return 'vikend';
        }
        return 'vsedni';
    }

    /**
     * Vrátí label varianty pro tisk do PDF.
     */
    public static function variant_label( string $type, string $variant ): string {
        if ( $type === 'krmeni' ) {
            return self::KRMENI_VARIANTS[ $variant ] ?? $variant;
        }
        return self::ENTRY_VARIANTS[ $variant ] ?? $variant;
    }

    /**
     * Vrátí název zvířete pro tisk do PDF.
     */
    public static function animal_label( string $animal_key ): string {
        return self::AMELIA_SERVICE_LABELS[ $animal_key ] ?? $animal_key;
    }
}
