<?php
/**
 * Standalone test: the order Show-to rules that choose a confirmation sentence by an order fact (MERGED F-12):
 * "order-account-created" (the customer account was made with this order), "order-account-existing" (the order is on an
 * account that already existed), "order-collect" (a local pickup order) and "order-delivery" (a shipped order). Each
 * reads the order through the sgs/order binding's permission check and hides the block when the order cannot be viewed.
 * Also proves Order_Account_Created marks only an order whose customer account was made in the same checkout request.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-conditional-order-account-delivery-standalone.php
 */

// phpcs:disable
require __DIR__ . '/stubs/order-stubs.php';
require dirname( __DIR__, 2 ) . '/includes/gift-order/class-gift-order-order.php';
require dirname( __DIR__, 2 ) . '/includes/class-order-binding.php';
$has_marker = is_file( dirname( __DIR__, 2 ) . '/includes/class-order-account-created.php' );
if ( $has_marker ) {
	require dirname( __DIR__, 2 ) . '/includes/class-order-account-created.php';
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

$now = time();
// 20: an account made with this order, collected. 21: an existing account, delivered. 22: a guest order, delivered.
// 23: an order with no shipping line (nothing to collect or deliver). 24: a guest order on the classic pickup method.
sgs_t_order( array( 'id' => 20, 'key' => 'k20', 'user' => 7, 'created' => $now - 30, 'meta' => array( '_sgs_account_created' => 'yes' ), 'shipping' => array( array( 'name' => 'Collect in store', 'method_id' => 'pickup_location' ) ) ) );
sgs_t_order( array( 'id' => 21, 'key' => 'k21', 'user' => 8, 'created' => $now - 30, 'shipping' => array( array( 'name' => 'Royal Mail', 'method_id' => 'flat_rate' ) ) ) );
sgs_t_order( array( 'id' => 22, 'key' => 'k22', 'created' => $now - 30, 'shipping' => array( array( 'name' => 'Royal Mail', 'method_id' => 'flat_rate' ) ) ) );
sgs_t_order( array( 'id' => 23, 'key' => 'k23', 'user' => 8, 'created' => $now - 30 ) );
sgs_t_order( array( 'id' => 24, 'key' => 'k24', 'created' => $now - 30, 'shipping' => array( array( 'name' => 'Local pickup', 'method_id' => 'local_pickup' ) ) ) );
// 25: a delivery method whose id merely contains the word. 26: a pickup add-on's own id (local_pickup_plus).
sgs_t_order( array( 'id' => 25, 'key' => 'k25', 'created' => $now - 30, 'shipping' => array( array( 'name' => 'Courier, no pickup', 'method_id' => 'no_pickup_delivery' ) ) ) );
sgs_t_order( array( 'id' => 26, 'key' => 'k26', 'created' => $now - 30, 'shipping' => array( array( 'name' => 'Collect in store', 'method_id' => 'local_pickup_plus' ) ) ) );

$html  = '<p>x</p>';
$run   = static fn( string $rule ) => SGS\Blocks\check_conditional_visibility( $html, array( 'blockName' => 'sgs/text', 'attrs' => array( 'sgsConditionLoggedIn' => $rule ) ) );
$shows = static fn( string $rule ): bool => $html === $run( $rule );
$view  = static function ( int $id, string $key, int $user = 0 ): void {
	$GLOBALS['sgs_t']['query'] = array( 'order-received' => (string) $id );
	$GLOBALS['sgs_t']['user']  = $user;
	$_GET['key']               = $key;
};
$none_of = static fn(): bool => ! $shows( 'order-account-created' ) && ! $shows( 'order-account-existing' ) && ! $shows( 'order-collect' ) && ! $shows( 'order-delivery' );

$view( 20, 'k20', 7 );
ok( $shows( 'order-account-created' ), 'an order whose account was made with it shows the account-created block' );
ok( ! $shows( 'order-account-existing' ), 'and hides the existing-account block' );
ok( $shows( 'order-collect' ) && ! $shows( 'order-delivery' ), 'a pickup_location order shows the collect block and hides the delivery block' );
$view( 21, 'k21', 8 );
ok( ! $shows( 'order-account-created' ) && $shows( 'order-account-existing' ), 'an order on an account that already existed shows only the existing-account block' );
ok( ! $shows( 'order-collect' ) && $shows( 'order-delivery' ), 'a flat_rate order shows the delivery block and hides the collect block' );
$view( 22, 'k22' );
ok( ! $shows( 'order-account-created' ) && ! $shows( 'order-account-existing' ), 'a guest order shows neither account block' );
ok( $shows( 'order-delivery' ), 'a guest order still answers the delivery rule' );
$view( 23, 'k23', 8 );
ok( ! $shows( 'order-collect' ) && ! $shows( 'order-delivery' ), 'an order with no shipping line shows neither the collect nor the delivery block' );
$view( 24, 'k24' );
ok( $shows( 'order-collect' ), 'the classic local_pickup method is a collection too' );
$view( 25, 'k25' );
ok( ! $shows( 'order-collect' ) && $shows( 'order-delivery' ), 'a method id that only contains the word pickup (no_pickup_delivery) is a delivery' );
$view( 26, 'k26' );
ok( $shows( 'order-collect' ) && ! $shows( 'order-delivery' ), 'a pickup method id with a suffix (local_pickup_plus) is a collection' );
$view( 20, 'wrong', 7 );
ok( $none_of(), 'a wrong order key hides every new rule' );
$GLOBALS['sgs_t']['query'] = array();
ok( $none_of(), 'a page with no order hides every new rule' );
$view( 21, 'k21', 8 );
ok( $shows( 'none' ) && ! $shows( 'order-guest' ), 'the existing rules are unchanged (none shows, the guest rule hides an account order)' );

// The marker: an order is marked only when its customer is the account made earlier in the same checkout request.
if ( $has_marker ) {
	$mark = 'SGS\Blocks\Order_Account_Created';
	$new  = sgs_t_order( array( 'id' => 30, 'key' => 'k30', 'user' => 55, 'created' => $now ) );
	$old  = sgs_t_order( array( 'id' => 31, 'key' => 'k31', 'user' => 56, 'created' => $now ) );
	$gst  = sgs_t_order( array( 'id' => 32, 'key' => 'k32', 'created' => $now ) );
	$mark::reset();
	$mark::mark_store_api( $new );
	ok( '' === $new->get_meta( '_sgs_account_created' ), 'with no account made in this request the order is not marked' );
	$mark::remember( 55 );
	$mark::mark_store_api( $new );
	ok( 'yes' === $new->get_meta( '_sgs_account_created' ) && 1 === ( $new->d['saved'] ?? 0 ), 'the block checkout marks the order of the account just made, and saves it' );
	$mark::mark_classic( 31, array(), $old );
	ok( '' === $old->get_meta( '_sgs_account_created' ), 'an order on another account is not marked' );
	$mark::mark_classic( 32, array(), $gst );
	ok( '' === $gst->get_meta( '_sgs_account_created' ), 'a guest order is not marked' );
	$mark::reset();
	$mark::remember( 56 );
	$mark::mark_classic( 31, array(), $old );
	ok( 'yes' === $old->get_meta( '_sgs_account_created' ), 'the classic checkout marks the order of the account just made' );
	$mark::mark_classic( 999, array(), null );
	ok( true, 'a classic call with no order object reads the order by its id and does not fail' );
} else {
	ok( false, 'Order_Account_Created exists' );
}

echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
