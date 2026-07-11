<?php
defined( 'ABSPATH' ) || exit;

/**
 * REST rozhraní pokladny — sjednocuje ověřování dvou generací voucherů:
 *
 *   source "zoo" … nové vouchery v tabulce wp_zoo_vouchers (Zoo_Vouchers_*)
 *   source "sky" … starší SkyVerge PDF Product Vouchers (post_type wc_voucher)
 *
 * Endpoints (namespace zoo/v1):
 *   POST /check-voucher  { code }               → ověří a rovnou uplatní aktivní voucher
 *   GET  /order          ?order_id=123          → všechny vouchery objednávky (oba zdroje)
 *   POST /redeem         { items:[{source,id}] } → hromadné uplatnění
 *
 * Podpora SkyVerge se dá vypnout filtrem `zoo_vouchers_legacy_skyverge` → false.
 */
class Zoo_Vouchers_REST {

    /** Meta klíče, pod kterými bývá uložen zabezpečený kód SkyVerge voucheru. */
    private $secure_meta_keys = array(
        '_voucher_secure_code', '_secure_code', '_voucher_code', '_sv_secure_code', 'voucher_secure_code', '_zvc_code'
    );
    private $option_detected_key = 'zvc_detected_secure_meta_key';

    /** Produkty parkování (pro souhrnné počítadlo). */
    private $parking_product_ids = array( 14704, 14705 );

