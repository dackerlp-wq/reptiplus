<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_WC_Hooks {

    public static function init() {
        // Generování pouze při přechodu do stavu Dokončeno
        // Priorita 20 = spustí se AŽ PO standardním WC emailu (priorita 10)
        add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'process_order' ), 20 );
        // Storno
        add_action( 'woocommerce_order_status_cancelled',  array( __CLASS__, 'cancel_order' ) );
        add_action( 'woocommerce_order_status_refunded',   array( __CLASS__, 'cancel_order' ) );
        // Frontend
        add_action( 'woocommerce_thankyou',                               array( __CLASS__, 'thankyou_info' ) );
        add_action( 'woocommerce_order_details_after_order_table',        array( __CLASS__, 'myaccount_info' ) );
    }

    public static function process_order( $order_id ) {
        $order_id = (int) $order_id;
        $order    = wc_get_order( $order_id );
        if ( ! $order ) return;

        // Zabrání dvojímu spuštění
        if ( $order->get_meta( '_zoo_vouchers_done' ) ) return;

        $voucher_ids = array();

        foreach ( $order->get_items() as $item ) {
            $product_id = $item->get_product_id();
            $type       = get_post_meta( $product_id, '_zoo_voucher_type', true );
            if ( ! $type ) continue;

            $qty = (int) $item->get_quantity();
            for ( $i = 0; $i < $qty; $i++ ) {
                $vid = Zoo_Vouchers_Generator::create_from_order_item( $order, $item );
                if ( $vid ) {
                    $voucher_ids[] = $vid;
                } else {
                    $order->add_order_note( 'Zoo Vouchers: Nepodarilo se vytvorit voucher pro produkt #' . $product_id . ' (' . $type . '). Zkontrolujte nastaveni produktu - varianta.' );
                }
            }
        }

        if ( empty( $voucher_ids ) ) return;

        // Jeden souhrnný email se všemi vouchery
        Zoo_Vouchers_Email::send_vouchers( $voucher_ids, $order );

        $order->update_meta_data( '_zoo_vouchers_done', '1' );
        $order->save();
        $order->add_order_note( 'Zoo Vouchers: ' . count( $voucher_ids ) . ' voucher(y) vygenerovány a odeslány.' );
    }

    public static function cancel_order( $order_id ) {
        foreach ( Zoo_Vouchers_Database::get_by_order( (int) $order_id ) as $row ) {
            if ( $row->status !== 'active' ) continue;
            Zoo_Vouchers_Database::update( (int) $row->id, array( 'status' => 'cancelled' ) );
            if ( $row->amelia_coupon_id ) {
                Zoo_Vouchers_Amelia::deactivate_coupon( (int) $row->amelia_coupon_id );
            }
        }
    }

    public static function thankyou_info( $order_id ) {
        $rows = Zoo_Vouchers_Database::get_by_order( (int) $order_id );
        if ( empty( $rows ) ) return;
        echo '<section style="margin-top:30px;">';
        echo '<h2>Vaše vouchery</h2>';
        echo '<p>Vouchery byly odeslány na Váš email. Kódy níže:</p><ul>';
        foreach ( $rows as $row ) {
            $v   = new Zoo_Vouchers_Voucher( $row );
            $url = Zoo_Vouchers_PDF::get_download_url( $v->code );
            echo '<li><strong>' . esc_html( $v->type_label() );
            if ( $v->is_krmeni() && $v->animal_key ) echo ' – ' . esc_html( $v->animal_label() );
            echo '</strong>: <code>' . esc_html( $v->code ) . '</code> ';
            echo '(<a href="' . esc_url( $url ) . '">Stáhnout PDF</a>)</li>';
        }
        echo '</ul></section>';
    }

    public static function myaccount_info( $order ) {
        if ( is_object( $order ) && method_exists( $order, 'get_id' ) ) {
            self::thankyou_info( $order->get_id() );
        }
    }
}
