<?php
/**
 * Plugin Name: Zoopark Zájezd Vouchers
 * Plugin URI:  https://zoopark-zajezd.cz
 * Description: Kompletní systém voucherů pro Zoopark Zájezd – generování vstupenek, permanentek a poukazů na krmení (PDF + QR + email + Amelia + WC kupony) a pokladní ověřování se skenerem QR. Sjednocuje původní pluginy „Zoo Vouchers v2" a „Zoo Voucher Checker".
 * Version:     3.0.0
 * Author:      Zoopark Zájezd
 * Text Domain: zoo-vouchers
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'ZOO_VOUCHERS_VERSION', '3.0.0' );
define( 'ZOO_VOUCHERS_PATH',    plugin_dir_path( __FILE__ ) );
define( 'ZOO_VOUCHERS_URL',     plugin_dir_url( __FILE__ ) );

// Aktivační hook – musí být mimo plugins_loaded
register_activation_hook( __FILE__, function() {
    require_once ZOO_VOUCHERS_PATH . 'includes/class-database.php';
    Zoo_Vouchers_Database::create_table();
} );

add_action( 'plugins_loaded', function () {

    // Načti soubory až TADY – po načtení WordPressu a WooCommerce
    require_once ZOO_VOUCHERS_PATH . 'includes/class-database.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-config.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-voucher.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-generator.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-pdf.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-email.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-amelia.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-wc-coupon.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-admin.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-validator.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-rest.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-legacy-admin.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-product-meta.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-product-fields.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-order-metabox.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-settings.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-manual.php';
    require_once ZOO_VOUCHERS_PATH . 'includes/class-wc-hooks.php';

    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', function() {
            echo '<div class="error"><p><strong>Zoopark Zájezd Vouchers:</strong> Vyžaduje aktivní WooCommerce.</p></div>';
        } );
        return;
    }

    Zoo_Vouchers_WC_Hooks::init();
    Zoo_Vouchers_WC_Coupon::init();
    Zoo_Vouchers_Admin::init();
    Zoo_Vouchers_Product_Meta::init();
    Zoo_Vouchers_Validator::init();
    Zoo_Vouchers_Product_Fields::init();
    Zoo_Vouchers_Order_Metabox::init();
    Zoo_Vouchers_Settings::init();
    Zoo_Vouchers_Manual::init();
    Zoo_Vouchers_Legacy_Admin::init();

    // REST rozhraní pokladny (nové vouchery + starší SkyVerge)
    new Zoo_Vouchers_REST();

    // Hooky z tříd které byly dřív globálně
    add_action( 'init',              array( 'Zoo_Vouchers_PDF',    'handle_download' ) );

} );
