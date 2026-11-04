<?php
/**
 * Standalone test: gift order and free-shipping rate hiding (Spec 27, FR-30-21, FR-30-26).
 *
 * Covers the pure parts: the session value (defaults, off clears name and note,
 * the filterable caps), the order record (on copies, off removes, no key leaves
 * the order alone), the emails (nothing printed without gift meta, the shop gets
 * the note, the buyer does not) and the rate filter (hides only when a free rate
 * is present, unset changes nothing).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-gift-order-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

$GLOBALS['sgs_test_filters']  = array();
$GLOBALS['sgs_test_options']  = array();
$GLOBALS['sgs_test_session']  = array();

function __( $text, $domain = null ) {
	return $text;
}
function esc_html( $text ) {
	return htmlspecialchars( (string) $text, ENT_QUOTES );
}
function nl2br_test( $text ) {
	return nl2br( $text );
}
function apply_filters( $name, $value ) {
	if ( isset( $GLOBALS['sgs_test_filters'][ $name ] ) ) {
		return call_user_func( $GLOBALS['sgs_test_filters'][ $name ], $value );
	}
	return $value;
}
function get_option( $name, $default = false ) {
	return $GLOBALS['sgs_test_options'][ $name ] ?? $default;
}

class WC_Session {
	public function get( $key ) {
		return $GLOBALS['sgs_test_session'][ $key ] ?? null;
	}
	public function set( $key, $value ) {
		if ( null === $value ) {
			unset( $GLOBALS['sgs_test_session'][ $key ] );
			return;
		}
		$GLOBALS['sgs_test_session'][ $key ] = $value;
	}
}
class FakeWC {
	public $session;
}
function WC() {
	static $wc = null;
	if ( null === $wc ) {
		$wc          = new FakeWC();
		$wc->session = new WC_Session();
	}
	return $wc;
}
class WC_Order {
	public $meta = array();
	public function get_meta( $key, $single = true ) {
		return $this->meta[ $key ] ?? '';
	}
	public function update_meta_data( $key, $value ) {
		$this->meta[ $key ] = $value;
	}
	public function delete_meta_data( $key ) {
		unset( $this->meta[ $key ] );
	}
}
class WC_Shipping_Rate {
	private $method;
	private $instance;
	public function __construct( $method, $instance ) {
		$this->method   = $method;
		$this->instance = $instance;
	}
	public function get_method_id() {
		return $this->method;
	}
	public function get_instance_id() {
		return $this->instance;
	}
}

require dirname( __DIR__, 2 ) . '/includes/gift-order/class-gift-order-session.php';
require dirname( __DIR__, 2 ) . '/includes/gift-order/class-gift-order-order.php';
require dirname( __DIR__, 2 ) . '/includes/gift-order/class-gift-order-emails.php';
require dirname( __DIR__, 2 ) . '/includes/class-free-shipping-hide-rates.php';

use SGS\Blocks\Free_Shipping_Hide_Rates;
use SGS\Blocks\Gift_Order\Gift_Order_Emails;
use SGS\Blocks\Gift_Order\Gift_Order_Order;
use SGS\Blocks\Gift_Order\Gift_Order_Session;

$failures = 0;
$passes   = 0;
function ok( bool $cond, string $label ): void {
	global $failures, $passes;
	if ( $cond ) {
		++$passes;
		echo "PASS  {$label}\n";
	} else {
		++$failures;
		echo "FAIL  {$label}\n";
	}
}
function captured( callable $fn ): string {
	ob_start();
	$fn();
	return (string) ob_get_clean();
}

// 1) Session value and caps.
ok( false === Gift_Order_Session::is_set(), 'a new session has no gift key' );
ok( array( 'on' => false, 'to' => '', 'message' => '' ) === Gift_Order_Session::get(), 'an unset session reads as off with empty strings' );
ok( array( 'to' => 100, 'message' => 500 ) === Gift_Order_Session::limits(), 'default caps are 100 and 500' );
$GLOBALS['sgs_test_filters']['sgs_gift_limits'] = static function ( $limits ) {
	return array( 'to' => 60, 'message' => 'bad' );
};
ok( array( 'to' => 60, 'message' => 500 ) === Gift_Order_Session::limits(), 'the filter changes a cap; a non-numeric value keeps the default' );
unset( $GLOBALS['sgs_test_filters']['sgs_gift_limits'] );
Gift_Order_Session::set( true, 'Amina', 'Congratulations' );
ok( true === Gift_Order_Session::is_set() && 'Amina' === Gift_Order_Session::get()['to'], 'a stored gift reads back' );
Gift_Order_Session::set( false, 'Amina', 'Congratulations' );
ok( true === Gift_Order_Session::is_set() && '' === Gift_Order_Session::get()['to'] && '' === Gift_Order_Session::get()['message'], 'off clears the name and note but keeps the key' );
Gift_Order_Session::clear();
ok( false === Gift_Order_Session::is_set(), 'clear removes the key' );

// 2) Order record.
$order = new WC_Order();
Gift_Order_Order::copy_to_order( $order );
ok( array() === $order->meta, 'no session key: an order with no meta stays untouched' );
Gift_Order_Session::set( true, 'Amina', "Line one\nLine two" );
Gift_Order_Order::copy_to_order( $order );
ok( 'yes' === $order->meta['_sgs_gift'] && 'Amina' === $order->meta['_sgs_gift_to'], 'on copies the flag and the name to the order' );
ok( array( 'to' => 'Amina', 'message' => "Line one\nLine two" ) === Gift_Order_Order::for_order( $order ), 'for_order reads the gift back' );
Gift_Order_Order::forget_session();
Gift_Order_Order::copy_to_order( $order );
ok( 'yes' === $order->meta['_sgs_gift'], 'after the session is cleared a payment retry leaves the order meta alone' );
Gift_Order_Session::set( false, '', '' );
Gift_Order_Order::copy_to_order( $order );
ok( array() === $order->meta && null === Gift_Order_Order::for_order( $order ), 'switching off then paying removes the gift meta' );

// 3) Emails.
$plain  = new WC_Order();
$gifted = new WC_Order();
$gifted->update_meta_data( '_sgs_gift', 'yes' );
$gifted->update_meta_data( '_sgs_gift_to', 'Amina <b>' );
$gifted->update_meta_data( '_sgs_gift_message', "Well done\nmama" );
$shop = (object) array( 'id' => 'new_order' );
$cust = (object) array( 'id' => 'customer_processing_order' );
ok( '' === captured( static fn() => Gift_Order_Emails::print_in_email( $plain, true, false, $shop ) ), 'no gift meta: the shop email prints nothing' );
ok( '' === captured( static fn() => Gift_Order_Emails::print_in_email( $plain, false, false, $cust ) ), 'no gift meta: the buyer email prints nothing' );
$shop_html = captured( static fn() => Gift_Order_Emails::print_in_email( $gifted, true, false, $shop ) );
ok( false !== strpos( $shop_html, 'Well done<br />' ) && false !== strpos( $shop_html, 'Amina &lt;b&gt;' ), 'the shop new-order email carries the recipient and the whole note, escaped' );
$shop_other = captured( static fn() => Gift_Order_Emails::print_in_email( $gifted, true, false, (object) array( 'id' => 'failed_order' ) ) );
ok( '' === $shop_other, 'other shop emails carry no gift block' );
$buyer_html = captured( static fn() => Gift_Order_Emails::print_in_email( $gifted, false, false, $cust ) );
ok( false !== strpos( $buyer_html, 'This order is a gift for Amina &lt;b&gt;.' ) && false === strpos( $buyer_html, 'Well done' ), 'the buyer email names the recipient and never repeats the note' );
$buyer_plain = captured( static fn() => Gift_Order_Emails::print_in_email( $gifted, false, true, $cust ) );
ok( false === strpos( $buyer_plain, '<' . 'p>' ) && false === strpos( $buyer_plain, 'Well done' ), 'the plain-text buyer email has no markup and no note' );
ok( 'Thanks.' === Gift_Order_Emails::order_received_text( 'Thanks.', $plain ), 'order-received text is unchanged without gift meta' );
ok( 'Thanks.' === Gift_Order_Emails::order_received_text( 'Thanks.', null ), 'order-received text is unchanged with no order' );
ok( false !== strpos( (string) Gift_Order_Emails::order_received_text( 'Thanks.', $gifted ), 'a gift for Amina' ), 'order-received text says the order is a gift for the recipient' );

// 4) Rate hiding.
$GLOBALS['sgs_test_options']['woocommerce_free_shipping_9_settings'] = array( 'sgs_hide_rates' => array( '7' ) );
$rates = array(
	'flat_rate:7'     => new WC_Shipping_Rate( 'flat_rate', 7 ),
	'flat_rate:8'     => new WC_Shipping_Rate( 'flat_rate', 8 ),
	'free_shipping:9' => new WC_Shipping_Rate( 'free_shipping', 9 ),
);
$left = Free_Shipping_Hide_Rates::filter_rates( $rates );
ok( array( 'flat_rate:8', 'free_shipping:9' ) === array_keys( $left ), 'free shipping present: the chosen rate is hidden and the other stays' );
$no_free = $rates;
unset( $no_free['free_shipping:9'] );
ok( array_keys( $no_free ) === array_keys( Free_Shipping_Hide_Rates::filter_rates( $no_free ) ), 'free shipping absent: every rate is listed' );
$GLOBALS['sgs_test_options']['woocommerce_free_shipping_9_settings'] = array();
ok( array_keys( $rates ) === array_keys( Free_Shipping_Hide_Rates::filter_rates( $rates ) ), 'setting unset: WooCommerce behaviour, every rate listed' );
ok( 'x' === Free_Shipping_Hide_Rates::filter_rates( 'x' ), 'a non-array is returned untouched' );
$fields = Free_Shipping_Hide_Rates::add_field( array( 'title' => array() ) );
ok( 'multiselect' === $fields['sgs_hide_rates']['type'] && isset( $fields['title'] ), 'the setting is a multi-select added beside the existing fields' );

echo "\n{$passes} passed, {$failures} failed\n";
exit( $failures > 0 ? 1 : 0 );
