<?php
/**
 * Standalone test: the sgs/order block binding's keys, each permission-checked against the order being viewed.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-order-binding-standalone.php
 */

// phpcs:disable
require __DIR__ . '/stubs/order-stubs.php';
require dirname( __DIR__, 2 ) . '/includes/gift-order/class-gift-order-order.php';
require dirname( __DIR__, 2 ) . '/includes/class-order-binding.php';

use SGS\Blocks\Order_Binding;

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}
$get = static fn( string $key, array $extra = array() ) => Order_Binding::get_value( array( 'key' => $key ) + $extra );

$base = array(
	'id'         => 726,
	'key'        => 'wc_order_abc',
	'number'     => '726',
	'email'      => 'shopper@example.com',
	'ship'       => 'Royal Mail Tracked 48, Courier',
	'total_html' => '<span class="amount"><bdi><span>&pound;</span>31.50</bdi></span>',
	'created'    => time() - 60,
	'count'      => 3,
	'meta'       => array( '_sgs_gift' => 'yes', '_sgs_gift_to' => 'Aisha <b>&</b>', '_sgs_gift_message' => 'Happy birthday' ),
);
sgs_t_order( $base );
sgs_t_order( array( 'id' => 727, 'key' => 'wc_order_def', 'user' => 7, 'created' => time() - 5000, 'email' => 'owner@example.com' ) );
sgs_t_order( array( 'id' => 728, 'key' => 'wc_order_ghi', 'created' => time() - 5000, 'email' => 'old@example.com' ) );
$GLOBALS['sgs_t']['query'] = array( 'order-received' => '726' );
$_GET['key'] = 'wc_order_abc';

ok( 'shopper@example.com' === $get( 'email' ), 'email is the billing email' );
ok( 'Royal Mail Tracked 48, Courier' === $get( 'delivery_method' ), 'delivery_method is the shipping method title(s)' );
ok( "\u{a3}31.50" === $get( 'total' ), 'total is the formatted order total as plain text' );
ok( '3' === $get( 'item_count' ), 'item_count counts the items bought' );
ok( 'Happy birthday' === $get( 'gift_message' ), 'gift_message is the saved note' );
ok( 'Aisha &' === $get( 'gift_to' ), 'gift_to is plain text' );
ok( '' !== $get( 'date' ) && 1 === preg_match( '/^\d{1,2} \w+ \d{4}$/', $get( 'date' ) ), 'date is a formatted date' );
ok( '' === $get( 'view_url' ), 'view_url is empty for a guest order' );
ok( '726' === $get( 'number' ), 'number still works' );
ok( 'Thank you shopper@example.com' === $get( 'email', array( 'format' => 'Thank you %s' ) ), 'the format arg wraps any key' );

sgs_t_order( array( 'id' => 726, 'key' => 'wc_order_abc', 'email' => '', 'meta' => array(), 'created' => time() - 60 ) );
ok( '' === $get( 'email' ) && '' === $get( 'gift_to' ) && '' === $get( 'gift_message' ) && '' === $get( 'delivery_method' ), 'absent values resolve to an empty string' );
ok( '' === $get( 'email', array( 'format' => 'Sent to %s' ) ), 'an absent value drops its format text too' );
sgs_t_order( $base );

$_GET['key'] = 'wrong';
ok( null === $get( 'email' ) && null === $get( 'total' ), 'a wrong order key resolves to null for every key' );
$_GET['key'] = 'wc_order_def';
$GLOBALS['sgs_t']['query'] = array( 'order-received' => '727' );
$GLOBALS['sgs_t']['user']  = 9;
ok( null === $get( 'email' ), 'another customer cannot read a customer order' );
$GLOBALS['sgs_t']['user']  = 7;
ok( 'owner@example.com' === $get( 'email' ), 'the owner can' );
ok( 'https://shop.test/my-account/view-order/727/' === $get( 'view_url' ), 'view_url is the account link for the owner' );
$_GET['key'] = 'wc_order_ghi';
$GLOBALS['sgs_t']['query'] = array( 'order-received' => '728' );
$GLOBALS['sgs_t']['user']  = 0;
ok( null === $get( 'email' ), 'a guest order past the grace period needs email verification' );
$GLOBALS['sgs_t']['user']  = 7;
ok( null === $get( 'email' ), 'a signed-in stranger cannot read a guest order past the grace period either' );
ok( null === $get( 'nonsense' ), 'an unknown key resolves to null' );

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit( $failures > 0 ? 1 : 0 );
