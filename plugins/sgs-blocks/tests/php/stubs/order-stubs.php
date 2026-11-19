<?php
/**
 * Test scaffolding: a small WooCommerce order double and the WordPress functions the order binding, the order Show-to
 * rules and sgs/order-items call. State lives in `$GLOBALS['sgs_t']`. Nothing here is shipped.
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable

if ( ! class_exists( 'WC_DateTime', false ) ) {
	class WC_DateTime extends DateTime {
		public function getTimestamp(): int { return parent::getTimestamp(); }
	}
}
if ( ! class_exists( 'WC_Session', false ) ) {
	class WC_Session {
		public function get( $k ) { return $GLOBALS['sgs_t']['session'][ $k ] ?? 0; }
	}
}
if ( ! class_exists( 'WC_Order_Item', false ) ) {
	class WC_Order_Item {
		public function __construct( public array $d ) {}
		public function get_name() { return $this->d['name']; }
		public function get_quantity() { return $this->d['qty'] ?? 1; }
		public function get_total() { return $this->d['total'] ?? '0'; }
		public function get_product() { $id = (int) ( $this->d['image_id'] ?? 0 ); return $id ? new class( $id ) { public function __construct( private int $id ) {} public function get_image_id() { return $this->id; } } : false; }
		public function get_product_id() { return $this->d['product_id'] ?? 0; }
		public function get_variation_id() { return $this->d['variation_id'] ?? 0; }
		public function get_method_title() { return $this->d['name']; }
		public function get_meta_data() { return $this->d['meta'] ?? array(); }
		public function get_formatted_meta_data() { return array_map( fn( $m ) => (object) $m, $this->d['fmeta'] ?? array() ); }
	}
}
if ( ! class_exists( 'WC_Order', false ) ) {
	class WC_Order {
		public function __construct( public array $d ) {}
		public function get_id() { return $this->d['id']; }
		public function get_order_number() { return $this->d['number'] ?? (string) $this->d['id']; }
		public function key_is_valid( $k ) { return ( $this->d['key'] ?? '' ) === $k; }
		public function get_user_id() { return $this->d['user'] ?? 0; }
		public function get_customer_id() { return $this->d['user'] ?? 0; }
		public function get_billing_email() { return $this->d['email'] ?? ''; }
		public function get_shipping_method() { return $this->d['ship'] ?? ''; }
		public function get_formatted_order_total() { return $this->d['total_html'] ?? ''; }
		public function get_date_created() { return isset( $this->d['created'] ) ? new WC_DateTime( '@' . $this->d['created'] ) : null; }
		public function get_view_order_url() { return 'https://shop.test/my-account/view-order/' . $this->d['id'] . '/'; }
		public function get_meta( $k, $single = true ) { return $this->d['meta'][ $k ] ?? ''; }
		public function get_item_count() { return $this->d['count'] ?? 0; }
		public function get_items( $type = 'line_item' ) { return array_map( fn( $i ) => new WC_Order_Item( $i ), $this->d['items'] ?? array() ); }
		public function get_shipping_methods() { return array_map( fn( $i ) => new WC_Order_Item( $i ), $this->d['shipping'] ?? array() ); }
		public function get_subtotal() { return $this->d['subtotal'] ?? 0; }
		public function get_total() { return $this->d['total'] ?? 0; }
		public function get_shipping_total() { return $this->d['ship_total'] ?? 0; }
		public function get_total_discount() { return $this->d['discount'] ?? 0; }
		public function get_currency() { return 'GBP'; }
		public function get_shipping_tax() { return $this->d['ship_tax'] ?? 0; }
		public function get_formatted_line_subtotal( $item ) { return $item->d['price'] ?? ''; }
		public function get_order_item_totals() { return $this->d['totals'] ?? array(); }
		public function get_fees() { return array_map( fn( $i ) => new WC_Order_Item( $i ), $this->d['fees'] ?? array() ); }
		public function get_address( $type = 'billing' ) { return $this->d[ $type ] ?? array(); }
		public function has_shipping_address() { return ! empty( $this->d['shipping']['address_1'] ?? '' ); }
		public function has_billing_address() { return ! empty( $this->d['billing']['address_1'] ?? '' ); }
		public function needs_shipping_address() { return $this->d['needs_shipping'] ?? true; }
		public function get_formatted_shipping_full_name() { return trim( ( $this->d['shipping']['first_name'] ?? '' ) . ' ' . ( $this->d['shipping']['last_name'] ?? '' ) ); }
		public function get_formatted_billing_full_name() { return trim( ( $this->d['billing']['first_name'] ?? '' ) . ' ' . ( $this->d['billing']['last_name'] ?? '' ) ); }
		public function get_billing_phone() { return $this->d['billing']['phone'] ?? ''; }
		public function get_shipping_phone() { return $this->d['shipping']['phone'] ?? ''; }
		public function get_payment_method_title() { return $this->d['payment'] ?? ''; }
	}
}

$GLOBALS['sgs_t'] = array( 'orders' => array(), 'query' => array(), 'user' => 0, 'get' => array(), 'post' => array(), 'session' => array() );

if ( ! defined( 'ABSPATH' ) ) { define( 'ABSPATH', __DIR__ ); }
if ( ! defined( 'MINUTE_IN_SECONDS' ) ) { define( 'MINUTE_IN_SECONDS', 60 ); }

function sgs_t_order( array $d ): WC_Order { $o = new WC_Order( $d ); $GLOBALS['sgs_t']['orders'][ $d['id'] ] = $o; return $o; }

function add_filter( $t, $cb, $p = 10, $a = 1 ) {}
function add_action( $t, $cb, $p = 10, $a = 1 ) {}
function apply_filters( $t, $v ) { return $v; }
function is_admin() { return false; }
function is_user_logged_in() { return $GLOBALS['sgs_t']['user'] > 0; }
function get_current_user_id() { return $GLOBALS['sgs_t']['user']; }
function get_query_var( $k, $d = '' ) { return $GLOBALS['sgs_t']['query'][ $k ] ?? $d; }
function absint( $v ) { return abs( (int) $v ); }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) ); }
function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function sanitize_email( $s ) { return trim( (string) $s ); }
function wp_strip_all_tags( $s ) { return trim( strip_tags( (string) $s ) ); }
function wp_unslash( $v ) { return $v; }
function wc_clean( $v ) { return is_string( $v ) ? trim( $v ) : $v; }
function esc_url_raw( $u ) { return (string) $u; }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
function wc_get_order( $id ) { return $GLOBALS['sgs_t']['orders'][ $id ] ?? false; }
function wc_format_datetime( $dt, $format = '' ) { return $dt ? gmdate( '' !== $format ? $format : 'j F Y', $dt->getTimestamp() ) : ''; }
function wc_price( $amount, $args = array() ) { return '<span class="amount">&pound;' . number_format( (float) $amount, 2 ) . '</span>'; }
function wc_get_product( $id ) { return false; }
// WooCommerce's address formatter, reduced to its contract: the name line (blank when both names are), then each filled part, joined by the separator.
function WC() {
	return new class {
		public $session = null;
		public $countries;
		public function __construct() {
			$this->countries = new class {
				public function get_formatted_address( $a = array(), $sep = '<br/>' ) {
					$name  = trim( ( $a['first_name'] ?? '' ) . ' ' . ( $a['last_name'] ?? '' ) );
					$parts = array( $name, $a['company'] ?? '', $a['address_1'] ?? '', $a['address_2'] ?? '', $a['city'] ?? '', $a['state'] ?? '', $a['postcode'] ?? '' );
					return implode( $sep, array_values( array_filter( array_map( 'trim', $parts ), 'strlen' ) ) );
				}
			};
		}
	};
}

// A scenario handed to a child process (the render harness) as JSON in the environment: orders, query, key, user.
$sgs_t_scenario = getenv( 'SGS_T_SCENARIO' );
if ( is_string( $sgs_t_scenario ) && '' !== $sgs_t_scenario ) {
	$sgs_t_data = json_decode( $sgs_t_scenario, true );
	foreach ( (array) ( $sgs_t_data['orders'] ?? array() ) as $sgs_t_order ) {
		sgs_t_order( $sgs_t_order );
	}
	$GLOBALS['sgs_t']['query'] = (array) ( $sgs_t_data['query'] ?? array() );
	$GLOBALS['sgs_t']['user']  = (int) ( $sgs_t_data['user'] ?? 0 );
	// Attachment 77 is a 400 x 400 picture, for the media renderer's file and size reads.
	$GLOBALS['sgs_qa_attachments']     = array( '77' => 'https://example.test/wp-content/uploads/p77.jpg' );
	$GLOBALS['sgs_qa_attachment_meta'] = array( '77' => array( 'width' => 400, 'height' => 400 ) );
	$_GET['key']               = (string) ( $sgs_t_data['key'] ?? '' );
	require_once dirname( __DIR__, 3 ) . '/includes/gift-order/class-gift-order-order.php';
	require_once dirname( __DIR__, 3 ) . '/includes/class-order-binding.php';
}
