<?php
defined( 'ABSPATH' ) || exit;

/**
 * Servisní nástroj pro STARŠÍ SkyVerge vouchery (post_type wc_voucher).
 *
 * Vymaže metadata čtečky (_zvc_redeemed_at) u vybraných SkyVerge voucherů,
 * aby je bylo možné znovu ověřit na pokladně. Stav voucheru (post_status)
 * se nemění — to řešte přímo v SkyVerge.
 *
 * Přeneseno z původního pluginu „Zoo Voucher Checker". Nové vouchery
 * (zoo_vouchers) se resetují tlačítkem „Reaktivovat" v přehledu voucherů.
 *
 * WP Admin → WooCommerce → Vymazat metadata čtečky
 */
class Zoo_Vouchers_Legacy_Admin {

    public static function init() {
        // Zobraz jen když je aktivní podpora SkyVerge
        if ( ! apply_filters( 'zoo_vouchers_legacy_skyverge', true ) ) return;
        add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
    }

    public static function menu() {
        add_submenu_page(
            'woocommerce',
            'Vymazat metadata čtečky (SkyVerge)',
            'Metadata čtečky (SkyVerge)',
            'manage_woocommerce',
            'zoo-wipe-legacy-meta',
            array( __CLASS__, 'render_page' )
        );
    }

    public static function render_page() {
        if ( ! current_user_can( 'manage_woocommerce' ) ) { wp_die( 'Nemáš oprávnění.' ); }

        $done = null; $err = null;
        $order_id_val = isset( $_POST['zvc_order_id'] ) ? sanitize_text_field( $_POST['zvc_order_id'] ) : '';
        $ids_val      = isset( $_POST['zvc_ids'] )      ? sanitize_text_field( $_POST['zvc_ids'] )      : '';
        $reset_detect = ! empty( $_POST['zvc_reset_detected'] );

        if ( isset( $_POST['zvc_wipe_submit'] ) ) {
            check_admin_referer( 'zvc_wipe_action', 'zvc_wipe_nonce' );
            $ids = array();
            if ( $ids_val ) {
                $parts = preg_split( '/[,\s]+/', $ids_val );
                foreach ( $parts as $p ) { $p = trim( $p ); if ( $p !== '' && ctype_digit( $p ) ) $ids[] = (int) $p; }
            }
            if ( empty( $ids ) && $order_id_val !== '' && ctype_digit( $order_id_val ) ) {
                $order_id = (int) $order_id_val;
                $q = new WP_Query( array(
                    'post_type'      => 'wc_voucher', 'post_status' => 'any',
                    'posts_per_page' => 1000, 'fields' => 'ids',
                    'meta_query'     => array( array( 'key' => '_order_id', 'value' => $order_id ) ),
                    'no_found_rows'  => true,
                ) );
                $ids = array_map( 'intval', $q->posts ?: array() );
            }
            if ( empty( $ids ) ) {
                $err = 'Zadej alespoň ID objednávky nebo seznam ID voucherů.';
            } else {
                $wiped = 0; $skipped = 0;
                foreach ( $ids as $id ) {
                    $p = get_post( $id );
                    if ( ! $p || $p->post_type !== 'wc_voucher' ) { $skipped++; continue; }
                    delete_post_meta( $id, '_zvc_redeemed_at' );
                    $wiped++;
                }
                if ( $reset_detect ) { delete_option( 'zvc_detected_secure_meta_key' ); }
                $done = sprintf( 'Hotovo. Vymazaných záznamů: %d, přeskočeno: %d', $wiped, $skipped )
                      . ( $reset_detect ? ' — resetován detekovaný meta klíč' : '' );
            }
        }

        echo '<div class="wrap"><h1>Vymazat metadata čtečky (SkyVerge)</h1>';
        echo '<p style="color:#666;max-width:780px;">Týká se pouze starších SkyVerge voucherů (<code>wc_voucher</code>). Nové vouchery reaktivujte v přehledu <a href="' . esc_url( admin_url( 'admin.php?page=zoo-vouchers' ) ) . '">Zoo Vouchery</a>.</p>';
        if ( $done ) echo '<div class="notice notice-success"><p>' . esc_html( $done ) . '</p></div>';
        if ( $err )  echo '<div class="notice notice-error"><p>' . esc_html( $err ) . '</p></div>';
        echo '<form method="post" style="max-width:780px">';
        wp_nonce_field( 'zvc_wipe_action', 'zvc_wipe_nonce' );
        echo '<h2>Cílení</h2>';
        echo '<p>Buď zadej ID objednávky (smaže u všech jejích voucherů), nebo konkrétní ID voucherů.</p>';
        echo '<p><label for="zvc_order_id"><strong>ID objednávky</strong></label><br/>
              <input type="number" min="1" step="1" id="zvc_order_id" name="zvc_order_id" class="regular-text"
              value="' . esc_attr( $order_id_val ) . '" placeholder="např. 15511"></p>';
        echo '<p><label for="zvc_ids"><strong>ID voucherů (oddělené čárkou nebo mezerou)</strong></label><br/>
              <textarea id="zvc_ids" name="zvc_ids" rows="3" class="large-text"
              placeholder="např. 123, 124, 125">' . esc_textarea( $ids_val ) . '</textarea></p>';
        echo '<h2>Co se smaže</h2>
              <ul style="list-style:disc;margin-left:20px">
                <li>Meta klíč <code>_zvc_redeemed_at</code> (čas uplatnění podle naší čtečky)</li>
              </ul>';
        echo '<p><label><input type="checkbox" name="zvc_reset_detected" value="1">
              Resetovat i detekovaný meta klíč (<code>zvc_detected_secure_meta_key</code>)</label></p>';
        echo '<p><em>Pozn.: Stav voucheru (post_status) se NEMĚNÍ. Pokud chceš měnit stav, udělej to v SkyVerge.</em></p>';
        submit_button( 'Vymazat metadata', 'primary', 'zvc_wipe_submit' );
        echo '</form></div>';
    }
}
