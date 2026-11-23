<?php
/**
 * Standalone test: the sgs/archive block binding (a category or tag archive's name and description, with a format and a
 * fallback to the typed text everywhere else).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-archive-binding-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );
if ( ! class_exists( 'WP_Term' ) ) {
	class WP_Term {
		public $name        = '';
		public $description = '';
	}
}
$GLOBALS['sgs_arch'] = array( 'tax' => false, 'cat' => false, 'tag' => false, 'obj' => null );
function is_tax() { return $GLOBALS['sgs_arch']['tax']; }
function is_category() { return $GLOBALS['sgs_arch']['cat']; }
function is_tag() { return $GLOBALS['sgs_arch']['tag']; }
function get_queried_object() { return $GLOBALS['sgs_arch']['obj']; }
function sanitize_key( $k ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $k ) ); }
function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function wp_strip_all_tags( $s ) { return trim( strip_tags( (string) $s ) ); }
function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
require dirname( __DIR__, 2 ) . '/includes/class-archive-binding.php';

use SGS\Blocks\Archive_Binding as AB;

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}
function term( string $name, string $description = '' ): WP_Term {
	$t              = new WP_Term();
	$t->name        = $name;
	$t->description = $description;
	return $t;
}

ok( null === AB::get_value( array( 'key' => 'title' ) ), 'not an archive (the shop page): null, so the heading keeps "The shop"' );
$GLOBALS['sgs_arch'] = array( 'tax' => false, 'cat' => false, 'tag' => false, 'obj' => term( 'Gifts' ) );
ok( null === AB::get_value( array( 'key' => 'title' ) ), 'a queried term on a page that is not a term archive: null' );

$GLOBALS['sgs_arch'] = array( 'tax' => true, 'cat' => false, 'tag' => false, 'obj' => term( 'Gifts', 'Boxes for a new mum.' ) );
ok( 'Gifts' === AB::get_value( array( 'key' => 'title' ) ), 'product category archive: the category name' );
ok( 'Boxes for a new mum.' === AB::get_value( array( 'key' => 'description' ) ), 'description: the term description' );
ok( 'Shop Gifts' === AB::get_value( array( 'key' => 'title', 'format' => 'Shop %s' ) ), 'format: %s becomes the name' );
ok( 'Gifts' === AB::get_value( array( 'key' => 'title', 'format' => 'Shop' ) ), 'a format without %s is ignored' );

$GLOBALS['sgs_arch'] = array( 'tax' => true, 'cat' => false, 'tag' => false, 'obj' => term( 'Gifts' ) );
ok( null === AB::get_value( array( 'key' => 'description' ) ), 'an empty description: null, never an empty heading' );

$GLOBALS['sgs_arch'] = array( 'tax' => false, 'cat' => true, 'tag' => false, 'obj' => term( 'News' ) );
ok( 'News' === AB::get_value( array( 'key' => 'title' ) ), 'post category archive: the category name' );
$GLOBALS['sgs_arch'] = array( 'tax' => false, 'cat' => false, 'tag' => true, 'obj' => term( 'Recipes' ) );
ok( 'Recipes' === AB::get_value( array( 'key' => 'title' ) ), 'tag archive: the tag name' );

$GLOBALS['sgs_arch'] = array( 'tax' => true, 'cat' => false, 'tag' => false, 'obj' => term( 'Tea &amp; <b>biscuits</b>' ) );
ok( 'Tea &amp; biscuits' === AB::get_value( array( 'key' => 'title' ) ), 'markup stripped and the ampersand escaped once for rich text' );
$GLOBALS['sgs_arch'] = array( 'tax' => true, 'cat' => false, 'tag' => false, 'obj' => term( '<script>x</script>' ) );
ok( 'x' === AB::get_value( array( 'key' => 'title' ) ), 'a script tag in a term name never reaches the heading' );

$GLOBALS['sgs_arch'] = array( 'tax' => true, 'cat' => false, 'tag' => false, 'obj' => (object) array( 'name' => 'Not a term' ) );
ok( null === AB::get_value( array( 'key' => 'title' ) ), 'a queried object that is not a term: null' );
$GLOBALS['sgs_arch'] = array( 'tax' => true, 'cat' => false, 'tag' => false, 'obj' => term( 'Gifts' ) );
ok( null === AB::get_value( array( 'key' => 'slug' ) ) && null === AB::get_value( array() ) && null === AB::get_value( 'x' ), 'an unknown or missing key resolves to null' );

echo $failures ? "\n{$failures} FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
