<?php
defined( 'ABSPATH' ) || exit;

/**
 * Přidá pole „Pro koho je poukaz" na stránku produktu
 * pro všechny produkty označené jako voucher.
 *
 * Data flow:
 *   Stránka produktu → $_POST → cart item data → order item meta (_zoo_recipient_name)
 *   Generator pak čte _zoo_recipient_name z order item meta.
 */
class Zoo_Vouchers_Product_Fields {

    public static function init(): void {
        add_action( 'woocommerce_before_add_to_cart_button',           [ __CLASS__, 'render_field' ] );
        add_filter( 'woocommerce_add_cart_item_data',                  [ __CLASS__, 'save_to_cart' ], 10, 2 );
        add_filter( 'woocommerce_get_item_data',                       [ __CLASS__, 'show_in_cart' ], 10, 2 );
        add_action( 'woocommerce_checkout_create_order_line_item',     [ __CLASS__, 'save_to_order_item' ], 10, 4 );
        add_action( 'woocommerce_after_order_itemmeta',                [ __CLASS__, 'show_in_admin_order' ], 10, 3 );
    }

    // ── Zobrazení pole na stránce produktu ───────────────────────────────────

    public static function render_field(): void {
        global $product;
        if ( ! $product ) return;

        $type = get_post_meta( $product->get_id(), '_zoo_voucher_type', true );
        if ( ! $type ) return;

        if ( $type === 'permanentka_neprenosna' || $type === 'permanentka_prenosna' ) {
            $label       = 'Pro koho je permanentka?';
            $placeholder = 'Poukaz pro: Karel Novák';
        } elseif ( $type === 'krmeni' ) {
            $label       = 'Jméno na poukazu';
            $placeholder = 'Poukaz pro: Honzíka / Verunku';
        } else {
            $label       = 'Jméno na vstupence';
            $placeholder = 'Poukaz pro: Honzíka / Verunku';
        }
        ?>
        <div class="zoo-recipient-field" style="margin: 12px 0 16px;">
            <label for="zoo_recipient_name" style="display:block; font-weight:600; margin-bottom:6px; font-size:14px;">
                <?php echo esc_html( $label ); ?>
                <span style="font-weight:400; color:#888; font-size:13px;"> – volitelné</span>
            </label>
            <div style="position:relative;">
                <input
                    type="text"
                    id="zoo_recipient_name"
                    name="zoo_recipient_name"
                    placeholder="<?php echo esc_attr( $placeholder ); ?>"
                    maxlength="25"
                    style="width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:4px; font-size:14px; padding-right:45px;"
                    autocomplete="off"
                    oninput="document.getElementById('zoo_name_count').textContent=(25-this.value.length)"
                >
                <span id="zoo_name_count" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:12px;color:#aaa;">25</span>
            </div>
            <p style="margin:5px 0 0; font-size:12px; color:#999;">
                Jméno se vytiskne na poukaz. Max. 25 znaků.
            </p>
        </div>
        <?php
    }

    // ── Uložení do cart item data ────────────────────────────────────────────

    public static function save_to_cart( array $cart_item_data, int $product_id ): array {
        $type = get_post_meta( $product_id, '_zoo_voucher_type', true );
        if ( ! $type ) return $cart_item_data;

        $name = mb_substr( sanitize_text_field( trim( $_POST['zoo_recipient_name'] ?? '' ) ), 0, 25 );

        // Uložit i prázdný string — generator pak vrátí prázdné pole na PDF
        $cart_item_data['zoo_recipient_name'] = $name;

        // Unikátní cart key aby každý poukaz (i stejný produkt) byl samostatná položka
        if ( $name ) {
            $cart_item_data['zoo_unique_key'] = md5( $name . microtime() );
        }

        return $cart_item_data;
    }

    // ── Zobrazení v košíku / na stránce pokladny ─────────────────────────────

    public static function show_in_cart( array $item_data, array $cart_item ): array {
        if ( ! isset( $cart_item['zoo_recipient_name'] ) ) return $item_data;

        $name = $cart_item['zoo_recipient_name'];
        if ( $name === '' ) return $item_data; // prázdné nezobrazovat

        $item_data[] = [
            'name'  => 'Pro koho',
            'value' => esc_html( $name ),
        ];

        return $item_data;
    }

    // ── Uložení do order item meta ────────────────────────────────────────────

    public static function save_to_order_item(
        WC_Order_Item_Product $item,
        string $cart_item_key,
        array $values,
        WC_Order $order
    ): void {
        if ( ! isset( $values['zoo_recipient_name'] ) ) return;

        // Uložit vždy — i prázdný string (generator pak nechá pole prázdné)
        $item->update_meta_data( '_zoo_recipient_name', $values['zoo_recipient_name'] );
    }

    // ── Zobrazení v admin detailu objednávky ──────────────────────────────────

    public static function show_in_admin_order( int $item_id, $item, $product ): void {
        if ( ! $item instanceof WC_Order_Item_Product ) return;

        $name = $item->get_meta( '_zoo_recipient_name' );
        if ( $name === null || $name === '' ) return;

        echo '<div style="margin-top:6px; font-size:12px; color:#555;">';
        echo '<strong>Pro koho:</strong> ' . esc_html( $name );
        echo '</div>';
    }
}
