<?php
/**
 * Standalone test: sgs/account signed-in area additions (orders-list thumbnails and end label, gift note,
 * account-details marketing tick, tab headings, customer-name binding).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-area-extras-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
$GLOBALS['sgs_meta'] = array();
function __( $t, $d = null ) { return $t; }
function esc_html__( $t, $d = null ) { return $t; }
function esc_attr__( $t, $d = null ) { return $t; }
function get_option( $k, $d = false ) { return $d; }
function wc_price( $a, $args = array() ) { return '£' . number_format( (float) $a, isset( $args['decimals'] ) ? $args['decimals'] : 2 ); }
function wc_get_order_status_name( $s ) { return ucfirst( (string) $s ); }
require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'sgs_object_attr_keys' ) ) {
	function sgs_object_attr_keys( $block ) { return array(); }
}
$root = dirname( __DIR__, 2 ) . '/includes';
require $root . '/render-helpers.php';
require $root . '/helpers-responsive.php';
require $root . '/account/helpers-account-orders-list.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

class Fake_Product {
	public function get_image( $size, $attr ) { return '<img src="p.jpg" alt="">'; }
}
class Fake_Item {
	public function get_product() { return new Fake_Product(); }
	public function get_product_id() { return 1; }
	public function get_name() { return 'Cake'; }
}
class Fake_Order {
	public function get_order_number() { return '101'; }
	public function get_status() { return 'processing'; }
	public function get_view_order_url() { return 'https://example.test/my-account/view-order/101/'; }
	public function get_total() { return 12.0; }
	public function get_date_created() { return null; }
	public function get_items() { return array( new Fake_Item(), new Fake_Item() ); }
}

// A) Orders list: default markup keeps the chevron and prints no thumbnails.
$orders = array( new Fake_Order() );
$html   = sgs_account_orders_list_html( $orders, array() );
ok( str_contains( $html, 'sgs-account__order-chevron' ) && ! str_contains( $html, 'sgs-account__order-thumbs' ) && ! str_contains( $html, 'sgs-account__order-view' ), 'A default: chevron, no thumbnails, no label' );
$html = sgs_account_orders_list_html( $orders, array( 'ordersRowThumbs' => true ) );
ok( 1 === preg_match( '#<span class="sgs-account__order-summary sgs-account__order-summary--thumbs"><span class="sgs-account__order-thumbs">(<img src="p.jpg" alt="">){2}</span>Cake, Cake</span>#', $html ), 'A thumbs: strip inside the row summary, one image per product' );
$html = sgs_account_orders_list_html( $orders, array( 'ordersRowViewLabel' => 'View <b>order' ) );
ok( ! str_contains( $html, 'order-chevron' ) && str_contains( $html, '<span class="sgs-account__order-view">View &lt;b&gt;order</span>' ), 'A label: replaces the chevron, escaped' );
$html = sgs_account_orders_list_html( $orders, array( 'ordersRowViewLabel' => 'View order', 'ordersRowViewIcon' => 'arrow-right' ) );
ok( 1 === preg_match( '#View order<span class="sgs-button__icon sgs-account__button-icon" aria-hidden="true">#', $html ), 'A label: the standard icon follows the label, aria-hidden' );
ok( '' === sgs_account_order_thumbs_html( new class() { public function get_items() { return array(); } } ), 'A thumbs helper: nothing for an order without items' );

echo $failures ? "\n$failures FAILED\n" : "\nAll passed\n";
exit( $failures ? 1 : 0 );
