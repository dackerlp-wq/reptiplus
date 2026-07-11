<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><title>Vaše vouchery – Zoopark Zájezd</title></head>
<body style="margin:0;padding:0;background:#f0ede4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede4;padding:40px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

      <tr><td style="background:#1c4426;padding:28px 40px;text-align:center;">
        <p style="margin:0;color:#f5f0e1;font-size:24px;font-weight:700;">Zoopark Zájezd</p>
        <p style="margin:6px 0 0;color:#a8c89a;font-size:13px;">
          <?php echo count( $vouchers ) > 1 ? count( $vouchers ) . ' vouchery' : esc_html( $vouchers[0]->type_label() ); ?>
        </p>
      </td></tr>

      <tr><td style="padding:32px 40px;">

        <p style="font-size:16px;color:#333;margin-top:0;">
          Dobrý den<?php
            $name = $order->get_billing_first_name();
            if ( $name ) echo ', <strong>' . esc_html( $name ) . '</strong>';
          ?>,
        </p>
        <p style="color:#555;line-height:1.7;">
          Děkujeme za nákup. Níže najdete přehled vašich voucherů.
          Každý voucher je také přiložen jako PDF soubor.
        </p>

        <?php foreach ( $vouchers as $voucher ) : ?>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:2px dashed #e8a000;border-radius:8px;">
          <tr><td style="padding:20px;background:#fffdf5;">

            <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">
              <?php echo esc_html( $voucher->type_label() ); ?>
              <?php if ( $voucher->is_krmeni() && $voucher->animal_key ) echo ' – ' . esc_html( $voucher->animal_label() ); ?>
              <?php if ( $voucher->variant_label() ) echo ' · ' . esc_html( $voucher->variant_label() ); ?>
            </p>

            <?php if ( $voucher->recipient_name ) : ?>
            <p style="margin:0 0 10px;font-size:13px;color:#666;">
              Pro: <strong><?php echo esc_html( $voucher->recipient_name ); ?></strong>
            </p>
            <?php endif; ?>

            <p style="margin:0 0 6px;font-family:monospace;font-size:24px;font-weight:700;color:#1c4426;letter-spacing:3px;">
              <?php echo esc_html( $voucher->code ); ?>
            </p>

            <?php if ( $voucher->valid_until ) : ?>
            <p style="margin:6px 0 0;font-size:12px;color:#999;">
              Platnost do: <?php echo esc_html( date_i18n( 'd. m. Y', strtotime( $voucher->valid_until ) ) ); ?>
            </p>
            <?php endif; ?>

            <?php if ( $voucher->is_krmeni() ) : ?>
            <p style="margin:12px 0 0;font-size:12px;color:#555;border-top:1px solid #f0e8d0;padding-top:10px;">
              Jak uplatnit: Přejděte na <a href="https://obchod.zoopark-zajezd.cz/rezervace/" style="color:#1c4426;font-weight:600;">stránku rezervací</a>,
              vyberte termín krmení a zadejte kód do pole „Slevový kupón".
            </p>
            <?php elseif ( $voucher->is_entry() ) : ?>
            <p style="margin:12px 0 0;font-size:12px;color:#555;border-top:1px solid #f0e8d0;padding-top:10px;">
              Jak uplatnit: Na pokladně sdělte číslo poukazu nebo nechte naskenovat QR kód z PDF.
            </p>
            <?php endif; ?>

          </td></tr>
        </table>
        <?php endforeach; ?>

      </td></tr>

      <tr><td style="background:#f5f0e1;padding:20px 40px;text-align:center;border-top:1px solid #e8dfc8;">
        <p style="margin:0 0 6px;font-size:11px;color:#999;">
          Zoopark Zájezd · Zájezd 5, 273 43
        </p>
        <p style="margin:0;font-size:11px;color:#999;">
          <a href="mailto:evvo@zoopark-zajezd.cz" style="color:#1c4426;">evvo@zoopark-zajezd.cz</a>
          &nbsp;·&nbsp;
          <a href="https://www.zoopark-zajezd.cz" style="color:#1c4426;">www.zoopark-zajezd.cz</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
