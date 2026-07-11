<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_PDF {

    private static $pdf_loaded = false;
    private static $use_tfpdf  = false;

    private static function load_pdf_lib() {
        if ( self::$pdf_loaded ) return true;

        // 1. Zkus tFPDF (podporuje UTF-8 + .ttf přímo)
        $tfpdf = ZOO_VOUCHERS_PATH . 'lib/tfpdf.php';
        if ( file_exists( $tfpdf ) && ! class_exists( 'tFPDF' ) ) {
            require_once $tfpdf;
        }
        if ( class_exists( 'tFPDF' ) ) {
            self::$use_tfpdf  = true;
            self::$pdf_loaded = true;
            return true;
        }

        // 2. Fallback na FPDF
        if ( class_exists( 'FPDF' ) ) { self::$pdf_loaded = true; return true; }
        $fpdf = ZOO_VOUCHERS_PATH . 'lib/fpdf.php';
        if ( ! file_exists( $fpdf ) ) { error_log( '[Zoo Vouchers] Ani tFPDF ani FPDF nenalezen.' ); return false; }
        require_once $fpdf;
        if ( ! class_exists( 'Zoo_Vouchers_FPDF' ) ) {
            require_once ZOO_VOUCHERS_PATH . 'includes/class-fpdf-wrapper.php';
        }
        self::$pdf_loaded = true;
        return true;
    }

    private static function new_pdf( $w, $h ) {
        if ( self::$use_tfpdf ) {
            $pdf = new tFPDF( 'L', 'mm', array( $w, $h ) );
            $pdf->AddPage();
            $pdf->SetAutoPageBreak( false );
            $pdf->SetMargins( 0, 0, 0 );

            // Načti DejaVu font (UTF-8)
            // tFPDF hledá font v FPDF_FONTPATH/unifont/
            if ( ! defined( 'FPDF_FONTPATH' ) ) define( 'FPDF_FONTPATH', ZOO_VOUCHERS_PATH . 'lib/font/' );
            $dejavu = ZOO_VOUCHERS_PATH . 'lib/font/unifont/DejaVuSans.ttf';
            if ( file_exists( $dejavu ) ) {
                $pdf->AddFont( 'DejaVu', '',  'DejaVuSans.ttf', true );
                $pdf->AddFont( 'DejaVu', 'B', 'DejaVuSans.ttf', true );
            }
            return $pdf;
        }

        // FPDF fallback
        if ( ! defined( 'FPDF_FONTPATH' ) ) define( 'FPDF_FONTPATH', ZOO_VOUCHERS_PATH . 'lib/font/' );
        $pdf = new Zoo_Vouchers_FPDF( 'L', 'mm', array( $w, $h ) );
        $pdf->AddPage();
        $pdf->SetAutoPageBreak( false );
        $pdf->SetMargins( 0, 0, 0 );
        return $pdf;
    }

    private static function set_font( $pdf, $style, $size ) {
        if ( self::$use_tfpdf ) {
            $dejavu = ZOO_VOUCHERS_PATH . 'lib/font/unifont/DejaVuSans.ttf';
            $fname  = file_exists( $dejavu ) ? 'DejaVu' : 'Helvetica';
            $fstyle = ( $style === 'B' ) ? 'B' : '';
            $pdf->SetFont( $fname, $fstyle, $size );
        } else {
            $fstyle = ( $style === 'B' ) ? 'B' : '';
            $pdf->SetFont( $style === 'mono' ? 'Courier' : 'Helvetica', $fstyle, $size );
        }
    }

    private static function text( $s ) {
        // tFPDF zpracuje UTF-8 přímo, FPDF potřebuje transliteraci
        if ( self::$use_tfpdf ) return (string) $s;
        return self::transliterate( $s );
    }

    private static function save( $pdf, $filepath ) {
        if ( self::$use_tfpdf ) {
            $pdf->Output( 'F', $filepath );
            return true;
        }
        $pdf->OutputToFile( $filepath );
        return true;
    }

    // ── Generátory ────────────────────────────────────────────────────────────

    public static function generate( $voucher_id ) {
        $row = Zoo_Vouchers_Database::get_by_id( (int) $voucher_id );
        if ( ! $row ) return false;
        $voucher = new Zoo_Vouchers_Voucher( $row );
        $upload  = wp_upload_dir();
        $dir     = trailingslashit( $upload['basedir'] ) . 'zoo-vouchers/';
        wp_mkdir_p( $dir );
        if ( ! file_exists( $dir . '.htaccess' ) ) file_put_contents( $dir . '.htaccess', "Deny from all\n" );
        return self::generate_from_voucher( $voucher, $dir . 'voucher-' . $voucher->code . '.pdf' );
    }

    public static function generate_from_voucher( $voucher, $filepath ) {
        if ( ! self::load_pdf_lib() ) return false;

        $bg   = Zoo_Vouchers_Settings::get_background( $voucher->doc_type, $voucher->variant );
        $size = Zoo_Vouchers_Config::page_size( $voucher->doc_type );
        $w    = $size[0];
        $h    = $size[1];

        $pdf = self::new_pdf( $w, $h );

        if ( $bg && file_exists( $bg ) ) $pdf->Image( $bg, 0, 0, $w, $h );

        $pos     = Zoo_Vouchers_Settings::get_positions( $voucher->doc_type );
        $ns      = isset( $pos['name_size'] ) ? (int) $pos['name_size'] : 16;
        $is_perm = in_array( $voucher->doc_type, array( 'permanentka_neprenosna', 'permanentka_prenosna' ) );
        $validity_str = $voucher->valid_until ? date_i18n( 'd. m. Y', strtotime( $voucher->valid_until ) ) : '';

        if ( $voucher->is_krmeni() ) {
            if ( $voucher->recipient_name ) {
                self::set_font( $pdf, '', $ns );
                $pdf->SetTextColor( 80, 80, 80 );
                $pdf->SetXY( $pos['name_x'], $pos['name_y'] );
                $pdf->Cell( 185, 8, self::text( $voucher->recipient_name ) );
            }
            self::set_font( $pdf, '', 12 );
            $pdf->SetTextColor( 60, 60, 60 );
            $pdf->SetXY( $pos['animal_x'], $pos['animal_y'] );
            $pdf->Cell( 110, 7, self::text( $voucher->animal_label() ) );

            self::set_font( $pdf, 'mono', 13 );
            $pdf->SetTextColor( 30, 30, 30 );
            $pdf->SetXY( $pos['code_x'], $pos['code_y'] );
            $pdf->Cell( 110, 7, $voucher->code );

            self::set_font( $pdf, '', 12 );
            $pdf->SetTextColor( 60, 60, 60 );
            $pdf->SetXY( $pos['validity_x'], $pos['validity_y'] );
            $pdf->Cell( 110, 7, $validity_str );
        } else {
            if ( $voucher->recipient_name && ! $is_perm ) {
                self::set_font( $pdf, '', $ns );
                $pdf->SetTextColor( 80, 80, 80 );
                $pdf->SetXY( $pos['name_x'], $pos['name_y'] );
                $pdf->Cell( 185, 8, self::text( $voucher->recipient_name ), 0, 0, 'C' );
            }
            self::set_font( $pdf, 'mono', 13 );
            $pdf->SetTextColor( 30, 30, 30 );
            $pdf->SetXY( $pos['code_x'], $pos['code_y'] );
            $pdf->Cell( 90, 7, $voucher->code );

            self::set_font( $pdf, '', 12 );
            $pdf->SetTextColor( 60, 60, 60 );
            $pdf->SetXY( $pos['validity_x'], $pos['validity_y'] );
            $pdf->Cell( 90, 7, $validity_str );
        }

        self::add_qr( $pdf, $voucher, $w, $h );
        self::save( $pdf, $filepath );
        return $filepath;
    }

    // ── QR kód ────────────────────────────────────────────────────────────────

    private static function add_qr( $pdf, $voucher, $w, $h ) {
        $pos  = Zoo_Vouchers_Settings::get_positions( $voucher->doc_type );
        $size = isset( $pos['qr_size'] ) ? (float) $pos['qr_size'] : 0;
        if ( $size <= 0 ) return;
        $x   = isset( $pos['qr_x'] ) ? (float) $pos['qr_x'] : 0;
        $y   = isset( $pos['qr_y'] ) ? (float) $pos['qr_y'] : 0;
        $tmp = self::generate_qr_image( $voucher->code );
        if ( ! $tmp ) return;
        try { $pdf->Image( $tmp, $x, $y, $size, $size, 'PNG' ); } catch ( Exception $e ) {}
        @unlink( $tmp );
    }

    private static function generate_qr_image( $code ) {
        $tmp = sys_get_temp_dir() . '/zoo-qr-' . md5( $code ) . '.png';
        if ( ! class_exists( 'QRcode' ) ) {
            $qr = ZOO_VOUCHERS_PATH . 'lib/qrlib.php';
            if ( file_exists( $qr ) ) require_once $qr;
        }
        if ( class_exists( 'QRcode' ) ) {
            try {
                QRcode::png( $code, $tmp, QR_ECLEVEL_H, 6, 2 );
                if ( file_exists( $tmp ) && filesize( $tmp ) > 200 ) return $tmp;
            } catch ( Exception $e ) {}
        }
        if ( ! class_exists( 'Zoo_QR' ) ) require_once ZOO_VOUCHERS_PATH . 'lib/qr-minimal.php';
        if ( class_exists( 'Zoo_QR' ) ) {
            try {
                Zoo_QR::png( strtoupper( $code ), $tmp, 8, 4 );
                if ( file_exists( $tmp ) && filesize( $tmp ) > 200 ) return $tmp;
            } catch ( Exception $e ) {}
        }
        return false;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static function transliterate( $s ) {
        if ( empty( $s ) ) return '';
        $f = array('á','č','ď','é','ě','í','ň','ó','ř','š','ť','ú','ů','ý','ž',
                   'Á','Č','Ď','É','Ě','Í','Ň','Ó','Ř','Š','Ť','Ú','Ů','Ý','Ž');
        $t = array('a','c','d','e','e','i','n','o','r','s','t','u','u','y','z',
                   'A','C','D','E','E','I','N','O','R','S','T','U','U','Y','Z');
        return str_replace( $f, $t, $s );
    }

    public static function get_download_url( $code ) {
        return add_query_arg( array(
            'zoo_voucher_dl' => 1,
            'code'           => $code,
            'nonce'          => wp_create_nonce( 'zoo_dl_' . $code ),
        ), home_url( '/' ) );
    }

    public static function handle_download() {
        if ( empty( $_GET['zoo_voucher_dl'] ) ) return;
        $code  = strtoupper( sanitize_text_field( isset( $_GET['code'] )  ? $_GET['code']  : '' ) );
        $nonce = sanitize_text_field( isset( $_GET['nonce'] ) ? $_GET['nonce'] : '' );
        if ( ! $code || ! wp_verify_nonce( $nonce, 'zoo_dl_' . $code ) ) wp_die( 'Neplatny odkaz.' );
        $voucher = Zoo_Vouchers_Voucher::find( $code );
        if ( ! $voucher ) wp_die( 'Voucher nenalezen.' );
        $upload   = wp_upload_dir();
        $filepath = trailingslashit( $upload['basedir'] ) . 'zoo-vouchers/voucher-' . $code . '.pdf';
        if ( ! file_exists( $filepath ) ) $filepath = self::generate( $voucher->id );
        if ( ! $filepath || ! file_exists( $filepath ) ) wp_die( 'PDF nelze vygenerovat.' );
        header( 'Content-Type: application/pdf' );
        header( 'Content-Disposition: attachment; filename="voucher-' . $code . '.pdf"' );
        header( 'Content-Length: ' . filesize( $filepath ) );
        readfile( $filepath );
        exit;
    }
}

add_action( 'init', array( 'Zoo_Vouchers_PDF', 'handle_download' ) );
