<?php
/**
 * Standalone runner: the post and product templates are one loop for image loading (Spec 49 section 7.7).
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-media-loop-priority-standalone.php
 *
 * Runs the shipped `Sgs_Motion_Loop_Delays::enter_template` and `leave_template` with the shipped
 * `SGS_Media_Priority`, and asserts: inside a `woocommerce/product-template` the first three products' images are
 * eager and the fourth to sixth are lazy; a second template on the page restarts at its first item; a template nested
 * inside the first does not restart the outer count; a block that is not a template opens no loop; once a template
 * ends, a slot outside it is eager again. Exits 1 on any failure.
 *
 * @package SGS\Blocks\Tests
 */

declare( strict_types=1 );

// CLI test harness (not shipped code).
// phpcs:disable

require_once __DIR__ . '/stubs/motion-render-stubs.php';
require_once dirname( __DIR__, 2 ) . '/includes/media/class-sgs-media-priority.php';

use SGS\Blocks\Motion\Sgs_Motion_Loop_Delays;

if ( ! function_exists( 'get_the_ID' ) ) {
	function get_the_ID() {
		return $GLOBALS['sgs_test_post_id'] ?? false;
	}
}

$failures = 0;
$check    = static function ( bool $ok, string $label ) use ( &$failures ): void {
	if ( ! $ok ) {
		++$failures;
		echo "FAIL: $label\n";
	}
};

$page = array(
	'armed' => true,
	'rest'  => false,
	'fold'  => true,
);

/** The loading value of one image slot for the post the loop is on. */
$slot = static function ( int $post_id ) use ( $page ): string {
	$GLOBALS['sgs_test_post_id'] = $post_id;
	return SGS_Media_Priority::resolve( array( 'width' => 1200, 'height' => 800 ), $page )['loading'];
};

$products = array( 'blockName' => 'woocommerce/product-template' );
$posts    = array( 'blockName' => 'core/post-template' );

SGS_Media_Priority::reset();

// 1. One template: three eager, three lazy.
Sgs_Motion_Loop_Delays::enter_template( null, $products );
$first = array_map( $slot, array( 1, 2, 3, 4, 5, 6 ) );
Sgs_Motion_Loop_Delays::leave_template( '', $products );
$check( array( 'eager', 'eager', 'eager', 'lazy', 'lazy', 'lazy' ) === $first, 'a product template loads its first three items eagerly: ' . implode( ',', $first ) );

// 2. A second template restarts at item 1.
Sgs_Motion_Loop_Delays::enter_template( null, $posts );
$second = array_map( $slot, array( 11, 12, 13, 14 ) );
Sgs_Motion_Loop_Delays::leave_template( '', $posts );
$check( array( 'eager', 'eager', 'eager', 'lazy' ) === $second, 'a second template restarts its count: ' . implode( ',', $second ) );

// 3. A template nested in a template does not restart the outer count.
SGS_Media_Priority::reset();
Sgs_Motion_Loop_Delays::enter_template( null, $products );
$slot( 21 );
$slot( 22 );
Sgs_Motion_Loop_Delays::enter_template( null, $posts );
$slot( 23 );
Sgs_Motion_Loop_Delays::leave_template( '', $posts );
$after = $slot( 24 );
Sgs_Motion_Loop_Delays::leave_template( '', $products );
$check( 'lazy' === $after, 'a nested template keeps the outer count (fourth item lazy)' );

// 4. A block that is not a template opens no loop.
SGS_Media_Priority::reset();
Sgs_Motion_Loop_Delays::enter_template( null, array( 'blockName' => 'core/group' ) );
$plain = array_map( $slot, array( 31, 32, 33, 34, 35 ) );
Sgs_Motion_Loop_Delays::leave_template( '', array( 'blockName' => 'core/group' ) );
$check( array_fill( 0, 5, 'eager' ) === $plain, 'a non-template block applies no loop rule: ' . implode( ',', $plain ) );

// 5. After the template ends, a slot outside it is not held back.
SGS_Media_Priority::reset();
Sgs_Motion_Loop_Delays::enter_template( null, $products );
array_map( $slot, array( 41, 42, 43, 44, 45 ) );
Sgs_Motion_Loop_Delays::leave_template( '', $products );
$check( 'eager' === $slot( 99 ), 'a slot after the template is eager again' );
$check( false === Sgs_Motion_Loop_Delays::in_template_item(), 'template depth is back to zero' );

if ( $failures > 0 ) {
	echo "FAILED: $failures\n";
	exit( 1 );
}
echo "OK\n";
