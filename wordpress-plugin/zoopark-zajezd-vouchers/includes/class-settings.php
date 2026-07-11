<?php
defined( 'ABSPATH' ) || exit;

/**
 * Nastavení obrázků pozadí a pozic textu pro každý typ/variantu voucheru.
 * WP Admin → WooCommerce → Nastavení voucherů
 */
class Zoo_Vouchers_Settings {

    const OPTION = 'zoo_vouchers_settings';

    public static function init() {
        add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
        add_action( 'admin_post_zoo_save_settings',       array( __CLASS__, 'save' ) );
        add_action( 'admin_enqueue_scripts',               array( __CLASS__, 'enqueue' ) );
        add_action( 'wp_ajax_zoo_test_pdf',                array( __CLASS__, 'ajax_test_pdf' ) );
    }

    public static function menu() {
        add_submenu_page(
            'woocommerce',
            'Nastaveni voucheru',
            'Nastaveni voucheru',
            'manage_woocommerce',
            'zoo-voucher-settings',
            array( __CLASS__, 'page' )
        );
    }

    public static function enqueue( $hook ) {
        if ( strpos( $hook, 'zoo-voucher-settings' ) === false ) return;
        wp_enqueue_media();
    }

    // ── Načtení nastavení ─────────────────────────────────────────────────────

    public static function get() {
        return get_option( self::OPTION, array() );
    }

    public static function get_background( $type, $variant ) {
        $settings = self::get();
        $key      = $type . '__' . $variant;

        if ( ! empty( $settings['bg'][ $key ] ) ) {
            // Převeď URL z media knihovny na cestu na disku
            $url  = $settings['bg'][ $key ];
            $path = self::url_to_path( $url );
            if ( $path && file_exists( $path ) ) {
                return $path;
            }
        }

        // Fallback na výchozí soubor z pluginu
        return Zoo_Vouchers_Config::background_path( $type, $variant );
    }

    /**
     * Převede WordPress media URL na absolutní cestu na disku.
     * např. https://example.com/wp-content/uploads/2026/03/obrazek.jpg
     *    → /var/www/html/wp-content/uploads/2026/03/obrazek.jpg
     */
    public static function url_to_path( $url ) {
        $upload    = wp_upload_dir();
        $base_url  = trailingslashit( $upload['baseurl'] );
        $base_path = trailingslashit( $upload['basedir'] );

        if ( strpos( $url, $base_url ) === 0 ) {
            return $base_path . substr( $url, strlen( $base_url ) );
        }

        // Fallback – pokus přes home_url
        $site_url  = trailingslashit( get_site_url() );
        $site_path = trailingslashit( ABSPATH );
        if ( strpos( $url, $site_url ) === 0 ) {
            return $site_path . substr( $url, strlen( $site_url ) );
        }

        return false;
    }

    public static function get_positions( $type ) {
        $settings  = self::get();
        $defaults  = self::default_positions( $type );
        $saved     = isset( $settings['pos'][ $type ] ) ? $settings['pos'][ $type ] : array();
        return array_merge( $defaults, $saved );
    }

    // ── Výchozí pozice ────────────────────────────────────────────────────────

    public static function default_positions( $type ) {
        if ( $type === 'krmeni' ) {
            return array(
                'name_x'       => 55,  'name_y'     => 51,
                'name_size'    => 16,
                'animal_x'     => 107, 'animal_y'   => 68,
                'code_x'       => 107, 'code_y'     => 79,
                'validity_x'   => 107, 'validity_y' => 90,
                'qr_x'         => 0,   'qr_y'       => 0,   'qr_size' => 0,
            );
        }
        return array(
            'name_x'       => 55,  'name_y'     => 48,
            'name_size'    => 16,
            'code_x'       => 62,  'code_y'     => 74,
            'validity_x'   => 62,  'validity_y' => 86,
            'qr_x'         => 0,   'qr_y'       => 0,   'qr_size' => 0,
        );
    }

    // ── Render stránky ────────────────────────────────────────────────────────

