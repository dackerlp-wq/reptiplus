<?php
defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce kupon integrace.
 *
 * Krmení: vytvoří WC kupon svázaný s produktem ID 7913 (100% sleva).
 * Vstupenky/permanentky: kupon se nevytváří, ověření probíhá jen přes validátor.
 */
class Zoo_Vouchers_WC_Coupon {

    // ID produktu krmení v WooCommerce
    const KRMENI_PRODUCT_ID = 7913;

    public static function init() {
        add_filter( 'woocommerce_coupon_is_valid', array( __CLASS__, 'validate' ), 10, 2 );
        add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'on_order_paid' ), 20 );
        add_action( 'woocommerce_order_status_completed',  array( __CLASS__, 'on_order_paid' ), 20 );
    }

    /**
     * Vytvoří WC kupon pro poukaz na krmení.
     * Kupon = 100% sleva na produkt ID 7913.
     * Pro vstupenky/permanentky se kupon nevytváří.
     */
    public static function create_coupon( $voucher_id, $valid_until ) {
        $row = Zoo_Vouchers_Database::get_by_id( (int) $voucher_id );
        if ( ! $row ) return false;

        $voucher = new Zoo_Vouchers_Voucher( $row );

        // Kupon pouze pro krmení
        if ( $voucher->doc_type !== 'krmeni' ) return false;

        // Zkontroluj zda kupon již existuje
        $existing_id = wc_get_coupon_id_by_code( $voucher->code );
        if ( $existing_id ) return $existing_id;

        $coupon = new WC_Coupon();
        $coupon->set_code( strtoupper( $voucher->code ) );
        $coupon->set_description( 'Poukaz na krmeni – ' . $voucher->code );
        $coupon->set_discount_type( 'percent' );
        $coupon->set_amount( 100 );
        $coupon->set_usage_limit( 1 );
        $coupon->set_usage_limit_per_user( 1 );
        $coupon->set_individual_use( true );
        $coupon->set_product_ids( array( self::KRMENI_PRODUCT_ID ) );

        if ( $valid_until ) {
            $coupon->set_date_expires( strtotime( $valid_until . ' 23:59:59' ) );
        }

        $coupon_id = $coupon->save();

        if ( $coupon_id ) {
            update_post_meta( $coupon_id, '_zoo_voucher_id',   $voucher_id );
            update_post_meta( $coupon_id, '_zoo_voucher_code', $voucher->code );
        }

        return $coupon_id;
    }

    /**
     * Validace kuponu – zkontroluj že voucher je stále aktivní.
     */
    public static function validate( $valid, $coupon ) {
        if ( ! $valid ) return false;

        $coupon_id = $coupon->get_id();
        if ( ! $coupon_id ) return $valid;

        $voucher_id = (int) get_post_meta( $coupon_id, '_zoo_voucher_id', true );
        if ( ! $voucher_id ) return $valid; // Není zoo voucher

        $voucher = Zoo_Vouchers_Voucher::find_by_id( $voucher_id );
        if ( ! $voucher ) {
            throw new Exception( 'Tento poukaz neexistuje.' );
        }

        if ( ! $voucher->is_active() ) {
            $map = array(
                'used'      => 'Tento poukaz byl jiz pouzit.',
                'expired'   => 'Platnost tohoto poukazu vyprsela.',
                'cancelled' => 'Tento poukaz byl zrusen.',
            );
            throw new Exception( isset( $map[$voucher->status] ) ? $map[$voucher->status] : 'Poukaz neni platny.' );
        }

        return true;
    }

    /**
     * Po zaplacení – označ voucher jako použitý.
     */
    public static function on_order_paid( $order_id ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) return;

        foreach ( $order->get_coupon_codes() as $code ) {
            $voucher = Zoo_Vouchers_Voucher::find( strtoupper( $code ) );
            if ( $voucher && $voucher->is_active() ) {
                $voucher->mark_used();
            }
        }
    }

    /**
     * Zablokuje kupon při zrušení voucheru.
     */
    public static function cancel_coupon( $voucher_code ) {
        $coupon_id = wc_get_coupon_id_by_code( strtoupper( $voucher_code ) );
        if ( ! $coupon_id ) return;
        $coupon = new WC_Coupon( $coupon_id );
        $coupon->set_usage_limit( 0 );
        $coupon->save();
    }
}
