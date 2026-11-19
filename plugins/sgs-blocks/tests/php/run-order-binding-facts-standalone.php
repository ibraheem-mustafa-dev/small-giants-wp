<?php
/**
 * Standalone test: the sgs/order binding's site-supplied facts (`fact:<name>`, resolved through the `sgs_order_fact` filter).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-order-binding-facts-standalone.php
 *
 * The stubs' apply_filters() runs the callbacks listed in `$GLOBALS['sgs_t']['filters'][ <hook> ]`.
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

$calls = array();
$facts = array( 'bake_date' => 'Mon 23 Nov', 'bake_arrive' => 'Wed 25 Nov' );
$GLOBALS['sgs_t']['filters']['sgs_order_fact'][] = static function ( $value, $name = '', $order = null ) use ( &$calls, &$facts ) {
	$calls[] = array( $name, $order instanceof WC_Order ? $order->get_id() : null );
	return $facts[ $name ] ?? $value;
};
$no_filter = static function ( callable $run ) {
	$saved = $GLOBALS['sgs_t']['filters'] ?? array();
	unset( $GLOBALS['sgs_t']['filters']['sgs_order_fact'] );
	$out = $run();
	$GLOBALS['sgs_t']['filters'] = $saved;
	return $out;
};

sgs_t_order( array(
	'id'      => 726,
	'key'     => 'wc_order_abc',
	'number'  => '726',
	'email'   => 'shopper@example.com',
	'created' => time() - 60,
	'meta'    => array( '_sgs_gift' => 'yes', '_sgs_gift_to' => 'Aisha', '_sgs_gift_message' => '{fact:bake_date}' ),
) );
sgs_t_order( array( 'id' => 727, 'key' => 'wc_order_def', 'user' => 7, 'created' => time() - 5000, 'email' => 'owner@example.com' ) );
$GLOBALS['sgs_t']['query'] = array( 'order-received' => '726' );
$_GET['key']               = 'wc_order_abc';

// A fact the site supplies resolves, and the filter is handed the fact's name and the order.
ok( 'Mon 23 Nov' === $get( 'fact:bake_date' ), 'a site-supplied fact is the filter\'s answer' );
ok( array( 'bake_date', 726 ) === end( $calls ), 'the filter receives the fact name and the viewable order' );
ok( 'Baking on Mon 23 Nov' === $get( 'fact:bake_date', array( 'format' => 'Baking on %s' ) ), 'the format arg places a fact in a sentence' );

// No filter answering: the fact is empty (not null), so the block renders its empty value and never its draft words.
ok( '' === $no_filter( fn() => $get( 'fact:bake_date' ) ), 'with no filter answering a fact is an empty string' );
ok( '' === $no_filter( fn() => $get( 'fact:bake_date', array( 'format' => 'Baking on %s' ) ) ), 'and its format words are dropped with it' );
ok( '' === $get( 'fact:unknown_fact' ), 'a fact the filter does not answer is an empty string' );

// Several facts in one sentence: the key is the first, the others are {fact:name} tokens in the format.
$sentence = 'Baking on {fact:bake_date} · with you from %s';
ok( 'Baking on Mon 23 Nov · with you from Wed 25 Nov' === $get( 'fact:bake_arrive', array( 'format' => $sentence ) ), 'another fact in the format is a {fact:name} token' );
$facts['bake_date'] = '';
ok( '' === $get( 'fact:bake_arrive', array( 'format' => $sentence ) ), 'a sentence with one fact missing shows nothing' );
$facts['bake_date'] = 'Mon 23 Nov';
$facts['bake_arrive'] = '';
ok( '' === $get( 'fact:bake_arrive', array( 'format' => $sentence ) ), 'and so does one whose own fact is missing' );
$facts['bake_arrive'] = 'Wed 25 Nov';
ok( 'To shopper@example.com, baking Mon 23 Nov' === $get( 'email', array( 'format' => 'To %s, baking {fact:bake_date}' ) ), 'a built-in key takes fact tokens too' );
ok( '{fact:bake_date}' === $get( 'gift_message' ), 'a value that holds token text is never expanded' );
ok( '{fact:bake_date} ok' === $get( 'gift_message', array( 'format' => '%s ok' ) ), 'not even inside a format' );

// The filter's answer is plain text, and the name is a sanitised key.
$facts['bake_date'] = '<b>Mon</b> 23 Nov';
ok( 'Mon 23 Nov' === $get( 'fact:bake_date' ), 'a fact is sanitised as plain text' );
$facts['bake_date'] = array( 'Mon' );
ok( '' === $get( 'fact:bake_date' ), 'a fact that is not a scalar is empty' );
$facts['bake_date'] = 'Mon 23 Nov';
$get( 'fact:Bake_Date' );
ok( 'bake_date' === end( $calls )[0], 'the fact name reaches the filter as a sanitised key' );

// Only a viewable order: the same checks as every other key, and the filter is not called without one.
$calls = array();
$_GET['key'] = 'wrong';
ok( null === $get( 'fact:bake_date' ), 'a wrong order key resolves a fact to null' );
ok( array() === $calls, 'and the filter is never called for an order the visitor may not see' );
$_GET['key'] = 'wc_order_def';
$GLOBALS['sgs_t']['query'] = array( 'order-received' => '727' );
$GLOBALS['sgs_t']['user']  = 9;
ok( null === $get( 'fact:bake_date' ), 'another customer cannot read a fact of a customer order' );
$GLOBALS['sgs_t']['user']  = 7;
ok( 'Mon 23 Nov' === $get( 'fact:bake_date' ), 'the owner can' );
$_GET['key'] = 'wc_order_abc';
$GLOBALS['sgs_t']['query'] = array( 'order-received' => '726' );
$GLOBALS['sgs_t']['user']  = 0;

// Negative controls: nothing existing changed.
ok( null === $get( 'fact:' ) && null === $get( 'fact' ) && null === $get( 'factbake_date' ), 'a fact with no name, or a key that only looks like one, is unknown' );
ok( null === $get( 'nonsense' ), 'an unknown key still resolves to null' );
ok( 'shopper@example.com' === $get( 'email' ) && '726' === $get( 'number' ), 'the built-in keys resolve as before' );
ok( array( 'number', 'email', 'delivery_method', 'total', 'date', 'view_url', 'gift_to', 'gift_message', 'item_count', 'shipping_name', 'shipping_address', 'billing_name', 'billing_address', 'phone', 'payment_method' ) === Order_Binding::KEYS, 'the built-in key list is unchanged' );
ok( 'Thank you shopper@example.com' === $get( 'email', array( 'format' => 'Thank you %s' ) ), 'a format with no fact token places the value as before' );

echo $failures ? "\n$failures failed\n" : "\nall passed\n";
exit( $failures > 0 ? 1 : 0 );
