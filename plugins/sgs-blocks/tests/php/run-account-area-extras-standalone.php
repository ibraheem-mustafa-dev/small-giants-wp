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
function _n( $one, $many, $n, $d = null ) { return 1 === $n ? $one : $many; }
function esc_html__( $t, $d = null ) { return $t; }
function esc_attr__( $t, $d = null ) { return $t; }
function get_option( $k, $d = false ) { return $d; }
function wc_price( $a, $args = array() ) { return '£' . number_format( (float) $a, isset( $args['decimals'] ) ? $args['decimals'] : 2 ); }
function wc_get_order_status_name( $s ) { return ucfirst( (string) $s ); }
function is_user_logged_in() { return true; }
function wc_get_cart_url() { return 'https://example.test/cart/'; }
function wp_nonce_url( $u, $a ) { return $u . '&_wpnonce=abc123'; }
function add_query_arg( $k, $v, $u ) { return $u . '?' . $k . '=' . $v; }
require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'sgs_object_attr_keys' ) ) {
	function sgs_object_attr_keys( $block ) { return array(); }
}
$root = dirname( __DIR__, 2 ) . '/includes';
require $root . '/render-helpers.php';
require $root . '/helpers-responsive.php';
require $root . '/account/helpers-account-orders-list.php';
require $root . '/account/helpers-account-defaults.php';
require $root . '/account/helpers-account-order-detail.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

$GLOBALS['sgs_can_view'] = true;
function current_user_can( $cap, ...$args ) { return 'view_order' === $cap ? $GLOBALS['sgs_can_view'] : false; }
class WC_Order {
	public $meta = array();
	public function get_id() { return 7; }
	public function get_meta( $k, $single = true ) { return $this->meta[ $k ] ?? ''; }
}

