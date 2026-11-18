<?php
/**
 * Standalone test: sgs/account's status pill wording (`orderStatusLabels`) and the order-again status setting
 * (`orderDetailOrderAgainWhen`) (includes/account/helpers-account-orders-list.php::sgs_account_order_status_name,
 * includes/account/class-account-extras.php::order_again_statuses).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-order-wording-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
$GLOBALS['hooks'] = array();
function add_filter( $tag, $cb, $prio = 10, $args = 1 ) { $GLOBALS['hooks'][ $tag ][] = array( $cb, $prio ); }
function add_action( $tag, $cb, $prio = 10, $args = 1 ) { add_filter( $tag, $cb, $prio ); }
function __( $t, $d = null ) { return $t; }
function wc_get_order_status_name( $s ) { return array( 'processing' => 'Processing', 'completed' => 'Completed', 'on-hold' => 'On hold' )[ $s ] ?? ucfirst( $s ); }
function wc_get_page_id( $p ) { return 103; }
function get_post( $id ) { return (object) array( 'post_content' => $GLOBALS['page_content'] ?? '', 'post_type' => 'page', 'post_status' => 'publish' ); }
function parse_blocks( $c ) { return $GLOBALS['page_blocks'] ?? array(); }
function is_post_publicly_viewable( $p ) { return true; }
function home_url( $p = '' ) { return 'https://example.test' . $p; }
function wp_parse_url( $u, $c = -1 ) { return parse_url( $u, $c ); }
function esc_html( $t ) { return htmlspecialchars( (string) $t ); }
function esc_attr( $t ) { return htmlspecialchars( (string) $t ); }
require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'sgs_object_attr_keys' ) ) { function sgs_object_attr_keys( $block ) { return array(); } }

$root = dirname( __DIR__, 2 ) . '/includes';
require $root . '/helpers-link-source.php';
require $root . '/account/class-account-strings.php';
require $root . '/account/class-account-endpoints.php';
require $root . '/account/class-account-extras.php';
require $root . '/account/class-account-redirect.php';
require $root . '/account/helpers-account-orders-list.php';

use SGS\Blocks\Account_Endpoints as EP;
use SGS\Blocks\Account_Extras as EX;

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

// Status pill wording.
ok( 'Processing' === sgs_account_order_status_name( 'processing', array() ), 'no setting: WooCommerce\'s own name' );
ok( 'Processing' === sgs_account_order_status_name( 'processing', array( 'orderStatusLabels' => array( 'processing' => '  ' ) ) ), 'an empty value falls back to WooCommerce\'s name' );
ok( 'Baking now' === sgs_account_order_status_name( 'processing', array( 'orderStatusLabels' => array( 'processing' => 'Baking now' ) ) ), 'the client\'s wording replaces it' );
ok( 'Baking now' === sgs_account_order_status_name( 'wc-processing', array( 'orderStatusLabels' => array( 'processing' => 'Baking now' ) ) ), 'a wc- prefixed slug maps to the same key' );
ok( 'Completed' === sgs_account_order_status_name( 'completed', array( 'orderStatusLabels' => array( 'processing' => 'Baking now' ) ) ), 'other statuses keep WooCommerce\'s name' );
ok( 'On the way' === sgs_account_order_status_name( 'on-hold', array( 'orderStatusLabels' => array( 'on-hold' => 'On the way' ) ) ), 'a hyphenated slug (on-hold) works' );
ok( 'Processing' === sgs_account_order_status_name( 'processing', array( 'orderStatusLabels' => 'bad' ) ), 'a malformed setting is ignored' );
$wrapped = esc_html( sgs_account_order_status_name( 'processing', array( 'orderStatusLabels' => array( 'processing' => '<b>x</b>' ) ) ) );
ok( ! str_contains( $wrapped, '<b>' ), 'the callers escape the wording on output' );

// Order again statuses.
ok( array( 'completed' ) === EX::order_again_statuses_for( 'completed', array( 'completed' ) ), 'completed (default): the list is unchanged' );
ok( array( 'completed' ) === EX::order_again_statuses_for( '', array( 'completed' ) ), 'unset: the list is unchanged' );
ok( array( 'completed', 'processing' ) === EX::order_again_statuses_for( 'paid', array( 'completed' ) ), 'paid: a processing order is added' );
ok( array( 'processing', 'completed' ) === EX::order_again_statuses_for( 'paid', array( 'processing', 'completed' ) ), 'paid: no duplicate when WooCommerce or a site already allows it' );

EX::register();
ok( ! empty( $GLOBALS['hooks']['woocommerce_valid_order_statuses_for_order_again'] ), 'the filter is registered' );
EP::$active = array( 'orderDetailOrderAgainWhen' => 'paid' );
ok( array( 'completed', 'processing' ) === EX::order_again_statuses( array( 'completed' ) ), 'while the block renders, its own setting applies' );
EP::$active = null;
$GLOBALS['page_content'] = '<!-- wp:sgs/account -->';
$GLOBALS['page_blocks']  = array( array( 'blockName' => 'sgs/account', 'attrs' => array( 'orderDetailOrderAgainWhen' => 'paid' ), 'innerBlocks' => array() ) );
ok( array( 'completed', 'processing' ) === EX::order_again_statuses( array( 'completed' ) ), 'on another page (the cart click), the saved My account page\'s setting applies' );
ok( 'x' === EX::order_again_statuses( 'x' ), 'a non-list value passes through' );

echo $failures ? "\n{$failures} FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
