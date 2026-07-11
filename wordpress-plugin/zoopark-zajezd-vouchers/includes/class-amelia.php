<?php
defined( 'ABSPATH' ) || exit;

/**
 * Amelia integrace odstraněna.
 * Poukazy na krmení se uplatňují přes WooCommerce kupon na pokladně.
 * Třída ponechána prázdná pro zpětnou kompatibilitu.
 */
class Zoo_Vouchers_Amelia {

    public static function create_coupon( $code, $animal_key, $valid_until ) {
        // Amelia integrace odstraněna
        return null;
    }

    public static function deactivate_coupon( $amelia_coupon_id ) {
        // Amelia integrace odstraněna
    }

    public static function on_booking_added( $booking ) {
        // Amelia integrace odstraněna
    }
}
