<?php
/**
 * Standalone test: the "order-owner" login rule of conditional visibility (a block shows only when the signed-in
 * viewer owns the order of the current order-confirmation page).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-conditional-order-owner-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

$GLOBALS['user']  = 0;
$GLOBALS['query'] = array();
$GLOBALS['orders'] = array( 652 => 0, 700 => 7 );

function add_filter( $t, $cb, $p = 10, $a = 1 ) {}
function add_action( $t, $cb, $p = 10, $a = 1 ) {}
function is_admin() { return false; }
function is_user_logged_in() { return $GLOBALS['user'] > 0; }
function get_current_user_id() { return $GLOBALS['user']; }
function get_query_var( $k, $d = '' ) { return $GLOBALS['query'][ $k ] ?? $d; }
function absint( $v ) { return abs( (int) $v ); }
function wc_get_order( $id ) {
	if ( ! isset( $GLOBALS['orders'][ $id ] ) ) {
		return false;
	}
	return new class( $GLOBALS['orders'][ $id ] ) {
		public function __construct( private int $customer ) {}
		public function get_customer_id() { return $this->customer; }
	};
}

require dirname( __DIR__, 2 ) . '/includes/conditional-visibility.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

$block = array( 'blockName' => 'core/paragraph', 'attrs' => array( 'sgsConditionLoggedIn' => 'order-owner' ) );
$html  = '<p>Saved in My account</p>';
$run   = static fn() => SGS\Blocks\check_conditional_visibility( $html, $block );

$GLOBALS['user']  = 7;
$GLOBALS['query'] = array( 'order-received' => '700' );
ok( $html === $run(), 'the owner of the order sees the block' );

$GLOBALS['query'] = array( 'order-received' => '652' );
ok( '' === $run(), 'a signed-in visitor on a guest order (customer 0) does not see it' );

$GLOBALS['user']  = 9;
$GLOBALS['query'] = array( 'order-received' => '700' );
ok( '' === $run(), 'a signed-in visitor on someone else\'s order does not see it' );

$GLOBALS['user']  = 0;
ok( '' === $run(), 'a signed-out visitor does not see it' );

$GLOBALS['user']  = 7;
$GLOBALS['query'] = array();
ok( '' === $run(), 'with no order on the page ownership cannot be shown, so it stays hidden' );

$GLOBALS['query'] = array( 'order-received' => '999' );
ok( '' === $run(), 'an unknown order stays hidden' );

$plain = array( 'blockName' => 'core/paragraph', 'attrs' => array( 'sgsConditionLoggedIn' => 'logged-in' ) );
$GLOBALS['query'] = array( 'order-received' => '652' );
ok( $html === SGS\Blocks\check_conditional_visibility( $html, $plain ), 'the logged-in rule is unchanged' );

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit( $failures > 0 ? 1 : 0 );
