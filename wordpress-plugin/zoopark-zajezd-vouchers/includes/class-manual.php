<?php
defined( 'ABSPATH' ) || exit;

/**
 * Ruční vytvoření poukazu bez objednávky.
 * WP Admin → WooCommerce → Vytvořit poukaz
 */
class Zoo_Vouchers_Manual {

    public static function init() {
        add_action( 'admin_menu',                        array( __CLASS__, 'menu' ) );
        add_action( 'wp_ajax_zoo_create_manual_voucher', array( __CLASS__, 'ajax_create' ) );
    }

    public static function menu() {
        add_submenu_page(
            'woocommerce',
            'Vytvorit poukaz',
            '+ Vytvorit poukaz',
            'manage_woocommerce',
            'zoo-create-voucher',
            array( __CLASS__, 'page' )
        );
    }

    public static function page() {
        $types           = Zoo_Vouchers_Config::TYPES;
        $entry_variants  = Zoo_Vouchers_Config::ENTRY_VARIANTS;
        $krmeni_variants = Zoo_Vouchers_Config::KRMENI_VARIANTS;
        $animals         = Zoo_Vouchers_Config::AMELIA_SERVICE_LABELS;
        ?>
        <div class="wrap">
            <h1>Vytvorit poukaz</h1>
            <p style="color:#666;">Rucni vytvoreni poukazu bez objednavky. Poukaz bude vygenerovan a volitelne odeslan emailem.</p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;max-width:1000px;">

                <!-- Formulář -->
                <div style="background:#fff;padding:24px;border:1px solid #ddd;border-radius:6px;">
                    <h2 style="margin-top:0;">Nastavení poukazu</h2>

                    <table class="form-table" style="margin:0;">

                        <tr>
                            <th style="width:160px;padding:10px 0;">Typ poukazu</th>
                            <td>
                                <select id="zoo-manual-type" style="width:100%;max-width:300px;">
                                    <option value="">— Vyberte typ —</option>
                                    <?php foreach ( $types as $k => $label ) : ?>
                                        <option value="<?php echo esc_attr($k); ?>"><?php echo esc_html($label); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                        </tr>

                        <!-- Varianta – vstup/permanentka -->
                        <tr class="zoo-row-variant" style="display:none;">
                            <th style="padding:10px 0;">Varianta</th>
                            <td>
                                <select id="zoo-manual-variant" style="width:100%;max-width:300px;">
                                    <option value="">— Vyberte variantu —</option>
                                    <?php foreach ( $entry_variants as $k => $label ) : ?>
                                        <option value="<?php echo esc_attr($k); ?>" class="zoo-entry-variant"><?php echo esc_html($label); ?></option>
                                    <?php endforeach; ?>
                                    <?php foreach ( $krmeni_variants as $k => $label ) : ?>
                                        <option value="<?php echo esc_attr($k); ?>" class="zoo-krmeni-variant" style="display:none;"><?php echo esc_html($label); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                        </tr>

                        <!-- Zvíře – krmení -->
                        <tr class="zoo-row-animal" style="display:none;">
                            <th style="padding:10px 0;">Zvíře</th>
                            <td>
                                <select id="zoo-manual-animal" style="width:100%;max-width:300px;">
                                    <option value="">— Vyberte zvíře —</option>
                                    <?php foreach ( $animals as $k => $label ) : ?>
                                        <option value="<?php echo esc_attr($k); ?>"><?php echo esc_html($label); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </td>
                        </tr>

                        <!-- Jméno příjemce – skryté u permanentek -->
                        <tr class="zoo-row-name">
                            <th style="padding:10px 0;">Jméno příjemce</th>
                            <td>
                                <input type="text" id="zoo-manual-name"
                                       placeholder="např. Jana Nováková"
                                       style="width:100%;max-width:300px;">
                                <p class="description">Volitelné. U permanentek se jméno na poukaz netiskne.</p>
                            </td>
                        </tr>

                        <tr>
                            <th style="padding:10px 0;">Email příjemce</th>
                            <td>
                                <input type="email" id="zoo-manual-email"
                                       placeholder="jan@example.com"
                                       style="width:100%;max-width:300px;">
                                <p class="description">Pokud vyplníte, poukaz se automaticky odešle emailem.</p>
                            </td>
                        </tr>

                        <tr>
                            <th style="padding:10px 0;">Platnost (měsíce)</th>
                            <td>
                                <input type="number" id="zoo-manual-validity"
                                       value="12" min="1" max="60"
                                       style="width:80px;">
                            </td>
                        </tr>

                        <tr>
                            <th style="padding:10px 0;">Počet kusů</th>
                            <td>
                                <input type="number" id="zoo-manual-qty"
                                       value="1" min="1" max="20"
                                       style="width:80px;">
                                <p class="description">Každý poukaz dostane vlastní unikátní kód.</p>
                            </td>
                        </tr>

                        <tr>
                            <th style="padding:10px 0;">Poznámka (interní)</th>
                            <td>
                                <input type="text" id="zoo-manual-note"
                                       placeholder="např. Náhrada za objednávku #1234"
                                       style="width:100%;max-width:300px;">
                            </td>
                        </tr>

                    </table>

                    <div style="margin-top:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                        <button type="button" id="zoo-create-btn" class="button button-primary button-large">
                            Vytvořit poukaz
                        </button>
                        <span id="zoo-create-spinner" style="display:none;color:#666;">Generuji...</span>
                    </div>

                    <div id="zoo-create-result" style="display:none;margin-top:16px;padding:14px;border-radius:6px;"></div>
                </div>

                <!-- Výsledky / naposledy vytvořené -->
                <div>
                    <div id="zoo-created-list" style="display:none;">
                        <h2>Vytvořené poukazy</h2>
                        <div id="zoo-created-items"></div>
                    </div>

                    <div style="background:#f9f9f9;padding:20px;border:1px solid #e0e0e0;border-radius:6px;margin-top:0;">
                        <h3 style="margin-top:0;">ℹ️ Jak to funguje</h3>
                        <ul style="color:#555;line-height:1.8;margin:0;padding-left:18px;">
                            <li>Poukaz se okamžitě uloží do databáze</li>
                            <li>PDF se vygeneruje automaticky</li>
                            <li>Pokud zadáte email, poukaz se odesle</li>
                            <li>Krmení se zapíše i do Amelie (100% kupon)</li>
                            <li>Poukaz najdete v <a href="<?php echo esc_url(admin_url('admin.php?page=zoo-vouchers')); ?>">přehledu voucherů</a></li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>

        <script>
        jQuery(function($){

            var typeSelect    = $('#zoo-manual-type');
            var variantSelect = $('#zoo-manual-variant');

            // Zobraz/skryj pole podle typu
            typeSelect.on('change', function(){
                var type = $(this).val();
                var isKrmeni     = type === 'krmeni';
                var isPermanentka = type === 'permanentka_neprenosna' || type === 'permanentka_prenosna';
                var isEntry      = type === 'vstupenka';
                var hasType      = type !== '';

                // Varianta
                $('.zoo-row-variant').toggle( hasType );
                $('.zoo-entry-variant').toggle( ! isKrmeni );
                $('.zoo-krmeni-variant').toggle( isKrmeni );
                variantSelect.val('');

                // Zvíře
                $('.zoo-row-animal').toggle( isKrmeni );

                // Jméno – skryj u permanentek
                $('.zoo-row-name').toggle( ! isPermanentka );
            });

            // Vytvoření
            $('#zoo-create-btn').on('click', function(){
                var type     = typeSelect.val();
                var variant  = variantSelect.val();
                var animal   = $('#zoo-manual-animal').val();
                var name     = $('#zoo-manual-name').val().trim();
                var email    = $('#zoo-manual-email').val().trim();
                var validity = parseInt( $('#zoo-manual-validity').val() ) || 12;
                var qty      = parseInt( $('#zoo-manual-qty').val() ) || 1;
                var note     = $('#zoo-manual-note').val().trim();

                if ( ! type ) { alert('Vyberte typ poukazu.'); return; }
                if ( ! variant ) { alert('Vyberte variantu.'); return; }
                if ( type === 'krmeni' && ! animal ) { alert('Vyberte zvire pro krmeni.'); return; }

                $('#zoo-create-btn').prop('disabled', true);
                $('#zoo-create-spinner').show();
                $('#zoo-create-result').hide();

                $.post(ajaxurl, {
                    action:   'zoo_create_manual_voucher',
                    nonce:    '<?php echo wp_create_nonce('zoo_create_manual'); ?>',
                    type:     type,
                    variant:  variant,
                    animal:   animal,
                    name:     name,
                    email:    email,
                    validity: validity,
                    qty:      qty,
                    note:     note
                }, function(res){
                    $('#zoo-create-btn').prop('disabled', false);
                    $('#zoo-create-spinner').hide();

                    var $result = $('#zoo-create-result');

                    if ( res.success ) {
                        $result.css({ display:'block', background:'#d4edda', color:'#155724', border:'2px solid #c3e6cb' });
                        $result.html('<strong>✅ Vytvoreno ' + res.data.vouchers.length + ' poukaz(u)!</strong>' + (res.data.email_sent ? ' Email odeslan.' : '') );

                        // Zobraz vytvořené poukazy
                        $('#zoo-created-list').show();
                        $.each( res.data.vouchers, function(i, v){
                            var html = '<div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:14px;margin-bottom:10px;">';
                            html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">';
                            html += '<div>';
                            html += '<code style="font-size:18px;font-weight:700;color:#1c4426;letter-spacing:2px;">' + v.code + '</code><br>';
                            html += '<small style="color:#888;">' + v.type + ' · ' + v.variant + (v.animal ? ' · ' + v.animal : '') + ' · plati do ' + v.valid_until + '</small>';
                            html += '</div>';
                            html += '<a href="' + v.pdf_url + '" target="_blank" class="button button-small">PDF</a>';
                            html += '</div>';
                            html += '</div>';
                            $('#zoo-created-items').prepend(html);
                        });

                    } else {
                        $result.css({ display:'block', background:'#f8d7da', color:'#721c24', border:'2px solid #f5c6cb' });
                        $result.html('⚠️ ' + ( typeof res.data === 'string' ? res.data : 'Chyba pri vytvareni.' ) );
                    }
                });
            });

        });
        </script>
        <?php
    }

