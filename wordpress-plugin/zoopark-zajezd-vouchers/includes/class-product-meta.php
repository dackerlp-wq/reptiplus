<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_Product_Meta {

    public static function init(): void {
        add_action( 'woocommerce_product_options_general_product_data', [ __CLASS__, 'render' ] );
        add_action( 'woocommerce_process_product_meta',                 [ __CLASS__, 'save' ] );
        add_action( 'admin_footer',                                     [ __CLASS__, 'js' ] );
    }

    public static function render(): void {
        $pid     = get_the_ID();
        $type    = get_post_meta( $pid, '_zoo_voucher_type',            true );
        $variant = get_post_meta( $pid, '_zoo_voucher_variant',         true );
        $animal  = get_post_meta( $pid, '_zoo_voucher_animal',          true );
        $months  = get_post_meta( $pid, '_zoo_voucher_validity_months', true ) ?: '12';

        echo '<div class="options_group zoo-voucher-panel" style="border-top:3px solid #e8a000; margin-top:10px;">';
        echo '<p style="padding:10px 12px 4px; font-weight:700; font-size:13px; color:#7a4f00;">🎟 Nastavení voucheru</p>';

        // Typ dokumentu
        woocommerce_wp_select( [
            'id'          => '_zoo_voucher_type',
            'label'       => 'Typ voucheru',
            'value'       => $type,
            'options'     => array_merge( [ '' => '— Není voucher —' ], Zoo_Vouchers_Config::TYPES ),
            'desc_tip'    => true,
            'description' => 'Při nákupu se automaticky vygeneruje PDF voucher.',
        ] );

        // Varianta (vstupenky / permanentky)
        echo '<div class="zoo-variant-row" style="' . ( $type === 'krmeni' || ! $type ? 'display:none;' : '' ) . '">';
        woocommerce_wp_select( [
            'id'          => '_zoo_voucher_variant',
            'label'       => 'Varianta',
            'value'       => $variant,
            'options'     => array_merge( [ '' => '— Vyberte variantu —' ], Zoo_Vouchers_Config::ENTRY_VARIANTS ),
            'desc_tip'    => true,
            'description' => 'Varianta vstupenky/permanentky. U variabilních produktů se detekuje automaticky z názvu variace – pak nechte prázdné.',
        ] );
        echo '</div>';

        // Zvíře (krmení)
        echo '<div class="zoo-animal-row" style="' . ( $type !== 'krmeni' ? 'display:none;' : '' ) . '">';
        woocommerce_wp_select( [
            'id'          => '_zoo_voucher_animal',
            'label'       => 'Zvíře (Amelia)',
            'value'       => $animal,
            'options'     => array_merge( [ '' => '— Vyberte zvíře —' ], Zoo_Vouchers_Config::AMELIA_SERVICE_LABELS ),
            'desc_tip'    => true,
            'description' => 'Mapuje se na Amelia service ID – rezervace krmení.',
        ] );
        echo '</div>';

        // Platnost
        woocommerce_wp_text_input( [
            'id'                => '_zoo_voucher_validity_months',
            'label'             => 'Platnost (měsíce)',
            'type'              => 'number',
            'value'             => $months,
            'desc_tip'          => true,
            'description'       => 'Počet měsíců od nákupu.',
            'custom_attributes' => [ 'min' => '1', 'max' => '60' ],
        ] );

        echo '</div>';
    }

    public static function save( int $pid ): void {
        update_post_meta( $pid, '_zoo_voucher_type',
            sanitize_key( $_POST['_zoo_voucher_type'] ?? '' ) );
        update_post_meta( $pid, '_zoo_voucher_variant',
            sanitize_key( $_POST['_zoo_voucher_variant'] ?? '' ) );
        update_post_meta( $pid, '_zoo_voucher_animal',
            sanitize_key( $_POST['_zoo_voucher_animal'] ?? '' ) );
        update_post_meta( $pid, '_zoo_voucher_validity_months',
            max( 1, absint( $_POST['_zoo_voucher_validity_months'] ?? 12 ) ) );
    }

    /** JS – zobrazit/skrýt pole podle vybraného typu */
    public static function js(): void {
        $screen = get_current_screen();
        if ( ! $screen || $screen->id !== 'product' ) return;
        ?>
        <script>
        jQuery(function($){
            function zooToggle() {
                var type = $('#_zoo_voucher_type').val();
                $('.zoo-animal-row').toggle( type === 'krmeni' );
                $('.zoo-variant-row').toggle( type !== 'krmeni' && type !== '' );
            }
            $('#_zoo_voucher_type').on('change', zooToggle);
            zooToggle();
        });
        </script>
        <?php
    }
}
