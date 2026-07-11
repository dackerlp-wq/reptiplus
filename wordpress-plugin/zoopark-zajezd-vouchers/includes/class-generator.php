<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_Generator {

    /**
     * Hlavní vstupní bod – vytvoří voucher pro jednu položku objednávky.
     * Vrátí ID nebo false.
     */
    public static function create_from_order_item( WC_Order $order, WC_Order_Item_Product $item ) {
        $product_id   = $item->get_product_id();
        $variation_id = $item->get_variation_id() ?: 0;

        // Načti nastavení z produktu
        $doc_type   = get_post_meta( $product_id, '_zoo_voucher_type',            true );
        // Přímé mapování variation_id → varianta (a zvíře pro krmení)
        $variation_map = array(
            // Krmení
            6213 => array( 'animal' => 'odvazne',  'variant' => 'vsedni' ),
            6212 => array( 'animal' => 'odvazne',  'variant' => 'vikend' ),
            6207 => array( 'animal' => 'velbloud', 'variant' => 'vsedni' ),
            6206 => array( 'animal' => 'velbloud', 'variant' => 'vikend' ),
            6204 => array( 'animal' => 'korsak',   'variant' => 'vsedni' ),
            6203 => array( 'animal' => 'korsak',   'variant' => 'vikend' ),
            6199 => array( 'animal' => 'tamarin',  'variant' => 'vsedni' ),
            6198 => array( 'animal' => 'tamarin',  'variant' => 'vikend' ),
            6194 => array( 'animal' => 'lemur',    'variant' => 'vsedni' ),
            6193 => array( 'animal' => 'lemur',    'variant' => 'vikend' ),
            6181 => array( 'animal' => 'surikata', 'variant' => 'vsedni' ),
            6180 => array( 'animal' => 'surikata', 'variant' => 'vikend' ),
            6210 => array( 'animal' => 'vevericka','variant' => 'vsedni' ),
            6209 => array( 'animal' => 'vevericka','variant' => 'vikend' ),
            // Permanentka přenosná
            3406 => array( 'variant' => 'rodina23' ),
            3405 => array( 'variant' => 'rodina22' ),
            3404 => array( 'variant' => 'dospely'  ),
            3403 => array( 'variant' => 'dite'     ),
            3407 => array( 'variant' => 'senior'   ),
            3408 => array( 'variant' => 'student'  ),
            // Permanentka nepřenosná
            3393 => array( 'variant' => 'rodina23' ),
            3392 => array( 'variant' => 'rodina22' ),
            3391 => array( 'variant' => 'dospely'  ),
            3390 => array( 'variant' => 'dite'     ),
            3395 => array( 'variant' => 'student'  ),
            3394 => array( 'variant' => 'senior'   ),
            // Dárková vstupenka
            3414 => array( 'variant' => 'dite'     ),
            3415 => array( 'variant' => 'dospely'  ),
            3416 => array( 'variant' => 'rodina22' ),
            3417 => array( 'variant' => 'rodina23' ),
            3418 => array( 'variant' => 'senior'   ),
            3419 => array( 'variant' => 'student'  ),
        );
        // Zpětná kompatibilita pro krmení mapu
        $variation_animal_map = $variation_map;
        $animal_key = get_post_meta( $product_id, '_zoo_voucher_animal', true ) ?: null;
        $validity   = (int) ( get_post_meta( $product_id, '_zoo_voucher_validity_months', true ) ?: 12 );
        $variant    = get_post_meta( $product_id, '_zoo_voucher_variant', true );

        // Přepis podle variation_id pokud existuje v mapě — má nejvyšší prioritu
        if ( $variation_id && isset( $variation_map[ $variation_id ] ) ) {
            $map_entry = $variation_map[ $variation_id ];
            $variant   = $map_entry['variant'];
            if ( isset( $map_entry['animal'] ) ) {
                $animal_key = $map_entry['animal'];
            }
        }

        if ( ! $doc_type ) return false;

        // Pokud je variabilní produkt a variant není pevně nastavena,
        // zkus detekovat variantu z názvu atributu WC variace
        if ( ! $variant && $variation_id ) {
            $variant = self::detect_variant_from_variation( $variation_id, $doc_type );
        }

        if ( ! $variant ) {
            error_log( "[Zoo Vouchers] Produkt #{$product_id} (typ: {$doc_type}): nelze urcit variantu. variation_id={$variation_id}" );
            // Fallback varianty podle typu dokumentu
            if ( $doc_type === 'krmeni' ) {
                $variant = 'vsedni'; // výchozí pro krmení
            } elseif ( in_array( $doc_type, array( 'vstupenka', 'permanentka_neprenosna', 'permanentka_prenosna' ) ) ) {
                $variant = 'dospely'; // výchozí pro vstupenky/permanentky
            }
            if ( ! $variant ) return false;
            error_log( "[Zoo Vouchers] Pouzit fallback variant '{$variant}' pro produkt #{$product_id}" );
        }

        $valid_until     = date( 'Y-m-d', strtotime( "+{$validity} months" ) );
        // Jméno příjemce – z pole na produktové stránce; pokud nevyplněno, zůstane prázdné
        $recipient_name_raw = $item->get_meta( '_zoo_recipient_name' );
        $recipient_name     = sanitize_text_field( $recipient_name_raw ? $recipient_name_raw : '' );
        $recipient_email = $order->get_billing_email();
        $code            = self::generate_unique_code();

        $voucher_id = Zoo_Vouchers_Database::insert( [
            'code'            => $code,
            'order_id'        => $order->get_id(),
            'order_item_id'   => $item->get_id(),
            'product_id'      => $product_id,
            'variation_id'    => $variation_id,
            'doc_type'        => $doc_type,
            'variant'         => $variant,
            'animal_key'      => $animal_key,
            'status'          => 'active',
            'recipient_name'  => $recipient_name, // prázdné pokud zákazník nevyplnil
            'recipient_email' => sanitize_email( $recipient_email ),
            'valid_until'     => $valid_until,
            'created_at'      => current_time( 'mysql' ),
        ] );

        if ( ! $voucher_id ) return false;

        // Vytvoř WC kupon pro uplatnění na pokladně
        Zoo_Vouchers_WC_Coupon::create_coupon( $voucher_id, $valid_until );

        return $voucher_id;
    }

    /**
     * Pokusí se detekovat variantu z WC variace.
     * Pro krmení: hledá vsedni/vikend v atributu.
     * Pro vstupenky/permanentky: hledá variantu v atributu.
     */
    private static function detect_variant_from_variation( int $variation_id, string $doc_type ): string {
        $variation = wc_get_product( $variation_id );
        if ( ! $variation ) return '';

        // Vezmi název atributů variace
        $attributes = $variation->get_variation_attributes();
        $combined   = mb_strtolower( implode( ' ', $attributes ) );

        if ( $doc_type === 'krmeni' ) {
            return Zoo_Vouchers_Config::detect_krmeni_variant( $combined );
        }

        // Vstup / permanentka – mapuj klíčová slova na slug varianty
        $keyword_map = [
            'dite'     => [ 'dít', 'dite', 'child', 'kid' ],
            'dospely'  => [ 'dospěl', 'dospel', 'adult', 'dospělý' ],
            'rodina22' => [ '2+2', 'rodina 2+2', 'family 2+2' ],
            'rodina23' => [ '2+3', 'rodina 2+3', 'family 2+3' ],
            'senior'   => [ 'senior', 'ztp', 'důchodce', 'duchodce' ],
            'student'  => [ 'student' ],
        ];

        foreach ( $keyword_map as $slug => $keywords ) {
            foreach ( $keywords as $kw ) {
                if ( str_contains( $combined, mb_strtolower( $kw ) ) ) {
                    return $slug;
                }
            }
        }

        return '';
    }

    private static function generate_unique_code(): string {
        do {
            $code = 'ZOO-' . strtoupper( substr( base_convert( bin2hex( random_bytes(3) ), 16, 36 ), 0, 4 ) )
                          . '-' . strtoupper( substr( base_convert( bin2hex( random_bytes(3) ), 16, 36 ), 0, 4 ) );
        } while ( Zoo_Vouchers_Database::get_by_code( $code ) );

        return $code;
    }
}
