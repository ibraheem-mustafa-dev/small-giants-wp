<?php
/**
 * Standalone test: the account order detail (progress, item rows, boxes, WhatsApp card, back link) and the orders list
 * summary column are each switched on by their own setting and off by default.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-order-detail-standalone.php [path to a plugin copy]
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = rtrim( $argv[1] ?? dirname( __DIR__, 2 ), '/\\' );
define( 'ABSPATH', $base . '/' );
define( 'SGS_BLOCKS_PATH', ABSPATH );

function is_user_logged_in() { return true; }
require $base . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'esc_url' ) ) { function esc_url( $u ) { return (string) $u; } }
if ( ! function_exists( 'esc_attr' ) ) { function esc_attr( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES ); } }
if ( ! function_exists( 'wp_strip_all_tags' ) ) { function wp_strip_all_tags( $t ) { return trim( strip_tags( (string) $t ) ); } }
if ( ! function_exists( 'get_option' ) ) { function get_option( $k, $d = false ) { return 'j F Y'; } }
if ( ! function_exists( 'wc_get_order_status_name' ) ) { function wc_get_order_status_name( $s ) { return ucfirst( $s ); } }
if ( ! function_exists( 'wc_get_endpoint_url' ) ) { function wc_get_endpoint_url( $e, $v = '', $p = '' ) { return $p . $e . '/'; } }
if ( ! function_exists( 'wc_get_page_permalink' ) ) { function wc_get_page_permalink( $p ) { return 'https://example.test/' . $p . '/'; } }
if ( ! function_exists( 'wp_get_attachment_image_url' ) ) { function wp_get_attachment_image_url( $id, $s = '' ) { return 'https://example.test/p' . $id . '.jpg'; } }
if ( ! function_exists( 'wp_get_post_terms' ) ) { function wp_get_post_terms( $id, $t, $a = array() ) { return array( 'Ray-Ban' ); } }
if ( ! function_exists( 'wc_display_item_meta' ) ) { function wc_display_item_meta( $item, $a = array() ) { return 'Tinted to match'; } }
if ( ! function_exists( 'add_filter' ) ) { function add_filter() {} }
if ( ! function_exists( 'add_action' ) ) { function add_action() {} }
if ( ! function_exists( 'remove_filter' ) ) { function remove_filter() {} }

if ( ! function_exists( 'wc_price' ) ) { function wc_price( $a, $args = array() ) { return '<span>£' . number_format( (float) $a, $args['decimals'] ?? 2 ) . '</span>'; } }
if ( ! function_exists( 'wc_get_product' ) ) { function wc_get_product( $id ) { return new Fake_Parent(); } }
class Fake_Parent { function get_image_id() { $GLOBALS['parent_photo_read'] = true; return 7; } }
class Fake_Product { function get_image_id() { return 0; } function get_id() { return 5; } }
class Fake_Item { function get_name() { return 'Original Wayfarer'; } function get_product() { return new Fake_Product(); } function get_product_id() { return 4; } function get_total() { return 248; } function get_total_tax() { return 0; } }
class Fake_Method { function __construct( private string $id ) {} function get_method_id() { return $this->id; } }
class Fake_Date { function date_i18n( $f ) { return '2 October 2026'; } }
class Fake_Order {
	function __construct( public string $status = 'processing', public string $method = 'flat_rate' ) {}
	function get_status() { return $this->status; }
	function get_order_number() { return 'EC-1700'; }
	function get_date_created() { return new Fake_Date(); }
	function get_shipping_method() { return 'pickup_location' === $this->method ? 'Local pickup' : 'Royal Mail'; }
	function get_shipping_methods() { return array( new Fake_Method( $this->method ) ); }
	function get_items() { return array( new Fake_Item() ); }
	function get_formatted_line_subtotal( $i ) { return '£248'; }
	function get_formatted_shipping_address( $e = '' ) { return 'Aisha Khan<br/>14 Larch Grove'; }
	function get_payment_method_title() { return 'Card'; }
	function get_subtotal_to_display() { return '£248'; }
	function get_shipping_to_display() { return 'Free'; }
	function get_formatted_order_total() { return '£248'; }
	function get_subtotal() { return 248; }
	function get_shipping_total() { return 0; }
	function get_shipping_tax() { return 0; }
	function get_total() { return 248; }
	function get_view_order_url() { return 'https://example.test/view-order/1700/'; }
}

require_once $base . '/includes/account/helpers-account-defaults.php';
require_once $base . '/includes/account/helpers-account-signed-out.php';
require_once $base . '/includes/account/class-account-strings.php';
require_once $base . '/includes/account/class-account-endpoints.php';
require_once $base . '/includes/account/class-account-extras.php';
if ( is_file( $base . '/includes/account/helpers-account-order-detail.php' ) ) {
	require_once $base . '/includes/account/helpers-account-order-detail.php';
}

$failures = 0;
function ok( bool $c, string $label ): void {
	global $failures;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) {
		++$failures;
	}
}

$all  = array(
	'orderDetailLook'           => true,
	'orderDetailBackLabel'      => 'All orders',
	'orderDetailPlacedText'     => 'Placed {date} · {method}',
	'orderDetailProgress'       => true,
	'orderStepPlaced'           => 'Order placed',
	'orderStepDispatched'       => 'Posted',
	'orderStepDelivered'        => 'Delivered',
	'orderStepReady'            => 'Ready to collect',
	'orderStepCollected'        => 'Collected',
	'orderDetailItems'          => true,
	'orderDetailBoxes'          => true,
	'orderDetailWhatsApp'       => true,
	'orderDetailWhatsAppNumber' => '+44 7960 597847',
	'orderDetailWhatsAppTitle'  => 'Questions about this order?',
	'orderDetailWhatsAppText'   => 'Message me with {order}.',
);
$has  = function_exists( 'sgs_account_order_detail_html' );
$html = $has ? sgs_account_order_detail_html( new Fake_Order(), $all ) : '';
ok( false !== strpos( $html, 'sgs-account__od-back' ) && false !== strpos( $html, '>All orders<' ), 'the back link prints with its label' );
ok( false !== strpos( $html, 'Placed 2 October 2026 · Royal Mail' ) && false !== strpos( $html, '#EC-1700' ), 'the heading and the placed line fill their tokens' );
ok( 3 === preg_match_all( '/<li class="sgs-account__od-step/', $html ), 'a step with no label is left out (three steps from three labels)' );
ok( false !== strpos( $html, 'aria-current="step"' ), 'the current step is marked' );
ok( false !== strpos( $html, 'sgs-account__od-item-brand">Ray-Ban' ) && false !== strpos( $html, 'Tinted to match' ) && false !== strpos( $html, '£248' ), 'the item row carries brand, name, options and total' );
ok( 3 === substr_count( $html, 'sgs-account__od-box-title' ), 'three boxes: address, payment, total' );
ok( false !== strpos( $html, 'href="https://wa.me/447960597847"' ) && false !== strpos( $html, 'Message me with EC-1700.' ), 'the WhatsApp card links to the number and quotes the order' );
ok( 1 === preg_match( '#<span class="sgs-account__od-chat-icon" aria-hidden="true"><svg class="sgs-account__od-chat-glyph"[^>]*width="19" height="19"#', $html ), 'the WhatsApp card icon is the WhatsApp glyph from the brand registry at 19px, drawn in the markup' );
ok( 2 === substr_count( $html, 'class="sgs-account__od-box sgs-account__od-box--text"' ), 'the address and payment boxes are plain text boxes (block flow), the total box keeps its row layout' );
$pick = $has ? sgs_account_order_steps( new Fake_Order( 'completed', 'pickup_location' ), $all ) : array();
ok( array() !== $pick && 'Collected' === end( $pick )['label'], 'a pickup order uses the pickup labels for the last step' );
ok( $has && array() === sgs_account_order_steps( new Fake_Order( 'cancelled' ), $all ), 'a cancelled order has no track' );
$off = $has ? sgs_account_order_detail_html( new Fake_Order(), array( 'orderDetailLook' => true ) ) : 'x od-steps';
ok( false === strpos( $off, 'od-steps' ) && false === strpos( $off, 'od-items' ) && false === strpos( $off, 'od-boxes' ) && false === strpos( $off, 'od-chat' ) && false === strpos( $off, 'od-back' ), 'each part is off until its own setting is on' );

SGS\Blocks\Account_Endpoints::$active = array();
$swap = method_exists( 'SGS\Blocks\Account_Extras', 'maybe_swap_view_order_template' );
ok( $swap && '/wc/view-order.php' === SGS\Blocks\Account_Extras::maybe_swap_view_order_template( '/wc/view-order.php', 'myaccount/view-order.php' ), 'with the master setting off WooCommerce keeps its order page' );
SGS\Blocks\Account_Endpoints::$active = array( 'orderDetailLook' => true );
ok( $swap && str_ends_with( (string) SGS\Blocks\Account_Extras::maybe_swap_view_order_template( '/wc/view-order.php', 'myaccount/view-order.php' ), 'templates/order-detail.php' ), 'with it on the block order detail replaces the page' );

$col = method_exists( 'SGS\Blocks\Account_Extras', 'add_summary_column' );
SGS\Blocks\Account_Endpoints::$active = array( 'ordersSummary' => true );
ok( $col && isset( SGS\Blocks\Account_Extras::add_summary_column( array( 'order-number' => 'Order', 'order-date' => 'Date' ) )['order-summary'] ), 'the summary column is added while ordersSummary is on' );
SGS\Blocks\Account_Endpoints::$active = array();
ok( $col && ! isset( SGS\Blocks\Account_Extras::add_summary_column( array( 'order-date' => 'Date' ) )['order-summary'] ), 'and left out while it is off' );
ob_start();
if ( method_exists( 'SGS\Blocks\Account_Extras', 'summary_cell' ) ) {
	SGS\Blocks\Account_Extras::summary_cell( new Fake_Order() );
}
ok( 'Original Wayfarer' === ob_get_clean(), 'the summary cell names the products' );

$all2 = $all + array( 'ordersNumberPrefix' => 'N-', 'ordersTrimZeros' => true, 'orderDetailShippingLabel' => 'Delivery', 'orderDetailShippingFreeText' => 'Free' );
$h2   = sgs_account_order_detail_html( new Fake_Order(), $all2 );
ok( false !== strpos( $h2, '#N-EC-1700' ), 'the heading carries the block\'s order number prefix' );
ok( ! empty( $GLOBALS['parent_photo_read'] ), 'a variation with no photo reads the parent product photo' );
ok( false !== strpos( $h2, '<span>Delivery</span><span>Free</span>' ), 'the shipping row takes the block label and free text' );
ok( false !== strpos( $h2, '<span>£248</span>' ) && false === strpos( $h2, '£248.00' ), 'whole amounts print without pence when ordersTrimZeros is on' );
ok( false !== strpos( sgs_account_order_detail_html( new Fake_Order(), $all ), '£248.00' ), 'and keep two decimals when it is off' );
SGS\Blocks\Account_Endpoints::$active = array( 'ordersRowList' => true );
$args = array( 'has_orders' => true );
ok( str_ends_with( (string) SGS\Blocks\Account_Extras::maybe_swap_orders_template( '/wc/orders.php', 'myaccount/orders.php', $args ), 'templates/orders-list.php' ), 'with ordersRowList on and orders present the row list replaces the WooCommerce table' );
SGS\Blocks\Account_Endpoints::$active = array();
ok( '/wc/orders.php' === SGS\Blocks\Account_Extras::maybe_swap_orders_template( '/wc/orders.php', 'myaccount/orders.php', $args ), 'with it off WooCommerce keeps its table' );
$rows = sgs_account_orders_list_html( array( new Fake_Order() ), array( 'ordersNumberPrefix' => 'N-', 'ordersDateFormat' => 'j F Y', 'ordersTrimZeros' => true ) );
ok( false !== strpos( $rows, '<a class="sgs-account__order sgs-account__order--status-processing" href="https://example.test/view-order/1700/">' ), 'each order is one link row to the order' );
ok( false !== strpos( $rows, 'sgs-account__order-number">N-EC-1700<' ) && false !== strpos( $rows, 'Ray-Ban Original Wayfarer' ) && false !== strpos( $rows, 'Processing' ) && false !== strpos( $rows, '<span>£248</span>' ) && false !== strpos( $rows, 'sgs-account__order-chevron' ), 'the row carries the prefixed id, brand and name, status pill, whole-pound total and chevron' );
echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