    public static function page() {
        $settings = self::get();
        $types    = Zoo_Vouchers_Config::TYPES;
        $entry_variants = Zoo_Vouchers_Config::ENTRY_VARIANTS;
        $krmeni_variants = Zoo_Vouchers_Config::KRMENI_VARIANTS;
        ?>
        <div class="wrap">
            <h1>Nastaveni voucheru</h1>
            <?php if ( isset( $_GET['saved'] ) ) : ?>
                <div class="notice notice-success is-dismissible">
                <p><strong>Nastaveni ulozeno.</strong> Vsechna existujici PDF byla smazana a budou pregenerovana pri pristim stazeni.</p>
            </div>
            <?php endif; ?>

            <form method="post" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>">
                <input type="hidden" name="action" value="zoo_save_settings">
                <?php wp_nonce_field( 'zoo_save_settings' ); ?>

                <nav class="nav-tab-wrapper" id="zoo-tabs">
                    <?php foreach ( $types as $type_key => $type_label ) : ?>
                        <a href="#tab-<?php echo esc_attr( $type_key ); ?>"
                           class="nav-tab <?php echo $type_key === 'vstupenka' ? 'nav-tab-active' : ''; ?>">
                            <?php echo esc_html( $type_label ); ?>
                        </a>
                    <?php endforeach; ?>
                </nav>

                <?php foreach ( $types as $type_key => $type_label ) :
                    $variants = ( $type_key === 'krmeni' ) ? $krmeni_variants : $entry_variants;
                    $positions = self::get_positions( $type_key );
                    $is_krmeni = ( $type_key === 'krmeni' );
                ?>
                <div id="tab-<?php echo esc_attr( $type_key ); ?>"
                     class="zoo-tab-content"
                     style="<?php echo $type_key !== 'vstupenka' ? 'display:none;' : ''; ?> padding:20px 0;">

                    <h2><?php echo esc_html( $type_label ); ?></h2>

                    <!-- Pozice textu -->
                    <h3>Pozice textu na PDF (mm od levého/horního okraje)</h3>
                    <p style="color:#666;font-size:13px;">
                        PDF je <?php echo $is_krmeni ? '297 × 140 mm' : '297 × 140 mm'; ?> na šírku (landscape).
                        Upravte pozice dokud text nesedí přesně přes tečkované linky na originálním obrázku.
                    </p>

                    <table class="form-table" style="max-width:700px;">
                        <tr>
                            <th>Jméno příjemce X / Y</th>
                            <td>
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][name_x]"
                                    value="<?php echo esc_attr( $positions['name_x'] ); ?>"> /
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][name_y]"
                                    value="<?php echo esc_attr( $positions['name_y'] ); ?>">
                                <span class="description">mm &nbsp;&nbsp;|&nbsp;&nbsp; Velikost písma:</span>
                                <input type="number" step="1" min="6" max="60" style="width:60px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][name_size]"
                                    value="<?php echo esc_attr( isset($positions['name_size']) ? $positions['name_size'] : 16 ); ?>">
                                <span class="description">pt</span>
                            </td>
                        </tr>
                        <?php if ( $is_krmeni ) : ?>
                        <tr>
                            <th>Zvíře (Typ programu) X / Y</th>
                            <td>
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][animal_x]"
                                    value="<?php echo esc_attr( $positions['animal_x'] ); ?>"> /
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][animal_y]"
                                    value="<?php echo esc_attr( $positions['animal_y'] ); ?>">
                                <span class="description">mm</span>
                            </td>
                        </tr>
                        <?php endif; ?>
                        <tr>
                            <th>Číslo poukazu X / Y</th>
                            <td>
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][code_x]"
                                    value="<?php echo esc_attr( $positions['code_x'] ); ?>"> /
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][code_y]"
                                    value="<?php echo esc_attr( $positions['code_y'] ); ?>">
                                <span class="description">mm</span>
                            </td>
                        </tr>
                        <tr>
                            <th>Platnost do X / Y</th>
                            <td>
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][validity_x]"
                                    value="<?php echo esc_attr( $positions['validity_x'] ); ?>"> /
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][validity_y]"
                                    value="<?php echo esc_attr( $positions['validity_y'] ); ?>">
                                <span class="description">mm</span>
                            </td>
                        </tr>
                        <tr>
                            <th>QR kód X / Y / Velikost</th>
                            <td>
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][qr_x]"
                                    value="<?php echo esc_attr( isset($positions['qr_x']) ? $positions['qr_x'] : 0 ); ?>"> /
                                <input type="number" step="0.5" style="width:70px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][qr_y]"
                                    value="<?php echo esc_attr( isset($positions['qr_y']) ? $positions['qr_y'] : 0 ); ?>">
                                <span class="description">mm &nbsp;&nbsp;|&nbsp;&nbsp; Velikost:</span>
                                <input type="number" step="1" min="0" max="80" style="width:60px"
                                    name="pos[<?php echo esc_attr($type_key); ?>][qr_size]"
                                    value="<?php echo esc_attr( isset($positions['qr_size']) ? $positions['qr_size'] : 0 ); ?>">
                                <span class="description">mm &nbsp; <em style="color:#999;">(0 = QR kód se nezobrazí)</em></span>
                            </td>
                        </tr>
                    </table>

                    <!-- Testovací PDF -->
                    <h3>Testovací PDF</h3>
                    <p style="color:#666;font-size:13px;">
                        Vygeneruje PDF s fiktivními daty pro kontrolu pozic textu.
                        Ulož nejdříve nastavení, pak vygeneruj test.
                    </p>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
                    <?php
                    $test_variants = ( $type_key === 'krmeni' ) ? $krmeni_variants : $entry_variants;
                    foreach ( $test_variants as $tv_key => $tv_label ) : ?>
                        <button type="button"
                                class="button zoo-test-pdf"
                                data-type="<?php echo esc_attr($type_key); ?>"
                                data-variant="<?php echo esc_attr($tv_key); ?>"
                                data-nonce="<?php echo wp_create_nonce('zoo_test_pdf'); ?>">
                            &#128196; Test: <?php echo esc_html($tv_label); ?>
                        </button>
                    <?php endforeach; ?>
                    </div>

                    <!-- Obrázky pozadí per varianta -->
                    <h3>Obrázky pozadí</h3>
                    <p style="color:#666;font-size:13px;">
                        Pokud nevyberete vlastní obrázek, použije se výchozí z pluginu.
                        Doporučený formát: JPG, rozměr 2479 × 1169 px (A4 landscape 300 DPI).
                    </p>

                    <table class="form-table">
                    <?php foreach ( $variants as $variant_key => $variant_label ) :
                        $field_key  = $type_key . '__' . $variant_key;
                        $current_url = isset( $settings['bg'][ $field_key ] ) ? $settings['bg'][ $field_key ] : '';
                        $default_path = Zoo_Vouchers_Config::background_path( $type_key, $variant_key );
                    ?>
                        <tr>
                            <th style="width:200px;"><?php echo esc_html( $variant_label ); ?></th>
                            <td>
                                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">

                                    <?php if ( $current_url ) : ?>
                                        <img src="<?php echo esc_url( $current_url ); ?>"
                                             style="height:60px;border-radius:4px;border:1px solid #ddd;" alt="">
                                    <?php elseif ( $default_path && file_exists( $default_path ) ) : ?>
                                        <img src="<?php echo esc_url( Zoo_Vouchers_Config::background_url( $type_key, $variant_key ) ); ?>"
                                             style="height:60px;border-radius:4px;border:2px dashed #ccc;opacity:.6;" alt="Výchozí">
                                        <span style="font-size:12px;color:#999;">výchozí obrázek z pluginu</span>
                                    <?php else : ?>
                                        <span style="font-size:12px;color:#c00;">⚠ Žádný obrázek</span>
                                    <?php endif; ?>

                                    <input type="hidden"
                                           name="bg[<?php echo esc_attr( $field_key ); ?>]"
                                           id="zoo-bg-<?php echo esc_attr( $field_key ); ?>"
                                           value="<?php echo esc_attr( $current_url ); ?>">

                                    <button type="button"
                                            class="button zoo-media-select"
                                            data-target="zoo-bg-<?php echo esc_attr( $field_key ); ?>"
                                            data-preview="zoo-preview-<?php echo esc_attr( $field_key ); ?>">
                                        <?php echo $current_url ? 'Změnit obrázek' : 'Vybrat obrázek'; ?>
                                    </button>

                                    <?php if ( $current_url ) : ?>
                                    <button type="button"
                                            class="button zoo-media-remove"
                                            data-target="zoo-bg-<?php echo esc_attr( $field_key ); ?>"
                                            data-preview="zoo-preview-<?php echo esc_attr( $field_key ); ?>">
                                        Odebrat
                                    </button>
                                    <?php endif; ?>

                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </table>

                </div>
                <?php endforeach; ?>

                <p style="margin-top:20px;">
                    <?php submit_button( 'Uložit nastavení', 'primary', 'submit', false ); ?>
                </p>

            </form>

            <!-- QR Diagnostika -->
            <div style="background:#fff;padding:20px;border:1px solid #ddd;border-radius:6px;margin-top:20px;">
                <h3 style="margin-top:0;">Stav QR kodu</h3>
                <?php
                $gd_ok    = extension_loaded('gd');
                $qrmin_ok = file_exists( ZOO_VOUCHERS_PATH . 'lib/qr-minimal.php' );
                $qrlib_ok = file_exists( ZOO_VOUCHERS_PATH . 'lib/qrlib.php' );
                ?>
                <table style="font-size:13px;border-collapse:collapse;">
                    <tr>
                        <td style="padding:6px 16px 6px 0;">GD knihovna</td>
                        <td><?php echo $gd_ok ? '<span style="color:green">OK</span>' : '<span style="color:red">CHYBI – kontaktuj Forpsi</span>'; ?></td>
                    </tr>
                    <tr>
                        <td style="padding:6px 16px 6px 0;">Vlastni QR (qr-minimal.php)</td>
                        <td><?php echo $qrmin_ok ? '<span style="color:green">OK</span>' : '<span style="color:red">CHYBI</span>'; ?></td>
                    </tr>
                    <tr>
                        <td style="padding:6px 16px 6px 0;">phpqrcode (qrlib.php)</td>
                        <td>
                        <?php if ($qrlib_ok) : ?>
                            <span style="color:green">OK</span>
                        <?php else : ?>
                            <span style="color:orange">Neni nahran</span> &mdash;
                            <a href="https://sourceforge.net/projects/phpqrcode/files/latest/download" target="_blank">Stahni zde</a>,
                            rozbal ZIP a nahraj <strong>qrlib.php</strong> do slozky <code>zoo-vouchers-v2/lib/</code>
                        <?php endif; ?>
                        </td>
                    </tr>
                </table>
                <?php if ( $gd_ok ) : ?>
                    <p style="color:green;margin:10px 0 0;font-size:13px;">GD je OK.</p>
                <?php endif; ?>

                <hr style="margin:12px 0;">
                <p style="font-size:13px;font-weight:600;margin:0 0 8px;">Test TTF fontu:</p>
                <?php
                $ttf_path = ZOO_VOUCHERS_PATH . 'lib/font/DejaVuSans.ttf';
                $ttf_exists = file_exists( $ttf_path );
                $freetype   = function_exists('imagettftext');
                $gd_info    = function_exists('gd_info') ? gd_info() : array();
                $ft_support = ! empty( $gd_info['FreeType Support'] );

                // Hledej dostupné TTF fonty na serveru
                $font_search_paths = array(
                    ABSPATH . 'wp-includes/fonts/',
                    WP_CONTENT_DIR . '/plugins/woocommerce/assets/fonts/',
                    WP_CONTENT_DIR . '/themes/' . get_template() . '/fonts/',
                    WP_CONTENT_DIR . '/themes/' . get_stylesheet() . '/fonts/',
                    '/usr/share/fonts/',
                    '/usr/share/fonts/truetype/',
                    '/usr/share/fonts/truetype/dejavu/',
                    '/usr/share/fonts/truetype/freefont/',
                    '/usr/share/fonts/truetype/liberation/',
                    '/usr/share/fonts/truetype/open-sans/',
                    '/usr/share/fonts/opentype/',
                    '/usr/local/share/fonts/',
                    '/usr/local/lib/fonts/',
                    '/web/htdocs/fonts/',
                    dirname(ABSPATH) . '/fonts/',
                    '/php8.3/lib/fonts/',
                );
                // Rekurzivní hledání v /usr/share/fonts
                try {
                    if ( is_dir('/usr/share/fonts') ) {
                        $iter = new RecursiveIteratorIterator(
                            new RecursiveDirectoryIterator('/usr/share/fonts', RecursiveDirectoryIterator::SKIP_DOTS)
                        );
                        foreach ( $iter as $file ) {
                            if ( strtolower( $file->getExtension() ) === 'ttf' ) {
                                $found_fonts[] = $file->getPathname();
                            }
                        }
                    }
                } catch ( Exception $e ) {
                    // Přístup odepřen – přeskočíme
                }
                $found_fonts = array();
                foreach ( $font_search_paths as $search_path ) {
                    if ( ! is_dir( $search_path ) ) continue;
                    $files = glob( $search_path . '*.ttf' );
                    if ( $files ) $found_fonts = array_merge( $found_fonts, $files );
                    $files = glob( $search_path . '*.TTF' );
                    if ( $files ) $found_fonts = array_merge( $found_fonts, $files );
                }
                if ( ! empty( $found_fonts ) ) {
                    echo '<p style="font-size:13px;color:green;">Nalezené TTF fonty na serveru:</p><ul style="font-size:12px;">';
                    foreach ( $found_fonts as $ff ) {
                        echo '<li><code>' . esc_html($ff) . '</code> (' . round(filesize($ff)/1024) . ' KB)</li>';
                    }
                    echo '</ul>';
                } else {
                    echo '<p style="font-size:13px;color:orange;">Žádné TTF fonty nenalezeny v systémových složkách.</p>';
                }

                if ( $ttf_exists && $freetype && $ft_support ) {
                    // Pokus vykreslit test
                    $test_img = imagecreatetruecolor( 400, 70 );
                    $white    = imagecolorallocate( $test_img, 255, 255, 255 );
                    $black    = imagecolorallocate( $test_img, 0, 0, 0 );
                    imagefill( $test_img, 0, 0, $white );
                    // Test různých přístupů k encoding
                    $tests = array(
                        'plain'    => 'Dvorak ricka sef',
                        'direct'   => 'Dvořák říčka šéf',
                        'hex'      => "DvoÅÃ¡k",
                    );
                    $y_pos = 5;
                    $prev_enc = mb_internal_encoding();
                    mb_internal_encoding('UTF-8');
                    foreach ( $tests as $label => $txt ) {
                        @imagettftext( $test_img, 11, 0, 5, $y_pos + 14, $black, $ttf_path, $label . ': ' . $txt );
                        $y_pos += 18;
                    }
                    mb_internal_encoding( $prev_enc );
                    ob_start();
                    imagepng( $test_img );
                    $img_data = ob_get_clean();
                    imagedestroy( $test_img );
                    $img_b64 = base64_encode( $img_data );
                    ?>
                    <p style="color:green;font-size:13px;">TTF OK – výsledek:</p>
                    <img src="data:image/png;base64,<?php echo $img_b64; ?>" style="border:1px solid #ddd;">
                    <?php
                } else {
                    echo '<p style="color:red;font-size:13px;">';
                    if ( ! $ttf_exists ) echo 'TTF soubor nenalezen: ' . esc_html($ttf_path) . '<br>';
                    if ( ! $freetype )   echo 'imagettftext() neni dostupna<br>';
                    if ( ! $ft_support ) echo 'FreeType podpora v GD: NE – tohle je problem!<br>';
                    echo '</p>';
                }
                ?>
                <hr style="margin:12px 0;">
                <p style="font-size:13px;font-weight:600;margin:0 0 8px;">WC variace produktů (pro mapování zvíře):</p>
                <?php
                $voucher_products = get_posts( array(
                    'post_type'   => 'product',
                    'numberposts' => -1,
                    'meta_query'  => array( array( 'key' => '_zoo_voucher_type', 'value' => 'krmeni' ) ),
                ) );
                if ( $voucher_products ) {
                    foreach ( $voucher_products as $p ) {
                        echo '<p style="font-size:13px;font-weight:600;margin:8px 0 4px;">Produkt #' . $p->ID . ': ' . esc_html($p->post_title) . '</p>';
                        $product = wc_get_product( $p->ID );
                        if ( $product && $product->is_type('variable') ) {
                            $variations = $product->get_children();
                            echo '<ul style="font-size:12px;margin:0 0 8px;padding-left:20px;">';
                            foreach ( $variations as $vid ) {
                                $v = wc_get_product( $vid );
                                if ( ! $v ) continue;
                                $attrs = $v->get_variation_attributes();
                                $attr_str = implode(', ', array_values($attrs));
                                $animal = get_post_meta( $p->ID, '_zoo_voucher_animal', true );
                                echo '<li>ID <strong>' . $vid . '</strong>: ' . esc_html($attr_str) . ' (zvire produktu: ' . esc_html($animal ?: '–') . ')</li>';
                            }
                            echo '</ul>';
                        } else {
                            $animal = get_post_meta( $p->ID, '_zoo_voucher_animal', true );
                            echo '<p style="font-size:12px;margin:0 0 8px;">Jednoduchy produkt, zvire: ' . esc_html($animal ?: '–') . '</p>';
                        }
                    }
                } else {
                    echo '<p style="font-size:12px;color:#999;">Zadne produkty s typem krmeni nenalezeny.</p>';
                }
                ?>
                <hr style="margin:12px 0;">
                <p style="font-size:13px;font-weight:600;margin:0 0 8px;">Test QR generování:</p>
                <?php
                $test_tmp = sys_get_temp_dir() . '/zoo-qr-test-' . time() . '.png';
                $qr_ok    = false;
                $qr_msg   = '';

                // Test qrlib
                if ( $qrlib_ok && ! class_exists('QRcode') ) {
                    require_once ZOO_VOUCHERS_PATH . 'lib/qrlib.php';
                }

                if ( class_exists('QRcode') ) {
                    try {
                        QRcode::png('ZOO-TEST-1234', $test_tmp, QR_ECLEVEL_H, 6, 2);
                        if ( file_exists($test_tmp) && filesize($test_tmp) > 200 ) {
                            $qr_ok  = true;
                            $qr_msg = 'PNG vygenerovan (' . filesize($test_tmp) . ' bytes) – zobrazuji níže:';
                            $qr_b64 = base64_encode(file_get_contents($test_tmp));
                            @unlink($test_tmp);
                        } else {
                            $qr_msg = 'Soubor prazdny nebo neexistuje: ' . $test_tmp;
                        }
                    } catch (Exception $e) {
                        $qr_msg = 'Vyjimka: ' . $e->getMessage();
                    }
                } else {
                    $qr_msg = 'Trida QRcode neni dostupna ani po require_once qrlib.php';
                }
                ?>
                <p style="font-size:13px;color:<?php echo $qr_ok ? 'green' : 'red'; ?>">
                    <?php echo esc_html($qr_msg); ?>
                </p>
                <?php if ( $qr_ok && ! empty($qr_b64) ) : ?>
                <img src="data:image/png;base64,<?php echo $qr_b64; ?>"
                     style="width:150px;height:150px;image-rendering:pixelated;border:1px solid #ddd;"
                     alt="Test QR">
                <p style="font-size:12px;color:#888;">Pokud výše vidíš čitelný QR kód a telefon ho přečte → vše funguje správně.</p>
                <?php endif; ?>
            </div>
        </div>

        <script>
        jQuery(function($){
            // Záložky
            $('.nav-tab').on('click', function(e){
                e.preventDefault();
                var target = $(this).attr('href');
                $('.nav-tab').removeClass('nav-tab-active');
                $(this).addClass('nav-tab-active');
                $('.zoo-tab-content').hide();
                $(target).show();
            });

            // Media uploader
            var mediaFrame;
            $(document).on('click', '.zoo-media-select', function(e){
                e.preventDefault();
                var targetId   = $(this).data('target');
                var previewId  = $(this).data('preview');
                var btn        = $(this);

                mediaFrame = wp.media({
                    title:    'Vybrat obrázek pozadí',
                    button:   { text: 'Použít tento obrázek' },
                    multiple: false,
                    library:  { type: 'image' }
                });

                mediaFrame.on('select', function(){
                    var attachment = mediaFrame.state().get('selection').first().toJSON();
                    $('#' + targetId).val( attachment.url );
                    btn.prev('img').remove();
                    btn.before('<img src="' + attachment.url + '" style="height:60px;border-radius:4px;border:1px solid #ddd;" alt=""> ');
                    btn.text('Změnit obrázek');
                });

                mediaFrame.open();
            });

            // Odebrat obrázek
            $(document).on('click', '.zoo-media-remove', function(){
                var targetId = $(this).data('target');
                $('#' + targetId).val('');
                $(this).prev('.button').text('Vybrat obrázek');
                $(this).prevAll('img').remove();
                $(this).remove();
            });
            // Test PDF
            $(document).on('click', '.zoo-test-pdf', function(){
                var btn     = $(this);
                var type    = btn.data('type');
                var variant = btn.data('variant');
                var nonce   = btn.data('nonce');

                btn.prop('disabled', true).text('Generuji...');

                $.post(ajaxurl, {
                    action:  'zoo_test_pdf',
                    type:    type,
                    variant: variant,
                    nonce:   nonce
                }, function(res){
                    console.log('[Zoo Vouchers] Test PDF response:', res);
                    btn.prop('disabled', false).text('Test: ' + variant);
                    if ( res.success && res.data && res.data.pdf_base64 ) {
                        // Otevři PDF přímo z base64 – obchází .htaccess
                        var binary = atob( res.data.pdf_base64 );
                        var bytes  = new Uint8Array( binary.length );
                        for ( var i = 0; i < binary.length; i++ ) bytes[i] = binary.charCodeAt(i);
                        var blob   = new Blob( [bytes], { type: 'application/pdf' } );
                        var url    = URL.createObjectURL( blob );
                        var link   = document.createElement('a');
                        link.href  = url;
                        link.download = res.data.filename;
                        link.click();
                        setTimeout( function(){ URL.revokeObjectURL(url); }, 5000 );
                    } else {
                        var msg = 'Chyba pri generovani.';
                        if ( typeof res.data === 'string' ) msg = res.data;
                        else if ( res.data && res.data.message ) msg = res.data.message;
                        alert( msg );
                    }
                });
            });
        });
        </script>
        <?php
    }

    // ── Uložení ───────────────────────────────────────────────────────────────

    public static function save() {
        check_admin_referer( 'zoo_save_settings' );
        if ( ! current_user_can( 'manage_woocommerce' ) ) wp_die( 'Nedostatecna opravneni.' );

        $settings = array();

        // Obrázky
        $settings['bg'] = array();
        if ( isset( $_POST['bg'] ) && is_array( $_POST['bg'] ) ) {
            foreach ( $_POST['bg'] as $key => $url ) {
                $clean_key = sanitize_key( $key );
                $clean_url = esc_url_raw( $url );
                if ( $clean_url ) {
                    $settings['bg'][ $clean_key ] = $clean_url;
                }
            }
        }

        // Pozice
        $settings['pos'] = array();
        if ( isset( $_POST['pos'] ) && is_array( $_POST['pos'] ) ) {
            foreach ( $_POST['pos'] as $type => $fields ) {
                $type = sanitize_key( $type );
                $settings['pos'][ $type ] = array();
                foreach ( $fields as $field => $val ) {
                    $settings['pos'][ $type ][ sanitize_key( $field ) ] = floatval( $val );
                }
            }
        }

        update_option( self::OPTION, $settings );

        // Smaž všechna cached PDF – při příštím stažení se vygenerují znovu s novým nastavením
        self::clear_pdf_cache();

        wp_redirect( admin_url( 'admin.php?page=zoo-voucher-settings&saved=1' ) );
        exit;
    }
    public static function ajax_test_pdf() {
        check_ajax_referer( 'zoo_test_pdf', 'nonce' );
        if ( ! current_user_can( 'manage_woocommerce' ) ) wp_send_json_error( 'Nedostatecna opravneni.' );

        $type    = sanitize_key( isset( $_POST['type'] )    ? $_POST['type']    : '' );
        $variant = sanitize_key( isset( $_POST['variant'] ) ? $_POST['variant'] : '' );

        if ( ! $type || ! $variant ) wp_send_json_error( 'Chybi parametry.' );

        // Vytvoř fiktivní voucher – všechny properties které Voucher třída očekává
        $fake                  = new stdClass();
        $fake->id              = 0;
        $fake->code            = 'ZOO-TEST-1234';
        $fake->order_id        = 0;
        $fake->order_item_id   = 0;
        $fake->product_id      = 0;
        $fake->variation_id    = 0;
        $fake->doc_type        = $type;
        $fake->variant         = $variant;
        $fake->animal_key      = ( $type === 'krmeni' ) ? 'vevericka' : '';
        $fake->status          = 'active';
        $fake->recipient_name  = 'Jan Novak';
        $fake->recipient_email = 'test@example.com';
        $fake->valid_until     = date( 'Y-m-d', strtotime( '+12 months' ) );
        $fake->used_at         = null;
        $fake->amelia_coupon_id = null;
        $fake->created_at      = current_time( 'mysql' );

        // Bezpečné vytvoření objektu bez DB
        $voucher = new Zoo_Vouchers_Voucher( $fake );

        // Vygeneruj testovací PDF
        $upload   = wp_upload_dir();
        $dir      = trailingslashit( $upload['basedir'] ) . 'zoo-vouchers/';
        wp_mkdir_p( $dir );

        $filepath = $dir . 'test-' . $type . '-' . $variant . '.pdf';
        try {
            $result = Zoo_Vouchers_PDF::generate_from_voucher( $voucher, $filepath );
        } catch ( Exception $e ) {
            wp_send_json_error( 'PDF chyba: ' . $e->getMessage() );
            return;
        }

        if ( ! $result || ! file_exists( $filepath ) ) {
            wp_send_json_error( 'PDF se nepodarilo vygenerovat. Zkontroluj FPDF (zoo-vouchers/lib/fpdf.php) a slozku fontu (zoo-vouchers/lib/font/).' );
            return;
        }

        // Místo URL pošleme obsah jako base64 – vyhne se .htaccess blokaci
        $pdf_data = base64_encode( file_get_contents( $filepath ) );
        @unlink( $filepath ); // smaž dočasný soubor
        wp_send_json_success( array( 'pdf_base64' => $pdf_data, 'filename' => 'test-' . $type . '-' . $variant . '.pdf' ) );
    }

    public static function clear_pdf_cache() {
        $upload = wp_upload_dir();
        $dir    = trailingslashit( $upload['basedir'] ) . 'zoo-vouchers/';
        if ( ! is_dir( $dir ) ) return;

        $files = glob( $dir . 'voucher-*.pdf' );
        if ( ! $files ) return;

        $count = 0;
        foreach ( $files as $file ) {
            if ( is_file( $file ) ) {
                unlink( $file );
                $count++;
            }
        }

        error_log( '[Zoo Vouchers] PDF cache vycistena: ' . $count . ' souboru smazano.' );
        return $count;
    }
}
