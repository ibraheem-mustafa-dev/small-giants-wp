<?php
/**
 * Standalone test: the sgs/customer block binding (the signed-in customer's name, with a format and a signed-out fallback).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-customer-binding-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
$GLOBALS['sgs_cust'] = array( 'in' => false, 'first' => '', 'display' => '' );
function is_user_logged_in() { return $GLOBALS['sgs_cust']['in']; }
function wp_get_current_user() { return (object) array( 'first_name' => $GLOBALS['sgs_cust']['first'], 'display_name' => $GLOBALS['sgs_cust']['display'] ); }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) ); }
function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
require dirname( __DIR__, 2 ) . '/includes/class-customer-binding.php';

use SGS\Blocks\Customer_Binding as CB;

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}

ok( null === CB::get_value( array( 'key' => 'first_name' ) ), 'signed out: null, so the block keeps its authored fallback' );
$GLOBALS['sgs_cust'] = array( 'in' => true, 'first' => 'Aisha', 'display' => 'aisha99' );
ok( 'Aisha' === CB::get_value( array( 'key' => 'first_name' ) ), 'first_name: the first name' );
ok( 'Hello, Aisha' === CB::get_value( array( 'key' => 'first_name', 'format' => 'Hello, %s' ) ), 'format: %s becomes the name' );
ok( 'Aisha' === CB::get_value( array( 'key' => 'first_name', 'format' => 'Hello' ) ), 'a format without %s is ignored' );
ok( 'aisha99' === CB::get_value( array( 'key' => 'display_name' ) ), 'display_name: the display name' );
$GLOBALS['sgs_cust']['first'] = '  ';
ok( 'aisha99' === CB::get_value( array( 'key' => 'first_name' ) ), 'first_name falls back to the display name' );
$GLOBALS['sgs_cust']['display'] = '';
ok( null === CB::get_value( array( 'key' => 'first_name' ) ), 'no name at all: null' );
$GLOBALS['sgs_cust'] = array( 'in' => true, 'first' => '<b>Ai</b>sha', 'display' => '' );
ok( 'Aisha' === CB::get_value( array( 'key' => 'first_name' ) ), 'markup in the name is stripped' );
ok( null === CB::get_value( array( 'key' => 'user_pass' ) ) && null === CB::get_value( array() ) && null === CB::get_value( 'x' ), 'an unknown or missing key resolves to null' );

echo $failures ? "\n{$failures} FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
