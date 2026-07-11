<?php
defined( 'ABSPATH' ) || exit;

/**
 * Tento soubor se načítá POUZE poté, co je FPDF dostupný.
 * Nikdy ho nenačítej přímo z hlavního pluginu.
 */
class Zoo_Vouchers_FPDF extends FPDF {

    /**
     * Uloží PDF do souboru.
     */
    public function OutputToFile( $filepath ) {
        $this->Close();
        file_put_contents( $filepath, $this->buffer );
    }
}
