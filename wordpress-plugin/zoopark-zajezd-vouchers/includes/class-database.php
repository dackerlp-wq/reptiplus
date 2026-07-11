<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_Database {

    const TABLE = 'zoo_vouchers';

    public static function create_table(): void {
        global $wpdb;
        $table   = $wpdb->prefix . self::TABLE;
        $charset = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            code              VARCHAR(32)  NOT NULL UNIQUE,
            order_id          BIGINT UNSIGNED NOT NULL,
            order_item_id     BIGINT UNSIGNED NOT NULL,
            product_id        BIGINT UNSIGNED NOT NULL,
            variation_id      BIGINT UNSIGNED DEFAULT 0,

            doc_type          VARCHAR(40)  NOT NULL,
            variant           VARCHAR(40)  NOT NULL,
            animal_key        VARCHAR(40)  DEFAULT NULL,

            status            ENUM('active','used','expired','cancelled') NOT NULL DEFAULT 'active',

            recipient_name    VARCHAR(255) DEFAULT NULL,
            recipient_email   VARCHAR(255) DEFAULT NULL,
            valid_until       DATE         DEFAULT NULL,
            used_at           DATETIME     DEFAULT NULL,
            amelia_coupon_id  BIGINT UNSIGNED DEFAULT NULL,

            created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

            PRIMARY KEY (id),
            UNIQUE KEY uq_code (code),
            KEY idx_order  (order_id),
            KEY idx_status (status)
        ) {$charset};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );
        update_option( 'zoo_vouchers_db_version', ZOO_VOUCHERS_VERSION );
    }

    public static function table(): string {
        global $wpdb;
        return $wpdb->prefix . self::TABLE;
    }

    public static function insert( array $data ) {
        global $wpdb;
        return $wpdb->insert( self::table(), $data ) ? (int) $wpdb->insert_id : false;
    }

    public static function update( int $id, array $data ): bool {
        global $wpdb;
        return (bool) $wpdb->update( self::table(), $data, [ 'id' => $id ] );
    }

    public static function get_by_id( int $id ): ?object {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            'SELECT * FROM `' . self::table() . '` WHERE id = %d', $id
        ) ) ?: null;
    }

    public static function get_by_code( string $code ): ?object {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            'SELECT * FROM `' . self::table() . '` WHERE code = %s', $code
        ) ) ?: null;
    }

    public static function get_by_order( int $order_id ): array {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare(
            'SELECT * FROM `' . self::table() . '` WHERE order_id = %d ORDER BY id ASC', $order_id
        ) ) ?: [];
    }

    public static function get_all( array $args = [] ): array {
        global $wpdb;
        $limit   = (int) ( $args['limit']  ?? 50 );
        $offset  = (int) ( $args['offset'] ?? 0 );
        $status  = sanitize_text_field( $args['status'] ?? '' );
        $search  = sanitize_text_field( $args['search'] ?? '' );

        $doc_type = sanitize_text_field( $args['doc_type'] ?? '' );
        $where = 'WHERE 1=1';
        if ( $status )   $where .= $wpdb->prepare( ' AND status = %s', $status );
        if ( $doc_type ) $where .= $wpdb->prepare( ' AND doc_type = %s', $doc_type );
        if ( $search )   $where .= $wpdb->prepare( ' AND (code LIKE %s OR recipient_name LIKE %s OR recipient_email LIKE %s)',
            "%{$search}%", "%{$search}%", "%{$search}%" );

        return $wpdb->get_results(
            "SELECT * FROM `" . self::table() . "` {$where} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}"
        ) ?: [];
    }

    public static function count( array $args = [] ): int {
        global $wpdb;
        $status = sanitize_text_field( $args['status'] ?? '' );
        $where  = $status ? $wpdb->prepare( 'WHERE status = %s', $status ) : '';
        return (int) $wpdb->get_var( "SELECT COUNT(*) FROM `" . self::table() . "` {$where}" );
    }
}
