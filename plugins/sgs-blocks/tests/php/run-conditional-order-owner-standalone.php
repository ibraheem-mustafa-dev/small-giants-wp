<?php
/**
 * Standalone test: the "order-owner" login rule of conditional visibility (a block shows only when the signed-in
 * viewer owns the order of the current order-confirmation page and the page's order key opens it).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-conditional-order-owner-standalone.php
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
sgs_t_order( array( 'id' => 652, 'key' => 'k652', 'created' => $now - 30 ) );
sgs_t_order( array( 'id' => 700, 'key' => 'k700', 'user' => 7, 'created' => $now - 30 ) );

$block = array( 'blockName' => 'core/paragraph', 'attrs' => array( 'sgsConditionLoggedIn' => 'order-owner' ) );
$html  = '<p>Saved in My account</p>';
$run   = static fn() => SGS\Blocks\check_conditional_visibility( $html, $block );
$view  = static function ( ?int $id, string $key, int $user ): void {
	$GLOBALS['sgs_t']['query'] = null === $id ? array() : array( 'order-received' => (string) $id );
	$GLOBALS['sgs_t']['user']  = $user;
	$_GET['key']               = $key;
};

$view( 700, 'k700', 7 );
ok( $html === $run(), 'the owner of the order sees the block' );

$view( 700, 'wrong', 7 );
ok( '' === $run(), 'the owner signed in with a wrong order key does not see it (the page cannot view the order)' );

$view( 700, '', 7 );
ok( '' === $run(), 'the owner with no order key does not see it' );

$view( 652, 'k652', 7 );
ok( '' === $run(), 'a signed-in visitor on a guest order (customer 0) does not see it' );

$view( 700, 'k700', 9 );
ok( '' === $run(), 'a signed-in visitor on someone else\'s order does not see it' );

$view( 700, 'k700', 0 );
ok( '' === $run(), 'a signed-out visitor does not see it' );

$view( null, 'k700', 7 );
ok( '' === $run(), 'with no order on the page ownership cannot be shown, so it stays hidden' );

$view( 999, 'k700', 7 );
ok( '' === $run(), 'an unknown order stays hidden' );

$plain = array( 'blockName' => 'core/paragraph', 'attrs' => array( 'sgsConditionLoggedIn' => 'logged-in' ) );
$view( 652, 'k652', 7 );
ok( $html === SGS\Blocks\check_conditional_visibility( $html, $plain ), 'the logged-in rule is unchanged' );

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit( $failures > 0 ? 1 : 0 );
