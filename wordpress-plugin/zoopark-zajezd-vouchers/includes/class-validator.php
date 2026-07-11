<?php
defined( 'ABSPATH' ) || exit;

/**
 * Pokladní ověřování voucherů — prémiové rozhraní se skenerem QR kamerou,
 * zvukovou signalizací, souhrnnými dlaždicemi a hromadným uplatněním.
 *
 * Data i logika běží přes REST (Zoo_Vouchers_REST) a pokrývají obě generace
 * voucherů — nové (zoo_vouchers) i staré SkyVerge (wc_voucher).
 *
 * Shortcode:  [zoo_voucher_validator]
 * Alias:      [voucher_checker]   (zpětná kompatibilita s původním pluginem)
 */
class Zoo_Vouchers_Validator {

    private static $enqueued = false;

    public static function init() {
        add_shortcode( 'zoo_voucher_validator', array( __CLASS__, 'render_shortcode' ) );
        add_shortcode( 'voucher_checker',       array( __CLASS__, 'render_shortcode' ) );
        add_action( 'wp_enqueue_scripts',       array( __CLASS__, 'register_assets' ) );
    }

    public static function register_assets() {
        // Knihovna skeneru je přibalená v pluginu (žádné CDN — na mobilech
        // ho často blokuje CSP/síť/doplněk, což hlásilo „kamera nepodporována").
        wp_register_script(
            'html5-qrcode',
            ZOO_VOUCHERS_URL . 'assets/js/html5-qrcode.min.js',
            array(), '2.3.8', true
        );
        wp_register_script(
            'zoo-vouchers-checker-ui',
            ZOO_VOUCHERS_URL . 'assets/js/checker-ui.js',
            array( 'html5-qrcode' ), ZOO_VOUCHERS_VERSION, true
        );
        wp_register_style(
            'zoo-vouchers-checker',
            ZOO_VOUCHERS_URL . 'assets/css/checker.css',
            array(), ZOO_VOUCHERS_VERSION
        );
    }

    private static function enqueue() {
        if ( self::$enqueued ) return;
        self::$enqueued = true;

        wp_enqueue_style( 'zoo-vouchers-checker' );
        wp_enqueue_script( 'zoo-vouchers-checker-ui' );
        wp_localize_script( 'zoo-vouchers-checker-ui', 'ZVC', array(
            'restBase' => esc_url_raw( rest_url( 'zoo/v1' ) ),
            'nonce'    => wp_create_nonce( 'wp_rest' ),
        ) );
    }

    public static function render_shortcode() {
        self::enqueue();

        ob_start(); ?>
        <div class="zvc-container">

          <!-- HLAVIČKA -->
          <div class="zvc-page-header">
            <span class="zvc-logo-icon">🦁</span>
            <h1 class="zvc-page-title">
              Zoopark Zájezd &mdash; <span>Ověření vstupenky</span>
            </h1>
          </div>

          <div class="zvc-body">

            <!-- OVLÁDACÍ KARTA -->
            <div class="zvc-controls-card">

              <!-- Vyhledání objednávky -->
              <p class="zvc-section-label">Vyhledat objednávku</p>
              <div class="zvc-ctrl-group">
                <input
                  id="zvc-order-input"
                  class="zvc-input"
                  placeholder="ID objednávky…"
                  inputmode="numeric"
                  autocomplete="off"
                />
                <button id="zvc-order-find" class="zvc-btn zvc-btn-primary">
                  Vyhledat
                </button>
              </div>

              <div class="zvc-divider">nebo</div>

              <!-- Kontrola kódu -->
              <p class="zvc-section-label">Kód voucheru &mdash; čtečka / ruční zadání</p>
              <div class="zvc-ctrl-group">
                <input
                  id="zvc-code-input"
                  class="zvc-input"
                  placeholder="Naskenuj nebo zadej kód a stiskni Enter…"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
                <button id="zvc-code-check" class="zvc-btn zvc-btn-primary">
                  Ověřit
                </button>
                <button id="zvc-start-scan" class="zvc-btn zvc-btn-alt" style="display:none;">
                  📷 QR
                </button>
              </div>

              <div id="zvc-scan-help" class="zvc-help">
                Na mobilech/tabletech lze skenovat QR kód přímo kamerou — klikněte na tlačítko 📷 QR.
              </div>

            </div>
            <!-- /OVLÁDACÍ KARTA -->

            <!-- STAVOVÝ ŘÁDEK -->
            <div class="zvc-statusbar" id="zvc-status">
              <span class="zvc-dot"></span> Připraveno.
            </div>

            <!-- SOUHRNNÁ POČÍTADLA -->
            <div id="zvc-summary" class="zvc-summary-counters"></div>

            <!-- QR ČTEČKA -->
            <div id="zvc-reader" class="zvc-reader" style="display:none;"></div>

            <!-- SEZNAM VOUCHERŮ -->
            <div class="zvc-result" id="zvc-result" style="display:none;">
              <div class="zvc-list" id="zvc-list"></div>
            </div>

            <!-- UPLATNIT VŠE (až dole pod seznamem, jen u objednávky s více vstupenkami) -->
            <div class="zvc-actions-bottom" id="zvc-actions-bottom" style="display:none;">
              <button id="zvc-redeem-all" class="zvc-btn zvc-btn-danger zvc-btn-xl">
                &#9889; Uplatnit všechny aktivní vstupenky z objednávky
              </button>
            </div>

          </div><!-- /zvc-body -->
        </div><!-- /zvc-container -->
        <?php
        return ob_get_clean();
    }
}
