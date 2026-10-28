<?php
/**
 * Child-process harness for GiftCardRedemptionTest (Spec 27, FR-27-GC5, FR-27-GC10).
 *
 * Runs the REAL `Gift_Card_Redemption`, `Gift_Card_Services`, ledger and lookup
 * against a fake WooCommerce cart and session, with the in-memory store, and
 * prints one JSON object of scenario results.
 *
 *   php tests/php/support/gift-card-redemption-harness.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

namespace {

	define( 'ABSPATH', dirname( __DIR__, 3 ) . '/' );
	$GLOBALS['t_options']   = array();
	$GLOBALS['t_transient'] = array();
	$GLOBALS['t_session']   = array();
	$GLOBALS['t_cart']      = null;

	function get_option( $k, $d = false ) { return $GLOBALS['t_options'][ $k ] ?? $d; }
	function get_transient( $k ) { return $GLOBALS['t_transient'][ $k ] ?? false; }
	function set_transient( $k, $v, $ttl = 0 ) { $GLOBALS['t_transient'][ $k ] = $v; return true; }
	function wp_salt( $s = '' ) { return 'harness-salt-' . $s; }
	function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
	function wp_unslash( $s ) { return $s; }
	function __( $s ) { return $s; }
	function is_admin() { return false; }
	function wp_doing_ajax() { return false; }
	function wp_date( $f ) { return '2026-10-28'; }

	class WC_Tax {
		public static $rate = 20.0;
		public static function get_rates( $class ) { return array( array( 'rate' => (string) self::$rate ) ); }
	}

	class T_Gift_Product { public function get_type() { return 'sgs_gift_card'; } }
	class T_Plain_Product { public function get_type() { return 'simple'; } }

	class T_Fees {
		public $fees = array();
		public function add_fee( $args ) { $o = (object) $args; $this->fees[ $o->id ] = $o; return $o; }
		public function get_fees() { return $this->fees; }
	}

	class T_Cart {
		public $items; public $coupons; public $contents = 20.0; public $contents_tax = 0.0; public $ship = 3.99; public $ship_tax = 0.0; public $fees;
		public function __construct( $items, $coupons = array() ) { $this->items = $items; $this->coupons = $coupons; $this->fees = new T_Fees(); }
		public function get_cart() { return $this->items; }
		public function get_applied_coupons() { return $this->coupons; }
		public function get_cart_contents_total() { return $this->contents; }
		public function get_cart_contents_tax() { return $this->contents_tax; }
		public function get_shipping_total() { return $this->ship; }
		public function get_shipping_tax() { return $this->ship_tax; }
		public function fees_api() { return $this->fees; }
	}

	class T_Session {
		public function get( $k, $d = null ) { return $GLOBALS['t_session'][ $k ] ?? $d; }
		public function set( $k, $v ) { $GLOBALS['t_session'][ $k ] = $v; }
	}

	function WC() {
		static $wc = null;
		if ( null === $wc ) {
			$wc = new stdClass();
			$wc->session = new T_Session();
		}
		$wc->cart = $GLOBALS['t_cart'];
		return $wc;
	}

	$_SERVER['REMOTE_ADDR'] = '203.0.113.9';

	$dir = dirname( __DIR__, 3 ) . '/includes/gift-card/';
	require_once __DIR__ . '/gift-card-domain.php';
	foreach ( array( 'class-gift-card-product-type.php', 'class-gift-card-tables.php', 'class-gift-card-wpdb-store.php', 'class-gift-card-services.php', 'class-gift-card-redemption.php' ) as $f ) {
		require_once $dir . $f;
	}

	use SGS\Blocks\Gift_Card\Gift_Card_Code;
	use SGS\Blocks\Gift_Card\Gift_Card_Redemption;
	use SGS\Blocks\Gift_Card\Gift_Card_Services;
	use SGS\Blocks\Tests\Support\Memory_Gift_Card_Store;

	$store = new Memory_Gift_Card_Store();
	Gift_Card_Services::use_store( $store );

	function new_card( $store, int $pence ): array {
		$ledger = Gift_Card_Services::ledger();
		$id     = $ledger->create( array( 'initial_pence' => $pence ), time() );
		$code   = Gift_Card_Code::generate();
		$norm   = Gift_Card_Code::normalise( $code );
		$ledger->claim_code( $id, Gift_Card_Code::hash( $norm, Gift_Card_Code::default_key() ), Gift_Card_Code::last4( $norm ), time() );
		return array( $id, $code );
	}

	function settings( array $o ) {
		$GLOBALS['t_options']['sgs_gift_card_settings'] = $o;
		Gift_Card_Services::settings( true );
	}

	function fee_report( T_Cart $cart ): array {
		$out = array();
		foreach ( $cart->fees_api()->get_fees() as $fee ) {
			$out[] = array( 'id' => $fee->id, 'name' => $fee->name, 'amount' => round( $fee->amount, 2 ), 'taxable' => $fee->taxable );
		}
		return $out;
	}

	function run_fees( array $ids, T_Cart $cart ): array {
		$GLOBALS['t_cart'] = $cart;
		$GLOBALS['t_session']['sgs_gift_card_ids'] = $ids;
		Gift_Card_Redemption::add_fees( $cart );
		return fee_report( $cart );
	}

	$plain = array( array( 'data' => new T_Plain_Product() ) );
	$gift  = array( array( 'data' => new T_Gift_Product() ) );
	$r     = array();

	// ---- apply() ----------------------------------------------------------------
	settings( array() );
	list( $big_id, $big_code ) = new_card( $store, 5000 );

	$GLOBALS['t_cart'] = new T_Cart( $gift );
	try {
		Gift_Card_Redemption::apply( $big_code );
		$r['apply_to_gift_cart'] = 'APPLIED';
	} catch ( \SGS\Blocks\Gift_Card\Gift_Card_Exception $e ) {
		$r['apply_to_gift_cart'] = $e->reason();
	}
	$r['session_after_refused'] = Gift_Card_Redemption::applied_ids();

	$GLOBALS['t_cart'] = new T_Cart( $plain );
	$r['apply_to_normal_cart'] = Gift_Card_Redemption::apply( $big_code ) === $big_id ? 'APPLIED' : 'WRONG';
	$r['session_after_apply']  = Gift_Card_Redemption::applied_ids();
	try {
		Gift_Card_Redemption::apply( '0000-0000-0000-0000' );
		$r['apply_bad_code'] = 'APPLIED';
	} catch ( \SGS\Blocks\Gift_Card\Gift_Card_Exception $e ) {
		$r['apply_bad_code'] = $e->getMessage();
	}
	Gift_Card_Redemption::remove( $big_id );
	$r['session_after_remove'] = Gift_Card_Redemption::applied_ids();

	// ---- fees: multi-purpose (default) -----------------------------------------
	settings( array() );
	$r['mpv_covers_goods_and_delivery'] = run_fees( array( $big_id ), new T_Cart( $plain ) );

	list( $small_id ) = new_card( $store, 1000 );
	$r['mpv_capped_at_balance']     = run_fees( array( $small_id ), new T_Cart( $plain ) );
	$r['two_cards_in_order']        = run_fees( array( $small_id, $big_id ), new T_Cart( $plain ) );

	$r['gift_card_in_cart_no_fee']  = run_fees( array( $big_id ), new T_Cart( $gift ) );

	settings( array( 'allow_on_delivery' => false ) );
	$r['no_delivery_when_off']      = run_fees( array( $big_id ), new T_Cart( $plain ) );

	settings( array( 'allow_with_coupons' => false ) );
	$r['coupon_blocks_when_off']    = run_fees( array( $big_id ), new T_Cart( $plain, array( 'SAVE10' ) ) );
	$r['no_coupon_ok_when_off']     = run_fees( array( $big_id ), new T_Cart( $plain ) );

	settings( array( 'allow_with_coupons' => true ) );
	$r['coupon_allowed_by_default'] = run_fees( array( $big_id ), new T_Cart( $plain, array( 'SAVE10' ) ) );

	// VAT: items 20.00 + 4.00 tax = 24.00 payable (delivery off to keep the sum simple).
	settings( array( 'allow_on_delivery' => false ) );
	$taxed = new T_Cart( $plain );
	$taxed->contents_tax = 4.0;
	$r['mpv_payable_includes_tax'] = run_fees( array( $big_id ), $taxed );

	settings( array( 'vat_mode' => 'single_purpose', 'allow_on_delivery' => false, 'spv_tax_class' => '' ) );
	$taxed2 = new T_Cart( $plain );
	$taxed2->contents_tax = 4.0;
	$r['spv_fee_is_net_and_taxable'] = run_fees( array( $big_id ), $taxed2 );

	// A card that has since been spent contributes nothing.
	settings( array() );
	Gift_Card_Services::ledger()->adjust( $small_id, -1000, 'drain', 1 );
	$r['spent_card_no_fee'] = run_fees( array( $small_id ), new T_Cart( $plain ) );

	echo json_encode( $r );
}