    public static function ajax_create() {
        check_ajax_referer( 'zoo_create_manual', 'nonce' );
        if ( ! current_user_can( 'manage_woocommerce' ) ) wp_send_json_error( 'Nedostatecna opravneni.' );

        $type     = sanitize_key( isset($_POST['type'])    ? $_POST['type']    : '' );
        $variant  = sanitize_key( isset($_POST['variant']) ? $_POST['variant'] : '' );
        $animal   = sanitize_key( isset($_POST['animal'])  ? $_POST['animal']  : '' );
        $name     = sanitize_text_field( isset($_POST['name'])  ? $_POST['name']  : '' );
        $email    = sanitize_email( isset($_POST['email']) ? $_POST['email']   : '' );
        $validity = max( 1, min( 60, intval( isset($_POST['validity']) ? $_POST['validity'] : 12 ) ) );
        $qty      = max( 1, min( 20, intval( isset($_POST['qty'])      ? $_POST['qty']      : 1  ) ) );
        $note     = sanitize_text_field( isset($_POST['note']) ? $_POST['note'] : '' );

        if ( ! $type || ! $variant ) wp_send_json_error( 'Chybi typ nebo varianta.' );
        if ( ! isset( Zoo_Vouchers_Config::TYPES[$type] ) ) wp_send_json_error( 'Neznamy typ.' );

        // Permanentky – jméno se na poukaz netiskne
        $is_permanentka = in_array( $type, array( 'permanentka_neprenosna', 'permanentka_prenosna' ) );
        $recipient_name = $is_permanentka ? '' : $name;

        $valid_until = date( 'Y-m-d', strtotime( "+{$validity} months" ) );
        $created     = array();

        for ( $i = 0; $i < $qty; $i++ ) {
            // Vygeneruj unikátní kód
            $code = self::generate_code();

            $data = array(
                'code'            => $code,
                'order_id'        => 0,
                'order_item_id'   => 0,
                'product_id'      => 0,
                'variation_id'    => 0,
                'doc_type'        => $type,
                'variant'         => $variant,
                'animal_key'      => $animal ? $animal : null,
                'status'          => 'active',
                'recipient_name'  => $recipient_name,
                'recipient_email' => $email,
                'valid_until'     => $valid_until,
                'created_at'      => current_time( 'mysql' ),
            );

            $vid = Zoo_Vouchers_Database::insert( $data );
            if ( ! $vid ) continue;

            // Vytvoř WC kupon pro uplatnění na pokladně
            Zoo_Vouchers_WC_Coupon::create_coupon( $vid, $valid_until );

            // Vygeneruj PDF
            Zoo_Vouchers_PDF::generate( $vid );

            $created[] = array(
                'id'        => $vid,
                'code'      => $code,
                'type'      => Zoo_Vouchers_Config::TYPES[ $type ],
                'variant'   => Zoo_Vouchers_Config::variant_label( $type, $variant ),
                'animal'    => $animal ? Zoo_Vouchers_Config::animal_label( $animal ) : '',
                'valid_until' => date_i18n( 'd.m.Y', strtotime( $valid_until ) ),
                'pdf_url'   => Zoo_Vouchers_PDF::get_download_url( $code ),
            );
        }

        if ( empty( $created ) ) wp_send_json_error( 'Nepodarilo se vytvorit poukaz.' );

        // Odeslat email pokud je zadán
        $email_sent = false;
        if ( $email && ! empty( $created ) ) {
            $ids = array_column( $created, 'id' );
            // Vytvoř fake order objekt pro email
            $fake_order = new Zoo_Vouchers_Fake_Order( $email, $name );
            $email_sent = Zoo_Vouchers_Email::send_vouchers( $ids, $fake_order );
        }

        // Přidej poznámku do admin logu
        if ( $note ) {
            foreach ( $created as $cv ) {
                Zoo_Vouchers_Database::update( $cv['id'], array() ); // touch
            }
        }

        wp_send_json_success( array(
            'vouchers'   => $created,
            'email_sent' => $email_sent,
        ) );
    }

    private static function generate_code() {
        do {
            $code = 'ZOO-' . strtoupper( substr( base_convert( bin2hex( random_bytes(3) ), 16, 36 ), 0, 4 ) )
                          . '-' . strtoupper( substr( base_convert( bin2hex( random_bytes(3) ), 16, 36 ), 0, 4 ) );
        } while ( Zoo_Vouchers_Database::get_by_code( $code ) );
        return $code;
    }
}

/**
 * Minimální fake order objekt pro odesílání emailů při ručním vytvoření.
 */
class Zoo_Vouchers_Fake_Order {
    private $email;
    private $name;

    public function __construct( $email, $name ) {
        $this->email = $email;
        $this->name  = $name;
    }
    public function get_billing_email()      { return $this->email; }
    public function get_billing_first_name() {
        $parts = explode( ' ', $this->name );
        return isset( $parts[0] ) ? $parts[0] : $this->name;
    }
    public function get_id() { return 0; }
}