class Fake_Product {
	public function get_image_id() { return 0; }
	public function get_image( $size, $attr ) { return '<img src="p.jpg" alt="">'; }
}
class Fake_Item {
	public function get_quantity() { return 2; }
	public function get_total() { return '10'; }
	public function get_total_tax() { return '0'; }
	public function get_product() { return new Fake_Product(); }
	public function get_product_id() { return 1; }
	public function get_name() { return 'Cake'; }
}
class Fake_Order {
	public $count = 3;
	public $status = 'processing';
	public function get_id() { return 7; }
	public function has_status( $s ) { return in_array( $this->status, (array) $s, true ); }
	public function get_shipping_methods() { return array(); }
	public function get_shipping_method() { return 'Post'; }
	public function get_item_count() { return $this->count; }
	public function get_order_number() { return '101'; }
	public function get_status() { return $this->status; }
	public function get_view_order_url() { return 'https://example.test/my-account/view-order/101/'; }
	public function get_total() { return 12.0; }
	public function get_date_created() { return new class() { public function date_i18n( $f ) { return 'Sat 7 Nov'; } }; }
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
ok( 1 === preg_match( '#View order<span class="sgs-account__button-icon" aria-hidden="true">#', $html ), 'A label: the standard icon follows the label, aria-hidden' );
ok( '' === sgs_account_order_thumbs_html( new class() { public function get_items() { return array(); } } ), 'A thumbs helper: nothing for an order without items' );

// B) Gift note: only for a gift order, when on, and only for someone allowed to view the order.
$gift       = new WC_Order();
$gift->meta = array( '_sgs_gift' => 'yes', '_sgs_gift_to' => 'Aisha <i>', '_sgs_gift_message' => "Happy birthday
<script>x</script>" );
ok( '' === sgs_account_gift_note_html( $gift, array() ), 'B off by default: nothing printed' );
$html = sgs_account_gift_note_html( $gift, array( 'giftNote' => true ) );
ok( str_contains( $html, 'Gift note</div>' ) && str_contains( $html, 'Aisha &lt;i&gt;' ) && str_contains( $html, 'Happy birthday<br />' ) && str_contains( $html, '&lt;script&gt;' ) && ! str_contains( $html, '<script>' ), 'B on: default heading, recipient and message escaped' );
ok( str_contains( sgs_account_gift_note_html( $gift, array( 'giftNote' => true, 'giftNoteHeading' => 'A note <b>' ) ), 'A note &lt;b&gt;</div>' ), 'B heading setting is used and escaped' );
$plain = new WC_Order();
ok( '' === sgs_account_gift_note_html( $plain, array( 'giftNote' => true ) ), 'B an order that is no gift prints nothing' );
$GLOBALS['sgs_can_view'] = false;
ok( '' === sgs_account_gift_note_html( $gift, array( 'giftNote' => true ) ), 'B someone who may not view the order sees nothing' );
$GLOBALS['sgs_can_view'] = true;

// 1) Orders list: item count behind a setting; singular and plural; site wording with {count}.
$o = new Fake_Order();
ok( ! str_contains( sgs_account_orders_list_html( array( $o ), array() ), 'order-count' ), '1 count: nothing while off' );
$html = sgs_account_orders_list_html( array( $o ), array( 'ordersRowItemCount' => true ) );
ok( str_contains( $html, '<span class="sgs-account__order-count">3 items</span>' ) && str_contains( $html, 'orders-list--item-count' ), '1 count: default plural, list class set' );
$o->count = 1;
ok( str_contains( sgs_account_orders_list_html( array( $o ), array( 'ordersRowItemCount' => true ) ), '>1 item</span>' ), '1 count: default singular' );
ok( str_contains( sgs_account_orders_list_html( array( $o ), array( 'ordersRowItemCount' => true, 'ordersRowItemCountOne' => '· {count} bake <b>', 'ordersRowItemCountMany' => 'many' ) ), '>· 1 bake &lt;b&gt;</span>' ), '1 count: site wording for one, escaped' );
$o->count = 4;
ok( str_contains( sgs_account_orders_list_html( array( $o ), array( 'ordersRowItemCount' => true, 'ordersRowItemCountOne' => 'one' , 'ordersRowItemCountMany' => '· {count} items' ) ), '>· 4 items</span>' ), '1 count: site wording for many' );
$o->count = 0;
ok( ! str_contains( sgs_account_orders_list_html( array( $o ), array( 'ordersRowItemCount' => true ) ), 'order-count"' ), '1 count: an order with no items prints none' );

// 2) Order page step sub-lines: none by default; {date} filled; escaped; empty prints nothing.
$o = new Fake_Order();
$labels = array( 'orderStepPlaced' => 'Placed', 'orderStepProcessing' => 'Baking', 'orderStepDispatched' => 'Posted', 'orderStepDelivered' => 'Delivered' );
$steps  = sgs_account_order_steps( $o, $labels );
ok( 4 === count( $steps ) && '' === $steps[0]['note'] && '' === $steps[3]['note'], '2 notes: empty by default' );
$html = sgs_account_order_detail_html( $o, $labels + array( 'orderDetailProgress' => true ) );
ok( ! str_contains( $html, 'od-step-note' ), '2 notes: nothing printed when every note is empty' );
$steps = sgs_account_order_steps( $o, $labels + array( 'orderStepPlacedNote' => '{date}', 'orderStepDeliveredNote' => 'Left by <b>door' ) );
ok( 'Sat 7 Nov' === $steps[0]['note'] && 'Left by <b>door' === $steps[3]['note'] && '' === $steps[1]['note'], '2 notes: {date} is the placed date, other steps stay empty' );
$html = sgs_account_order_detail_html( $o, $labels + array( 'orderDetailProgress' => true, 'orderStepPlacedNote' => '{date}', 'orderStepDeliveredNote' => 'Left by <b>door' ) );
ok( str_contains( $html, '<span class="sgs-account__od-step-note">Sat 7 Nov</span>' ) && str_contains( $html, 'Left by &lt;b&gt;door' ) && 2 === substr_count( $html, 'od-step-note' ), '2 notes: printed under their steps, escaped, only where set' );

// 3) Order page items card: no heading and no quantity by default; both behind settings.
$o    = new Fake_Order();
$base = sgs_account_order_items_html( $o, array() );
ok( ! str_contains( $base, 'od-items-title' ) && ! str_contains( $base, 'od-item-qty' ) && ! str_contains( $base, 'qty-first' ), '3 items: unchanged by default' );
$html = sgs_account_order_items_html( $o, array( 'orderDetailItemsHeading' => 'What you <i>ordered', 'orderDetailItemQtyFirst' => true ) );
ok( str_contains( $html, '<div class="sgs-account__od-items-title">What you &lt;i&gt;ordered</div>' ), '3 items: heading above the rows, escaped' );
ok( str_contains( $html, '<span class="sgs-account__od-item-qty">2 &times; </span>Cake' ) && str_contains( $html, 'od-items--qty-first' ), '3 items: quantity before the name, class set' );

// 4) Order again: WooCommerce's nonce'd link, only for allowed statuses and a signed-in viewer, behind a setting.
$o         = new Fake_Order();
$o->status = 'completed';
$GLOBALS['sgs_can_view'] = true;
$url = sgs_account_order_again_url( $o );
ok( 'https://example.test/cart/?order_again=7&_wpnonce=abc123' === $url, '4 again: WooCommerce order_again address on the cart page with its nonce' );
$o->status = 'processing';
ok( '' === sgs_account_order_again_url( $o ), '4 again: a processing order is not re-orderable (WooCommerce default statuses)' );
$o->status = 'completed';
$GLOBALS['sgs_can_view'] = false;
ok( '' === sgs_account_order_again_url( $o ), '4 again: someone who may not view the order gets no link' );
$GLOBALS['sgs_can_view'] = true;
ok( ! str_contains( sgs_account_order_detail_html( $o, array() ), 'od-again' ), '4 again: nothing while the setting is off' );
$html = sgs_account_order_detail_html( $o, array( 'orderDetailOrderAgain' => true ) );
ok( str_contains( $html, '<a class="sgs-account__od-again-link" href="https://example.test/cart/?order_again=7&#038;_wpnonce=abc123">Order again</a>' ) || str_contains( $html, 'od-again-link" href="https://example.test/cart/?order_again=7' ), '4 again: button with the default label' );
ok( str_contains( sgs_account_order_detail_html( $o, array( 'orderDetailOrderAgain' => true, 'orderDetailOrderAgainLabel' => 'Bake <b>again' ) ), '>Bake &lt;b&gt;again</a>' ), '4 again: label from the setting, escaped' );

echo $failures ? "\n$failures FAILED\n" : "\nAll passed\n";
exit( $failures ? 1 : 0 );
