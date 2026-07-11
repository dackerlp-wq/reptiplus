<?php
defined( 'ABSPATH' ) || exit;

class Zoo_Vouchers_Voucher {

    public int     $id;
    public string  $code;
    public int     $order_id;
    public int     $order_item_id;
    public int     $product_id;
    public int     $variation_id;
    public string  $doc_type;
    public string  $variant;
    public ?string $animal_key;
    public string  $status;
    public ?string $recipient_name;
    public ?string $recipient_email;
    public ?string $valid_until;
    public ?string $used_at;
    public ?int    $amelia_coupon_id;
    public string  $created_at;

    public function __construct( object $row ) {
        foreach ( get_object_vars( $row ) as $k => $v ) {
            if ( property_exists( $this, $k ) ) $this->$k = $v;
        }
        $this->variation_id     = (int) ( $this->variation_id ?? 0 );
        $this->amelia_coupon_id = $this->amelia_coupon_id ? (int) $this->amelia_coupon_id : null;
    }

    public static function find( string $code ): ?self {
        $row = Zoo_Vouchers_Database::get_by_code( $code );
        return $row ? new self( $row ) : null;
    }

    public static function find_by_id( int $id ): ?self {
        $row = Zoo_Vouchers_Database::get_by_id( $id );
        return $row ? new self( $row ) : null;
    }

    public function is_active(): bool {
        if ( $this->status !== 'active' ) return false;
        if ( $this->valid_until && strtotime( $this->valid_until ) < time() ) {
            Zoo_Vouchers_Database::update( $this->id, [ 'status' => 'expired' ] );
            return false;
        }
        return true;
    }

    public function mark_used(): bool {
        return Zoo_Vouchers_Database::update( $this->id, [
            'status'  => 'used',
            'used_at' => current_time( 'mysql' ),
        ] );
    }

    public function type_label(): string {
        return Zoo_Vouchers_Config::TYPES[ $this->doc_type ] ?? $this->doc_type;
    }

    public function variant_label(): string {
        return Zoo_Vouchers_Config::variant_label( $this->doc_type, $this->variant );
    }

    public function animal_label(): string {
        return $this->animal_key ? Zoo_Vouchers_Config::animal_label( $this->animal_key ) : '';
    }

    public function is_krmeni(): bool {
        return $this->doc_type === 'krmeni';
    }

    public function is_entry(): bool {
        return in_array( $this->doc_type, [ 'vstupenka', 'permanentka_neprenosna', 'permanentka_prenosna' ], true );
    }
}
