<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_Admin {

    public static function init(): void {
        add_action( 'admin_menu',                        [ __CLASS__, 'menu' ] );
        add_action( 'admin_post_zoo_voucher_action',     [ __CLASS__, 'handle_action' ] );
    }

    public static function menu(): void {
        add_submenu_page( 'woocommerce', 'Zoo Vouchery', 'Zoo Vouchery 🎟',
            'manage_woocommerce', 'zoo-vouchers', [ __CLASS__, 'page' ] );
    }

    public static function page(): void {
        $status      = sanitize_key( isset($_GET['status'])      ? $_GET['status']      : '' );
        $type_filter = sanitize_key( isset($_GET['filter_type']) ? $_GET['filter_type'] : '' );
        $search      = sanitize_text_field( isset($_GET['s'])    ? $_GET['s']           : '' );
        $paged       = max( 1, (int) ( isset($_GET['paged'])     ? $_GET['paged']       : 1 ) );
        $limit       = 40;

        $vouchers = Zoo_Vouchers_Database::get_all( array(
            'status'   => $status,
            'doc_type' => $type_filter,
            'search'   => $search,
            'limit'    => $limit,
            'offset'   => ( $paged - 1 ) * $limit,
        ) );

        $status_badge = [
            'active'    => '<span style="color:#1a7a1a;font-weight:600">● Aktivní</span>',
            'used'      => '<span style="color:#666">✓ Použit</span>',
            'expired'   => '<span style="color:#c00">✗ Vypršel</span>',
            'cancelled' => '<span style="color:#c00">✗ Zrušen</span>',
        ];

        $counts = [];
        foreach ( [ '', 'active', 'used', 'expired', 'cancelled' ] as $s ) {
            $counts[ $s ] = Zoo_Vouchers_Database::count( [ 'status' => $s ] );
        }
        ?>
        <div class="wrap">
            <h1>Zoo Vouchery
                <a href="<?= esc_url( admin_url('admin.php?page=zoo-vouchers') ) ?>"
                   class="page-title-action">Všechny</a>
            </h1>

            <?php if ( ! empty( $_GET['updated'] ) ) : ?>
                <div class="notice notice-success is-dismissible"><p>Akce provedena.</p></div>
            <?php endif; ?>

            <!-- Statistiky -->
            <div style="display:flex; gap:16px; margin:16px 0;">
                <?php
                $stat_labels = [ '' => 'Celkem', 'active' => 'Aktivní', 'used' => 'Použité',
                                 'expired' => 'Vypršelé', 'cancelled' => 'Zrušené' ];
                foreach ( $stat_labels as $s => $label ) :
                    $active = $status === $s;
                    $url    = admin_url( 'admin.php?page=zoo-vouchers' . ( $s ? '&status=' . $s : '' ) );
                    ?>
                    <a href="<?= esc_url($url) ?>"
                       style="text-decoration:none; padding:12px 20px; background:<?= $active ? '#1c4426' : '#f0f0f0' ?>; color:<?= $active ? '#fff' : '#333' ?>; border-radius:6px; text-align:center; min-width:90px;">
                        <div style="font-size:22px; font-weight:700"><?= esc_html( $counts[$s] ) ?></div>
                        <div style="font-size:12px"><?= esc_html($label) ?></div>
                    </a>
                <?php endforeach; ?>
            </div>

            <!-- Filtry a vyhledávání -->
            <form method="get" style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <input type="hidden" name="page" value="zoo-vouchers">
                <select name="status" style="padding:6px;">
                    <option value="">Vsechny stavy</option>
                    <?php foreach ( array('active'=>'Aktivni','used'=>'Pouzity','expired'=>'Vyprsel','cancelled'=>'Zrusen') as $sv => $sl ) : ?>
                        <option value="<?php echo esc_attr($sv); ?>" <?php selected($status,$sv); ?>><?php echo esc_html($sl); ?></option>
                    <?php endforeach; ?>
                </select>
                <select name="filter_type" style="padding:6px;">
                    <option value="">Vsechny typy</option>
                    <?php foreach ( Zoo_Vouchers_Config::TYPES as $tv => $tl ) : ?>
                        <option value="<?php echo esc_attr($tv); ?>" <?php selected($type_filter,$tv); ?>><?php echo esc_html($tl); ?></option>
                    <?php endforeach; ?>
                </select>
                <input type="search" name="s" value="<?php echo esc_attr($search); ?>"
                       placeholder="Hledat kod, jmeno, email…" style="width:200px;padding:6px 10px;">
                <button type="submit" class="button">Filtrovat</button>
                <?php if ($status || $type_filter || $search) : ?>
                    <a href="<?php echo esc_url(admin_url('admin.php?page=zoo-vouchers')); ?>" class="button">x Zrusit</a>
                <?php endif; ?>
            </form>

            <!-- Tabulka -->
            <table class="wp-list-table widefat fixed striped" style="font-size:13px;">
                <thead>
                    <tr>
                        <th width="140">Kód</th>
                        <th width="160">Typ</th>
                        <th width="80">Stav</th>
                        <th width="70">Obj.</th>
                        <th>Příjemce</th>
                        <th width="95">Platí do</th>
                        <th width="120">Použito</th>
                        <th width="140">Akce</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ( empty( $vouchers ) ) : ?>
                        <tr><td colspan="8" style="text-align:center;padding:30px;color:#888">Žádné vouchery.</td></tr>
                    <?php else : foreach ( $vouchers as $row ) :
                        $v = new Zoo_Vouchers_Voucher( $row ); ?>
                        <tr>
                            <td><code style="font-size:12px"><?= esc_html($v->code) ?></code></td>
                            <td>
                                <?= esc_html($v->type_label()) ?><br>
                                <small style="color:#888"><?= esc_html($v->variant_label()) ?>
                                <?= $v->animal_key ? ' · ' . esc_html($v->animal_label()) : '' ?>
                                </small>
                            </td>
                            <td><?= $status_badge[$v->status] ?? esc_html($v->status) ?></td>
                            <td><a href="<?= esc_url(admin_url('post.php?post='.$v->order_id.'&action=edit')) ?>">#<?= $v->order_id ?></a></td>
                            <td>
                                <?= esc_html($v->recipient_name ?? '–') ?>
                                <?php if ($v->recipient_email) : ?>
                                    <br><small><?= esc_html($v->recipient_email) ?></small>
                                <?php endif; ?>
                            </td>
                            <td><?= $v->valid_until ? esc_html(date_i18n('d.m.Y', strtotime($v->valid_until))) : '–' ?></td>
                            <td><?= $v->used_at ? esc_html(date_i18n('d.m.Y H:i', strtotime($v->used_at))) : '–' ?></td>
                            <td>
                                <!-- PDF -->
                                <a href="<?= esc_url(Zoo_Vouchers_PDF::get_download_url($v->code)) ?>"
                                   target="_blank" class="button button-small" title="Stáhnout PDF">📄</a>

                                <!-- Znovu odeslat email -->
                                <?php if ($v->status === 'active') : ?>
                                <a href="<?= esc_url(wp_nonce_url(
                                    admin_url('admin-post.php?action=zoo_voucher_action&do=resend&id='.$v->id),
                                    'zoo_'.$v->id
                                )) ?>" class="button button-small" title="Odeslat email">📧</a>
                                <?php endif; ?>

                                <!-- Zrušit -->
                                <?php if ($v->status === 'active') : ?>
                                <a href="<?= esc_url(wp_nonce_url(
                                    admin_url('admin-post.php?action=zoo_voucher_action&do=cancel&id='.$v->id),
                                    'zoo_'.$v->id
                                )) ?>" class="button button-small"
                                   onclick="return confirm('Zrušit voucher <?= esc_js($v->code) ?>?')"
                                   style="color:#c00" title="Zrušit">✕</a>
                                <?php endif; ?>

                                <!-- Reaktivovat -->
                                <?php if (in_array($v->status, ['used','expired','cancelled'])) : ?>
                                <a href="<?= esc_url(wp_nonce_url(
                                    admin_url('admin-post.php?action=zoo_voucher_action&do=reactivate&id='.$v->id),
                                    'zoo_'.$v->id
                                )) ?>" class="button button-small"
                                   onclick="return confirm('Reaktivovat voucher <?= esc_js($v->code) ?>?')"
                                   title="Reaktivovat">↺</a>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public static function handle_action(): void {
        $do  = sanitize_key( $_GET['do'] ?? '' );
        $id  = (int) ( $_GET['id'] ?? 0 );
        if ( ! $id ) wp_die( 'Chybí ID.' );

        check_admin_referer( 'zoo_' . $id );
        if ( ! current_user_can( 'manage_woocommerce' ) ) wp_die( 'Nedostatečná oprávnění.' );

        $voucher = Zoo_Vouchers_Voucher::find_by_id( $id );
        if ( ! $voucher ) wp_die( 'Voucher nenalezen.' );

        if ( $do === 'resend' ) {
            Zoo_Vouchers_Email::send_voucher( $id );
        } elseif ( $do === 'cancel' ) {
            self::do_cancel( $voucher );
        } elseif ( $do === 'reactivate' ) {
            Zoo_Vouchers_Database::update( $id, array( 'status' => 'active', 'used_at' => null ) );
        }

        wp_safe_redirect( admin_url( 'admin.php?page=zoo-vouchers&updated=1' ) );
        exit;
    }

    private static function do_cancel( Zoo_Vouchers_Voucher $v ): void {
        Zoo_Vouchers_Database::update( $v->id, [ 'status' => 'cancelled' ] );
        if ( $v->amelia_coupon_id ) {
            Zoo_Vouchers_Amelia::deactivate_coupon( $v->amelia_coupon_id );
        }
    }
}
