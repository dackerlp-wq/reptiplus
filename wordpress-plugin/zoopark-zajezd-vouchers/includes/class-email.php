<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_Email {

    /**
     * Odešle JEDEN email se VŠEMI vouchery objednávky.
     * Každý voucher má vlastní PDF přílohu.
     */
    public static function send_vouchers( $voucher_ids, $order ) {
        if ( empty( $voucher_ids ) ) return false;

        $vouchers   = array();
        $attachments = array();

        foreach ( $voucher_ids as $vid ) {
            $row = Zoo_Vouchers_Database::get_by_id( (int) $vid );
            if ( ! $row ) continue;

            $voucher = new Zoo_Vouchers_Voucher( $row );
            $vouchers[] = $voucher;

            // Vygeneruj PDF a přidej jako přílohu
            $pdf_path = Zoo_Vouchers_PDF::generate( (int) $vid );
            if ( $pdf_path && file_exists( $pdf_path ) ) {
                $attachments[] = $pdf_path;
            }
        }

        if ( empty( $vouchers ) ) return false;

        $to      = $order->get_billing_email();
        $subject = count( $vouchers ) > 1
            ? 'Vase vouchery - Zoopark Zajezd'
            : self::single_subject( $vouchers[0] );

        ob_start();
        include ZOO_VOUCHERS_PATH . 'templates/email-voucher.php';
        $html = ob_get_clean();

        // Jméno odesílatele s diakritikou musí být enkódováno pro email hlavičky
        $from_name = '=?UTF-8?B?' . base64_encode( 'Zoopark Zájezd' ) . '?=';
        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . $from_name . ' <evvo@zoopark-zajezd.cz>',
        );

        return wp_mail( $to, $subject, $html, $headers, $attachments );
    }

    private static function single_subject( $voucher ) {
        $map = array(
            'vstupenka'              => 'Darkova vstupenka - Zoopark Zajezd',
            'permanentka_neprenosna' => 'Neprenosna permanentka - Zoopark Zajezd',
            'permanentka_prenosna'   => 'Prenosna permanentka - Zoopark Zajezd',
            'krmeni'                 => 'Poukaz na krmeni zvirat - Zoopark Zajezd',
        );
        return isset( $map[ $voucher->doc_type ] ) ? $map[ $voucher->doc_type ] : 'Vas voucher - Zoopark Zajezd';
    }

    /**
     * Odešle znovu jeden voucher — ale pošle VŠECHNY vouchery stejné objednávky dohromady.
     * Takže resend z adminu pošle vždy kompletní email.
     */
    public static function send_voucher( $voucher_id ) {
        $row = Zoo_Vouchers_Database::get_by_id( (int) $voucher_id );
        if ( ! $row ) return false;
        $voucher = new Zoo_Vouchers_Voucher( $row );
        $order   = wc_get_order( $voucher->order_id );
        if ( ! $order ) return false;

        // Pokud je ruční voucher (order_id = 0), pošli jen tento jeden
        if ( ! $voucher->order_id ) {
            return self::send_vouchers( array( $voucher_id ), $order );
        }

        // Jinak pošli všechny vouchery objednávky dohromady
        $all_rows = Zoo_Vouchers_Database::get_by_order( $voucher->order_id );
        $all_ids  = array_map( function( $r ) { return (int) $r->id; }, $all_rows );
        return self::send_vouchers( $all_ids, $order );
    }
}
