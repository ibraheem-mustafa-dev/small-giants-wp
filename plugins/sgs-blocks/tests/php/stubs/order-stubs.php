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
		public function get_product() { return $this->d['product'] ?? false; }
		public function get_product_id() { return $this->d['product_id'] ?? 0; }
		public function get_variation_id() { return $this->d['variation_id'] ?? 0; }
		public function get_method_title() { return $this->d['name']; }
		public function get_meta_data() { return $this->d['meta'] ?? array(); }
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
		public function get_fees() { return array_map( fn( $i ) => new WC_Order_Item( $i ), $this->d['fees'] ?? array() ); }
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
function WC() { return new class { public $session = null; }; }
