<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_Order_Metabox {

    public static function init() {
        add_action( 'add_meta_boxes',                    array( __CLASS__, 'register' ) );
        add_action( 'wp_ajax_zoo_order_voucher_action',  array( __CLASS__, 'ajax_action' ) );
        add_action( 'admin_footer',                      array( __CLASS__, 'scripts' ) );
    }

    public static function register() {
        // Klasické WC orders
        add_meta_box(
            'zoo-vouchers-order',
            'Zoo Vouchery',
            array( __CLASS__, 'render' ),
            'shop_order',
            'normal',
            'high'
        );

        // HPOS – registruje se přes stejný hook ale na jiný screen
        if ( class_exists( 'Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController' ) ) {
            $screen = wc_get_page_screen_id( 'shop-order' );
            if ( $screen && $screen !== 'shop_order' ) {
                add_meta_box(
                    'zoo-vouchers-order',
                    'Zoo Vouchery',
                    array( __CLASS__, 'render' ),
                    $screen,
                    'normal',
                    'high'
                );
            }
        }
    }

    public static function render( $post_or_order ) {
        if ( $post_or_order instanceof WP_Post ) {
            $order_id = $post_or_order->ID;
        } elseif ( is_object( $post_or_order ) && method_exists( $post_or_order, 'get_id' ) ) {
            $order_id = $post_or_order->get_id();
        } else {
            $order_id = absint( $post_or_order );
        }

        if ( ! $order_id ) return;

        $rows  = Zoo_Vouchers_Database::get_by_order( $order_id );
        $nonce = wp_create_nonce( 'zoo_order_action_' . $order_id );
        $order = wc_get_order( $order_id );

        echo '<div id="zoo-order-metabox" style="margin:-6px -12px -12px;">';

        if ( empty( $rows ) ) {
            echo '<p style="padding:14px 16px;color:#888;margin:0;">Tato objednavka neobsahuje zadne vouchery.</p>';
        } else {
            foreach ( $rows as $row ) {
                $v = new Zoo_Vouchers_Voucher( $row );
                self::render_row( $v, $nonce );
            }
            echo '<div id="zoo-action-log-' . $order_id . '" style="padding:8px 16px;font-size:12px;color:#666;border-top:1px solid #eee;display:none;"></div>';
        }

        // Tlačítko generovat – pokud ještě nebyly vygenerovány
        if ( $order && ! $order->get_meta( '_zoo_vouchers_done' ) ) {
            echo '<div style="padding:12px 16px;border-top:1px solid #eee;background:#fffbe6;">';
            echo '<p style="margin:0 0 8px;font-size:12px;color:#856404;">Vouchery pro tuto objednavku jeste nebyly vygenerovany.</p>';
            echo '<button type="button" class="button button-primary zoo-order-action"'
                . ' data-action="generate" data-order="' . $order_id . '" data-nonce="' . $nonce . '">'
                . 'Vygenerovat nyni</button>';
            echo '</div>';
        }

        echo '</div>';
    }

    private static function render_row( $v, $nonce ) {
        $status_colors  = array( 'active' => '#1a7a1a', 'used' => '#666', 'expired' => '#c00', 'cancelled' => '#c00' );
        $status_icons   = array( 'active' => '●', 'used' => '✓', 'expired' => '✗', 'cancelled' => '✗' );
        $status_labels  = array( 'active' => 'Aktivni', 'used' => 'Pouzit', 'expired' => 'Vyprsel', 'cancelled' => 'Zrusen' );

        $color = isset( $status_colors[ $v->status ] ) ? $status_colors[ $v->status ] : '#333';
        $icon  = isset( $status_icons[ $v->status ] )  ? $status_icons[ $v->status ]  : '?';
        $label = isset( $status_labels[ $v->status ] ) ? $status_labels[ $v->status ] : $v->status;

        echo '<div class="zoo-voucher-row" id="zoo-row-' . $v->id . '" style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">';

        // Hlavní info
        echo '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">';

        // Levá část – kód + typ
        echo '<div style="flex:1;min-width:200px;">';
        echo '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">';
        echo '<code style="font-size:14px;font-weight:700;letter-spacing:1px;color:#1c4426;">' . esc_html( $v->code ) . '</code>';
        echo '<span style="font-size:12px;font-weight:600;color:' . $color . ';">' . $icon . ' ' . $label . '</span>';
        echo '</div>';

        echo '<div style="font-size:12px;color:#555;line-height:1.6;">';
        echo '<strong>' . esc_html( $v->type_label() ) . '</strong>';
        if ( $v->variant_label() ) echo ' &middot; ' . esc_html( $v->variant_label() );
        if ( $v->is_krmeni() && $v->animal_key ) echo ' &middot; <em>' . esc_html( $v->animal_label() ) . '</em>';
        echo '</div>';

        if ( $v->recipient_name ) {
            echo '<div style="font-size:12px;color:#888;margin-top:2px;">Pro: ' . esc_html( $v->recipient_name ) . '</div>';
        }
        echo '</div>';

        // Pravá část – datumy
        echo '<div style="font-size:11px;color:#888;text-align:right;line-height:1.8;white-space:nowrap;">';
        echo '<div>Vytvoreno: ' . esc_html( date_i18n( 'd.m.Y', strtotime( $v->created_at ) ) ) . '</div>';
        echo '<div>Plati do: <strong>' . ( $v->valid_until ? esc_html( date_i18n( 'd.m.Y', strtotime( $v->valid_until ) ) ) : '&ndash;' ) . '</strong></div>';
        if ( $v->used_at ) echo '<div style="color:#c00;">Pouzit: ' . esc_html( date_i18n( 'd.m.Y H:i', strtotime( $v->used_at ) ) ) . '</div>';
        if ( $v->amelia_coupon_id ) echo '<div style="color:#1c4426;">Amelia #' . (int) $v->amelia_coupon_id . '</div>';
        echo '</div>';

        echo '</div>'; // flex row

        // Akční tlačítka
        echo '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">';

        // PDF – stáhnout
        echo '<a href="' . esc_url( Zoo_Vouchers_PDF::get_download_url( $v->code ) ) . '" target="_blank" class="button button-small" style="font-size:12px;">&#128196; Stáhnout PDF</a>';

        // Přegenerovat PDF
        echo '<button type="button" class="button button-small zoo-order-action" style="font-size:12px;"'
            . ' data-action="regenerate" data-voucher="' . $v->id . '" data-order="' . $v->order_id . '" data-nonce="' . $nonce . '"'
            . ' title="Smaze stare PDF a vygeneruje nove s aktualnim nastavenim">'
            . '&#8635; Přegenerovat PDF</button>';

        if ( $v->status === 'active' ) {
            echo '<button type="button" class="button button-small zoo-order-action" style="font-size:12px;"'
                . ' data-action="resend" data-voucher="' . $v->id . '" data-order="' . $v->order_id . '" data-nonce="' . $nonce . '">'
                . 'Odeslat email</button>';

            echo '<button type="button" class="button button-small zoo-order-action" style="font-size:12px;"'
                . ' data-action="mark_used" data-voucher="' . $v->id . '" data-order="' . $v->order_id . '" data-nonce="' . $nonce . '"'
                . ' data-confirm="Oznacit jako pouzity?">'
                . 'Pouzit</button>';

            echo '<button type="button" class="button button-small zoo-order-action" style="font-size:12px;color:#c00;"'
                . ' data-action="cancel" data-voucher="' . $v->id . '" data-order="' . $v->order_id . '" data-nonce="' . $nonce . '"'
                . ' data-confirm="Zrusit voucher?">'
                . 'Zrusit</button>';

        } else {
            echo '<button type="button" class="button button-small zoo-order-action" style="font-size:12px;"'
                . ' data-action="reactivate" data-voucher="' . $v->id . '" data-order="' . $v->order_id . '" data-nonce="' . $nonce . '"'
                . ' data-confirm="Reaktivovat voucher?">'
                . 'Reaktivovat</button>';
        }

        echo '</div>';

        // Zpráva pro tento řádek
        echo '<div id="zoo-msg-' . $v->id . '" style="display:none;margin-top:8px;padding:6px 10px;border-radius:4px;font-size:12px;"></div>';

        echo '</div>'; // zoo-voucher-row
    }

    public static function ajax_action() {
        $action     = sanitize_key( isset( $_POST['do'] )         ? $_POST['do']         : '' );
        $voucher_id = (int) ( isset( $_POST['voucher_id'] )       ? $_POST['voucher_id'] : 0 );
        $order_id   = (int) ( isset( $_POST['order_id'] )         ? $_POST['order_id']   : 0 );
        $nonce      = sanitize_text_field( isset( $_POST['nonce'] ) ? $_POST['nonce']     : '' );

        if ( ! wp_verify_nonce( $nonce, 'zoo_order_action_' . $order_id ) ) {
            wp_send_json_error( 'Neplatny token.' );
        }
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_send_json_error( 'Nedostatecna opravneni.' );
        }

        if ( $action === 'generate' && $order_id ) {
            $order = wc_get_order( $order_id );
            if ( ! $order ) wp_send_json_error( 'Objednavka nenalezena.' );
            $order->delete_meta_data( '_zoo_vouchers_done' );
            $order->save();
            Zoo_Vouchers_WC_Hooks::process_order( $order_id );
            wp_send_json_success( array( 'msg' => 'Vouchery vygenerovany.', 'reload' => true ) );
        }

        if ( ! $voucher_id ) wp_send_json_error( 'Chybi ID voucheru.' );

        $voucher = Zoo_Vouchers_Voucher::find_by_id( $voucher_id );
        if ( ! $voucher ) wp_send_json_error( 'Voucher nenalezen.' );

        if ( $action === 'resend' ) {
            $ok = Zoo_Vouchers_Email::send_voucher( $voucher_id );
            wp_send_json_success( array( 'msg' => $ok ? 'Email odeslan.' : 'Email se nepodarilo odeslat.' ) );

        } elseif ( $action === 'mark_used' ) {
            $voucher->mark_used();
            wp_send_json_success( array( 'msg' => 'Voucher oznacen jako pouzity.', 'reload' => true ) );

        } elseif ( $action === 'cancel' ) {
            Zoo_Vouchers_Database::update( $voucher_id, array( 'status' => 'cancelled' ) );
            if ( $voucher->amelia_coupon_id ) {
                Zoo_Vouchers_Amelia::deactivate_coupon( $voucher->amelia_coupon_id );
            }
            wp_send_json_success( array( 'msg' => 'Voucher zrusen.', 'reload' => true ) );

        } elseif ( $action === 'reactivate' ) {
            Zoo_Vouchers_Database::update( $voucher_id, array( 'status' => 'active', 'used_at' => null ) );
            wp_send_json_success( array( 'msg' => 'Voucher reaktivovan.', 'reload' => true ) );

        } elseif ( $action === 'regenerate' ) {
            // Smaž staré PDF
            $upload   = wp_upload_dir();
            $filepath = trailingslashit( $upload['basedir'] ) . 'zoo-vouchers/voucher-' . $voucher->code . '.pdf';
            if ( file_exists( $filepath ) ) {
                unlink( $filepath );
            }
            // Vygeneruj nové
            $new_path = Zoo_Vouchers_PDF::generate( $voucher_id );
            if ( $new_path && file_exists( $new_path ) ) {
                wp_send_json_success( array( 'msg' => 'PDF pregenerovano.' ) );
            } else {
                wp_send_json_error( 'PDF se nepodarilo vygenerovat. Zkontroluj zda je FPDF nainstalovano.' );
            }

        } else {
            wp_send_json_error( 'Neznama akce.' );
        }
    }

    public static function scripts() {
        $screen = get_current_screen();
        if ( ! $screen ) return;
        if ( $screen->id !== 'shop_order' && strpos( $screen->id, 'wc-orders' ) === false ) return;
        ?>
        <script>
        (function($){
            $(document).on('click', '.zoo-order-action', function(){
                var btn    = $(this);
                var action = btn.data('action');
                var vid    = btn.data('voucher') || 0;
                var oid    = btn.data('order');
                var nonce  = btn.data('nonce');
                var conf   = btn.data('confirm');
                if ( conf && ! confirm(conf) ) return;
                btn.prop('disabled', true).css('opacity', .6);
                $.post(ajaxurl, {
                    action:     'zoo_order_voucher_action',
                    do:         action,
                    voucher_id: vid,
                    order_id:   oid,
                    nonce:      nonce
                }, function(res){
                    if ( res.success ) {
                        if ( vid ) {
                            var $m = $('#zoo-msg-' + vid);
                            $m.text(res.data.msg).css({ display:'block', background:'#d4edda', color:'#155724', border:'1px solid #c3e6cb' });
                        } else {
                            $('#zoo-action-log-' + oid).text(res.data.msg).show();
                        }
                        if ( res.data.reload ) setTimeout(function(){ location.reload(); }, 1200);
                    } else {
                        alert(res.data || 'Chyba.');
                        btn.prop('disabled', false).css('opacity', 1);
                    }
                });
            });
        })(jQuery);
        </script>
        <?php
    }
}
