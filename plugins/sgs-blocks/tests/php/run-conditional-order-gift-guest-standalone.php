<?php
/**
 * Standalone test: the order Show-to rules "order-has-gift", "order-no-gift" and "order-guest" of conditional
 * visibility. Each resolves against the order being viewed through the same permission check as the sgs/order binding
 * and hides the block when the order cannot be viewed.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-conditional-order-gift-guest-standalone.php
 */

// phpcs:disable
require __DIR__ . '/stubs/order-stubs.php';
require dirname( __DIR__, 2 ) . '/includes/gift-order/class-gift-order-order.php';
require dirname( __DIR__, 2 ) . '/includes/class-order-binding.php';
require dirname( __DIR__, 2 ) . '/includes/conditional-visibility.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

$now = time();
sgs_t_order( array( 'id' => 1, 'key' => 'k1', 'created' => $now - 30, 'meta' => array( '_sgs_gift' => 'yes', '_sgs_gift_to' => 'Aisha', '_sgs_gift_message' => 'Hi' ) ) );
sgs_t_order( array( 'id' => 2, 'key' => 'k2', 'created' => $now - 30 ) );
sgs_t_order( array( 'id' => 3, 'key' => 'k3', 'user' => 7, 'created' => $now - 30 ) );
sgs_t_order( array( 'id' => 4, 'key' => 'k4', 'created' => $now - 9000, 'meta' => array( '_sgs_gift' => 'yes' ) ) );

$html = '<p>x</p>';
$run  = static fn( string $rule ) => SGS\Blocks\check_conditional_visibility( $html, array( 'blockName' => 'core/paragraph', 'attrs' => array( 'sgsConditionLoggedIn' => $rule ) ) );
$view = static function ( int $id, string $key, int $user = 0 ): void {
	$GLOBALS['sgs_t']['query'] = array( 'order-received' => (string) $id );
	$GLOBALS['sgs_t']['user']  = $user;
	$_GET['key']               = $key;
};

$view( 1, 'k1' );
ok( $html === $run( 'order-has-gift' ), 'a gift order shows the has-gift block' );
ok( '' === $run( 'order-no-gift' ), 'a gift order hides the no-gift block' );
$view( 2, 'k2' );
ok( '' === $run( 'order-has-gift' ), 'an order with no gift hides the has-gift block' );
ok( $html === $run( 'order-no-gift' ), 'an order with no gift shows the no-gift block' );

$view( 2, 'k2' );
ok( $html === $run( 'order-guest' ), 'a guest order shows the guest block' );
$view( 3, 'k3', 7 );
ok( '' === $run( 'order-guest' ), 'an account order hides the guest block' );
ok( '' === $run( 'order-has-gift' ) && $html === $run( 'order-no-gift' ), 'an account order with no gift behaves as no gift' );

$view( 1, 'wrong' );
ok( '' === $run( 'order-has-gift' ) && '' === $run( 'order-no-gift' ) && '' === $run( 'order-guest' ), 'a wrong order key hides every order rule' );
$view( 4, 'k4' );
ok( '' === $run( 'order-has-gift' ) && '' === $run( 'order-no-gift' ) && '' === $run( 'order-guest' ), 'a guest order past the grace period, with no email check, hides every order rule' );
$GLOBALS['sgs_t']['query'] = array();
ok( '' === $run( 'order-has-gift' ) && '' === $run( 'order-no-gift' ) && '' === $run( 'order-guest' ), 'a page with no order hides every order rule' );

$view( 1, 'k1' );
ok( $html === $run( 'order-viewable' ), 'a viewable gift order shows the viewable block' );
$view( 2, 'k2' );
ok( $html === $run( 'order-viewable' ), 'a viewable guest order with no gift shows the viewable block' );
$view( 3, 'k3', 7 );
ok( $html === $run( 'order-viewable' ), 'a viewable account order shows the viewable block' );
$view( 1, 'wrong' );
ok( '' === $run( 'order-viewable' ), 'a wrong order key hides the viewable block' );
$view( 4, 'k4' );
ok( '' === $run( 'order-viewable' ), 'a guest order past the grace period with no email check hides the viewable block' );
$GLOBALS['sgs_t']['query'] = array();
ok( '' === $run( 'order-viewable' ), 'a page with no order hides the viewable block' );

// order-not-viewable: the inverse of order-viewable for an order that exists; a page with no order hides it like every order rule.
sgs_t_order( array( 'id' => 5, 'key' => 'k5', 'user' => 9, 'created' => $now - 30 ) );
$view( 1, 'wrong' );
ok( $html === $run( 'order-not-viewable' ), 'a wrong order key shows the not-viewable block' );
$view( 1, '' );
ok( $html === $run( 'order-not-viewable' ), 'a missing order key shows the not-viewable block' );
$view( 4, 'k4' );
ok( $html === $run( 'order-not-viewable' ), 'a guest who has not confirmed the order email shows the not-viewable block' );
$view( 5, 'k5', 0 );
ok( $html === $run( 'order-not-viewable' ), 'a signed-out visitor on a member order shows the not-viewable block' );
$view( 1, 'k1' );
ok( '' === $run( 'order-not-viewable' ), 'a viewable guest order hides the not-viewable block' );
$view( 3, 'k3', 7 );
ok( '' === $run( 'order-not-viewable' ), 'a viewable account order hides the not-viewable block' );
$view( 99, 'k99' );
ok( '' === $run( 'order-not-viewable' ), 'an order id that does not exist hides the not-viewable block' );
$GLOBALS['sgs_t']['query'] = array();
ok( '' === $run( 'order-not-viewable' ), 'a page with no order hides the not-viewable block' );

$view( 1, 'k1' );
ok( $html === $run( 'logged-out' ) && $html === $run( 'none' ), 'the older login rules are unchanged' );

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit( $failures > 0 ? 1 : 0 );