    public function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_routes' ) );
    }

    public function register_routes() {
        register_rest_route( 'zoo/v1', '/check-voucher', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( $this, 'check_voucher' ),
            'permission_callback' => '__return_true',
        ) );
        register_rest_route( 'zoo/v1', '/order', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( $this, 'get_order_vouchers' ),
            'permission_callback' => '__return_true',
            'args'                => array( 'order_id' => array( 'required' => true, 'type' => 'integer' ) ),
        ) );
        register_rest_route( 'zoo/v1', '/redeem', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( $this, 'redeem_bulk' ),
            'permission_callback' => '__return_true',
        ) );
    }

    private function legacy_enabled() {
        return (bool) apply_filters( 'zoo_vouchers_legacy_skyverge', true );
    }

    /* ─────────────────────────────────────────────────────────────
       CHECK — ověření + automatické uplatnění jednoho kódu
    ───────────────────────────────────────────────────────────── */
    public function check_voucher( WP_REST_Request $r ) {
        $raw = (string) $r->get_param( 'code' );
        if ( $raw === '' ) return array( 'status' => 'error', 'message' => 'Chybí kód voucheru.' );

        $code = $this->extract_code( $raw );

        // 1) Nové vouchery (zoo_vouchers) — kódy jsou verzálky ZOO-XXXX-XXXX
        $zoo = Zoo_Vouchers_Database::get_by_code( strtoupper( $code ) );
        if ( $zoo ) {
            return $this->handle_zoo_check( new Zoo_Vouchers_Voucher( $zoo ) );
        }

        // 2) Fallback na SkyVerge
        if ( $this->legacy_enabled() ) {
            $sky = $this->find_skyverge( $code );
            if ( $sky ) {
                return $this->handle_sky_check( $sky );
            }
        }

        return array( 'status' => 'invalid', 'message' => 'Voucher nenalezen.', 'raw' => $raw );
    }

    private function handle_zoo_check( Zoo_Vouchers_Voucher $v ) {
        $info = $this->zoo_voucher_info( $v );

        if ( $v->status === 'used' ) {
            return $this->zoo_group_response( 'used', 'Voucher už byl použit.', $v, $info );
        }
        if ( $v->status === 'expired' ) {
            return $this->zoo_group_response( 'expired', 'Voucher je po expiraci.', $v, $info );
        }
        if ( $v->status === 'cancelled' ) {
            return $this->zoo_group_response( 'invalid', 'Voucher byl zrušen.', $v, $info );
        }
        // active — ale ověř i platnost (is_active() případně sám nastaví expired)
        if ( ! $v->is_active() ) {
            $v = Zoo_Vouchers_Voucher::find_by_id( $v->id ); // znovu načti aktuální stav
            return $this->zoo_group_response( 'expired', 'Voucher je po expiraci.', $v, $this->zoo_voucher_info( $v ) );
        }

        // Na pokladně se uplatňují jen vstupenky. Permanentky (opakovaný vstup)
        // ani krmení (uplatnění přes rezervaci Amelia) se zde NEoznačují jako
        // použité — jen se zobrazí, aby pokladní viděl(a), že jsou platné.
        if ( ! $this->is_redeemable_type( $v->doc_type ) ) {
            return $this->zoo_group_response( 'noredeem', $this->noredeem_message( $v->doc_type ), $v, $this->zoo_voucher_info( $v ) );
        }

        // NEuplatňujeme automaticky — pokladní musí potvrdit ručně tlačítkem „Uplatnit".
        return $this->zoo_group_response( 'ready', 'Vstupenka je platná — potvrďte uplatnění tlačítkem „Uplatnit".', $v, $this->zoo_voucher_info( $v ) );
    }

    private function zoo_group_response( $status, $message, $v, $info ) {
        $siblings = $this->siblings_for_order( (int) $v->order_id );
        // Naskenovaný voucher musí být v seznamu vždy — i ručně vytvořený
        // (order_id = 0), který nemá žádné sourozence z objednávky.
        if ( ! $this->is_hidden_type( $v->doc_type ) && ! $this->key_in_siblings( 'zoo:' . (int) $v->id, $siblings ) ) {
            array_unshift( $siblings, $this->zoo_item( $v ) );
        }
        return array(
            'status'   => $status,
            'message'  => $message,
            'voucher'  => $info,
            'scanned'  => 'zoo:' . (int) $v->id,
            'group'    => array( 'order_id' => (int) $v->order_id, 'counts' => $this->count_parking( $siblings ) ),
            'siblings' => $siblings,
        );
    }

    private function handle_sky_check( $voucher ) {
        $info   = $this->sky_voucher_info( $voucher );
        $status = $voucher->post_status;

        if ( $status === 'wcpdf-redeemed' ) {
            return $this->sky_group_response( 'used', 'Voucher už byl použit.', $voucher, $info );
        }
        if ( $status === 'wcpdf-expired' ) {
            return $this->sky_group_response( 'expired', 'Voucher je po expiraci.', $voucher, $info );
        }
        if ( $status !== 'wcpdf-active' && $status !== 'publish' ) {
            return $this->sky_group_response( 'invalid', 'Voucher není aktivní.', $voucher, $info );
        }

        // NEuplatňujeme automaticky — pokladní musí potvrdit ručně tlačítkem „Uplatnit".
        return $this->sky_group_response( 'ready', 'Vstupenka je platná — potvrďte uplatnění tlačítkem „Uplatnit".', $voucher, $info );
    }

    private function sky_group_response( $status, $message, $voucher, $info ) {
        $order_id = $this->sky_order_id_for( $voucher->ID );
        $siblings = $this->siblings_for_order( $order_id );
        if ( ! $this->key_in_siblings( 'sky:' . (int) $voucher->ID, $siblings ) ) {
            array_unshift( $siblings, $this->sky_item( $voucher ) );
        }
        return array(
            'status'   => $status,
            'message'  => $message,
            'voucher'  => $info,
            'scanned'  => 'sky:' . (int) $voucher->ID,
            'group'    => array( 'order_id' => $order_id, 'counts' => $this->count_parking( $siblings ) ),
            'siblings' => $siblings,
        );
    }

    /* ─────────────────────────────────────────────────────────────
       ORDER — všechny vouchery objednávky (oba zdroje sloučené)
    ───────────────────────────────────────────────────────────── */
    public function get_order_vouchers( WP_REST_Request $r ) {
        $order_id = (int) $r->get_param( 'order_id' );
        if ( ! $order_id ) return new WP_REST_Response( array( 'ok' => false, 'message' => 'Chybí order_id.' ), 200 );

        $siblings = $this->siblings_for_order( $order_id );
        if ( ! $siblings ) {
            return new WP_REST_Response( array( 'ok' => false, 'message' => 'Pro tuto objednávku nejsou žádné vouchery.' ), 200 );
        }
        return new WP_REST_Response( array(
            'ok'       => true,
            'group'    => array( 'order_id' => $order_id, 'counts' => $this->count_parking( $siblings ) ),
            'siblings' => $siblings,
        ), 200 );
    }

    /* ─────────────────────────────────────────────────────────────
       REDEEM — hromadné uplatnění napříč zdroji
    ───────────────────────────────────────────────────────────── */
    public function redeem_bulk( WP_REST_Request $r ) {
        $items = $r->get_param( 'items' );

        // Zpětná kompatibilita: holé pole ids se bere jako zoo vouchery
        if ( ! is_array( $items ) || empty( $items ) ) {
            $ids = $r->get_param( 'ids' );
            if ( is_array( $ids ) && ! empty( $ids ) ) {
                $items = array_map( function( $id ) { return array( 'source' => 'zoo', 'id' => (int) $id ); }, $ids );
            }
        }
        if ( ! is_array( $items ) || empty( $items ) ) {
            return new WP_REST_Response( array( 'ok' => false, 'message' => 'Chybí položky.' ), 200 );
        }

        $updated = array();
        $skipped = array();

        foreach ( $items as $it ) {
            $source = isset( $it['source'] ) ? sanitize_key( $it['source'] ) : 'zoo';
            $id     = isset( $it['id'] ) ? (int) $it['id'] : 0;
            if ( ! $id ) { $skipped[] = $it; continue; }

            if ( $source === 'sky' ) {
                if ( ! $this->legacy_enabled() ) { $skipped[] = $it; continue; }
                $post = get_post( $id );
                if ( ! $post || $post->post_type !== 'wc_voucher' ) { $skipped[] = $it; continue; }
                $st = get_post_status( $id );
                if ( $st !== 'wcpdf-active' && $st !== 'publish' ) { $skipped[] = $it; continue; }
                $ok = wp_update_post( array( 'ID' => $id, 'post_status' => 'wcpdf-redeemed' ), true );
                if ( ! is_wp_error( $ok ) ) {
                    update_post_meta( $id, '_zvc_redeemed_at', time() );
                    $updated[] = array( 'source' => 'sky', 'id' => $id );
                } else {
                    $skipped[] = $it;
                }
            } else {
                $v = Zoo_Vouchers_Voucher::find_by_id( $id );
                if ( ! $v || ! $v->is_active() ) { $skipped[] = $it; continue; }
                // Jen vstupenky — permanentky a krmení se na pokladně neuplatňují
                if ( ! $this->is_redeemable_type( $v->doc_type ) ) { $skipped[] = $it; continue; }
                $v->mark_used();
                $updated[] = array( 'source' => 'zoo', 'id' => $id );
            }
        }

        return new WP_REST_Response( array( 'ok' => true, 'updated' => $updated, 'skipped' => $skipped ), 200 );
    }

    /* ─────────────────────────────────────────────────────────────
       Sloučení sourozenců objednávky z obou zdrojů
    ───────────────────────────────────────────────────────────── */
    private function siblings_for_order( $order_id ) {
        $order_id = (int) $order_id;
        if ( ! $order_id ) return array();

        $items = array();

        // Zoo vouchery
        foreach ( Zoo_Vouchers_Database::get_by_order( $order_id ) as $row ) {
            if ( $this->is_hidden_type( $row->doc_type ) ) continue; // krmení se v pokladně nezobrazuje
            $items[] = $this->zoo_item( new Zoo_Vouchers_Voucher( $row ) );
        }

        // SkyVerge vouchery
        if ( $this->legacy_enabled() ) {
            $q = new WP_Query( array(
                'post_type'      => 'wc_voucher',
                'post_status'    => array( 'wcpdf-active', 'wcpdf-redeemed', 'wcpdf-expired', 'wcpdf-voided', 'draft', 'pending', 'publish' ),
                'posts_per_page' => 500,
                'fields'         => 'ids',
                'no_found_rows'  => true,
                'meta_query'     => array( array( 'key' => '_order_id', 'value' => $order_id ) ),
            ) );
            foreach ( array_map( 'intval', $q->posts ?: array() ) as $id ) {
                $items[] = $this->sky_item( get_post( $id ) );
            }
        }

        return $items;
    }

    /* ── Mapování zoo voucheru na položku UI ──────────────────────────────── */
    private function zoo_status_label( $status ) {
        $m = array( 'active' => 'active', 'used' => 'redeemed', 'expired' => 'expired', 'cancelled' => 'voided' );
        return isset( $m[ $status ] ) ? $m[ $status ] : $status;
    }

    private function zoo_item( Zoo_Vouchers_Voucher $v ) {
        $label = $v->type_label();
        $sub   = $v->variant_label();
        if ( $v->is_krmeni() && $v->animal_key ) $sub .= ' · ' . $v->animal_label();
        if ( $sub ) $label .= ' — ' . $sub;

        $redeemable = $this->is_redeemable_type( $v->doc_type );
        return array(
            'source'       => 'zoo',
            'id'           => (int) $v->id,
            'number'       => $v->code,
            'status'       => $v->status,
            'status_label' => $this->zoo_status_label( $v->status ),
            'product_id'   => (int) $v->product_id,
            'product'      => $label,
            'redeemed_at'  => $v->used_at ? get_gmt_from_date( $v->used_at, 'c' ) : null,
            'redeemable'   => $redeemable,
            'redeem_note'  => $redeemable ? '' : $this->noredeem_short( $v->doc_type ),
        );
    }

    private function zoo_voucher_info( Zoo_Vouchers_Voucher $v ) {
        return array(
            'number'      => $v->code,
            'recipient'   => (string) ( $v->recipient_name ?: '' ),
            'product'     => $v->type_label(),
            'product_id'  => (int) $v->product_id,
            'expires'     => $v->valid_until ? date_i18n( get_option( 'date_format' ), strtotime( $v->valid_until ) ) : null,
            'issued'      => $v->created_at,
            'redeemed_at' => $v->used_at ? get_gmt_from_date( $v->used_at, 'c' ) : null,
        );
    }

    /* ── Mapování SkyVerge voucheru na položku UI ─────────────────────────── */
    private function sky_item( $post ) {
        $pid = (int) get_post_meta( $post->ID, '_product_id', true );
        $red = get_post_meta( $post->ID, '_zvc_redeemed_at', true );
        return array(
            'source'       => 'sky',
            'id'           => (int) $post->ID,
            'number'       => $this->sky_display_number( $post ),
            'status'       => get_post_status( $post->ID ),
            'status_label' => $this->sky_status_label( get_post_status( $post->ID ) ),
            'product_id'   => $pid,
            'product'      => get_the_title( $pid ),
            'redeemed_at'  => $red ? gmdate( 'c', (int) $red ) : null,
            // Starší SkyVerge vouchery jsou vstupenky původního systému → uplatnitelné
            'redeemable'   => true,
            'redeem_note'  => '',
        );
    }

    private function sky_voucher_info( $voucher ) {
        $recipient  = get_post_meta( $voucher->ID, '_recipient_name', true );
        $product_id = (int) get_post_meta( $voucher->ID, '_product_id', true );

        $expiresTs = null;
        foreach ( array( '_expiration_date', 'expiration_date', '_expires' ) as $key ) {
            $val = get_post_meta( $voucher->ID, $key, true );
            if ( $val ) {
                if ( ctype_digit( (string) $val ) ) { $expiresTs = (int) $val; break; }
                $try = strtotime( $val );
                if ( $try ) { $expiresTs = $try; break; }
            }
        }
        $redeemedTs = (int) get_post_meta( $voucher->ID, '_zvc_redeemed_at', true );

        return array(
            'number'      => $this->sky_display_number( $voucher ),
            'recipient'   => (string) ( $recipient ?: '' ),
            'product'     => $product_id ? get_the_title( $product_id ) : '',
            'product_id'  => $product_id,
            'expires'     => $expiresTs ? date_i18n( get_option( 'date_format' ), $expiresTs ) : null,
            'issued'      => $voucher->post_date,
            'redeemed_at' => $redeemedTs ? gmdate( 'c', $redeemedTs ) : null,
        );
    }

    private function sky_status_label( $st ) {
        $m = array(
            'wcpdf-active'   => 'active', 'wcpdf-redeemed' => 'redeemed',
            'wcpdf-expired'  => 'expired', 'wcpdf-voided'  => 'voided',
            'publish'        => 'active', 'draft' => 'draft', 'pending' => 'pending',
        );
        return isset( $m[ $st ] ) ? $m[ $st ] : $st;
    }

    private function sky_display_number( $post ) {
        if ( $post && ! empty( $post->post_name ) )  return $post->post_name;
        if ( $post && ! empty( $post->post_title ) ) return $post->post_title;
        return '';
    }

    private function sky_order_id_for( $post_id ) {
        $oid = (int) get_post_meta( $post_id, '_order_id', true );
        if ( $oid ) return $oid;
        $number = $this->sky_display_number( get_post( $post_id ) );
        if ( $number && strpos( $number, '-' ) !== false ) {
            $parts = explode( '-', $number );
            $suf   = trim( end( $parts ) );
            if ( ctype_digit( $suf ) ) return (int) $suf;
        }
        return 0;
    }

    private function find_skyverge( $code ) {
        global $wpdb;

        // Zabezpečený kód (hex)
        if ( preg_match( '/^[0-9a-f]{8,}$/i', $code ) ) {
            $found = $this->find_by_secure_code( $code );
            if ( $found ) return $found;
        }
        // Podle slugu
        $bypath = get_page_by_path( sanitize_title( $code ), OBJECT, 'wc_voucher' );
        if ( $bypath ) return $bypath;

        $q = new WP_Query( array(
            'post_type'      => 'wc_voucher',
            'name'           => sanitize_title( $code ),
            'posts_per_page' => 1,
            'post_status'    => array( 'wcpdf-active', 'wcpdf-redeemed', 'wcpdf-expired', 'wcpdf-voided', 'draft', 'pending', 'publish' ),
            'no_found_rows'  => true,
            'fields'         => 'ids',
        ) );
        if ( $q->have_posts() ) return get_post( (int) $q->posts[0] );

        return $this->find_by_secure_code( $code );
    }

    private function find_by_secure_code( $code ) {
        global $wpdb;
        $detected = get_option( $this->option_detected_key, '' );
        if ( $detected ) {
            $row = $wpdb->get_row( $wpdb->prepare(
                "SELECT p.ID FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id=p.ID WHERE p.post_type='wc_voucher' AND m.meta_key=%s AND m.meta_value=%s LIMIT 1",
                $detected, $code
            ) );
            if ( $row && ! empty( $row->ID ) ) return get_post( (int) $row->ID );
        }
        foreach ( $this->secure_meta_keys as $mk ) {
            $row = $wpdb->get_row( $wpdb->prepare(
                "SELECT p.ID FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id=p.ID WHERE p.post_type='wc_voucher' AND m.meta_key=%s AND m.meta_value=%s LIMIT 1",
                $mk, $code
            ) );
            if ( $row && ! empty( $row->ID ) ) {
                if ( $mk !== '_zvc_code' ) update_option( $this->option_detected_key, $mk, false );
                return get_post( (int) $row->ID );
            }
        }
        $row = $wpdb->get_row( $wpdb->prepare(
            "SELECT p.ID,m.meta_key FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id=p.ID WHERE p.post_type='wc_voucher' AND m.meta_value=%s LIMIT 1",
            $code
        ) );
        if ( $row && ! empty( $row->ID ) && ! empty( $row->meta_key ) ) {
            if ( $row->meta_key !== '_zvc_code' ) update_option( $this->option_detected_key, $row->meta_key, false );
            return get_post( (int) $row->ID );
        }
        return null;
    }

    /* ── Pomocné ─────────────────────────────────────────────────────────── */
    private function extract_code( $raw ) {
        if ( ! is_string( $raw ) ) $raw = strval( $raw );
        $raw = trim( $raw );
        if ( filter_var( $raw, FILTER_VALIDATE_URL ) ) {
            $parts = wp_parse_url( $raw );
            if ( ! empty( $parts['query'] ) ) {
                parse_str( $parts['query'], $q );
                if ( ! empty( $q['code'] ) )         $raw = $q['code'];
                elseif ( ! empty( $q['voucher'] ) )  $raw = $q['voucher'];
            } elseif ( ! empty( $parts['path'] ) ) {
                $segments = array_values( array_filter( explode( '/', $parts['path'] ) ) );
                if ( ! empty( $segments ) ) $raw = end( $segments );
            }
        }
        return $this->normalize_code_basics( $raw );
    }

    private function normalize_code_basics( $s ) {
        if ( ! is_string( $s ) ) $s = strval( $s );
        $s = trim( $s );
        $s = preg_replace( '/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $s );
        $s = strtr( $s, array( "–" => "-", "—" => "-", "−" => "-" ) );
        $s = preg_replace( '/\s+/u', '', $s );
        $s = ltrim( $s, "-#" );
        return $s;
    }

    /**
     * Uplatňují se na pokladně jen vstupenky. Permanentky (opakovaný vstup)
     * ani krmení (rezervace přes Amelii) se zde neoznačují jako použité.
     * Seznam lze rozšířit filtrem `zoo_vouchers_redeemable_types`.
     */
    private function is_redeemable_type( $doc_type ) {
        $types = apply_filters( 'zoo_vouchers_redeemable_types', array( 'vstupenka' ) );
        return in_array( $doc_type, (array) $types, true );
    }

    private function noredeem_message( $doc_type ) {
        if ( $doc_type === 'krmeni' ) {
            return 'Poukaz na krmení — uplatňuje se přes rezervaci (Amelia), ne na pokladně.';
        }
        if ( $doc_type === 'permanentka_neprenosna' || $doc_type === 'permanentka_prenosna' ) {
            return 'Permanentka je platná — opakovaný vstup, na pokladně se neuplatňuje.';
        }
        return 'Tento typ voucheru se na pokladně neuplatňuje.';
    }

    /**
     * Typy, které se na pokladně vůbec nezobrazují (krmení – řeší se v Amelii).
     * Lze upravit filtrem `zoo_vouchers_hidden_types`.
     */
    private function is_hidden_type( $doc_type ) {
        $hidden = apply_filters( 'zoo_vouchers_hidden_types', array( 'krmeni' ) );
        return in_array( $doc_type, (array) $hidden, true );
    }

    private function noredeem_short( $doc_type ) {
        if ( $doc_type === 'krmeni' ) return 'Uplatní se přes rezervaci';
        if ( $doc_type === 'permanentka_neprenosna' || $doc_type === 'permanentka_prenosna' ) return 'Opakovaný vstup — neuplatňuje se';
        return 'Neuplatňuje se na pokladně';
    }

    private function key_in_siblings( $key, $items ) {
        foreach ( $items as $it ) {
            $k = ( isset( $it['source'] ) ? $it['source'] : 'zoo' ) . ':' . ( isset( $it['id'] ) ? $it['id'] : 0 );
            if ( $k === $key ) return true;
        }
        return false;
    }

    private function count_parking( $items ) {
        $p = 0;
        foreach ( $items as $it ) {
            $pid = isset( $it['product_id'] ) ? (int) $it['product_id'] : 0;
            if ( in_array( $pid, $this->parking_product_ids, true ) ) $p++;
        }
        return array( 'total' => count( $items ), 'parking' => $p );
    }
}
