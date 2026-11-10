<?php
/**
 * Standalone test: the account tab heading can carry a count beside it (the Wishlist tab's "0 frames"), worded by the
 * block's wishlistCountText / wishlistCountOneText with a {count} token, and prints nothing extra while unset.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-tab-count-standalone.php [path to a plugin copy]
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = rtrim( $argv[1] ?? dirname( __DIR__, 2 ), '/'.chr(92) );
define( 'ABSPATH', $base . '/' );
require $base . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'add_filter' ) ) { function add_filter() {} }
if ( ! function_exists( 'add_action' ) ) { function add_action() {} }
require_once $base . '/includes/account/class-account-strings.php';
require_once $base . '/includes/account/class-account-endpoints.php';
use SGS\Blocks\Account_Endpoints;

$failures = 0;
function ok( bool $c, string $label ): void {
	global $failures;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) { ++$failures; }
}

$has = method_exists( Account_Endpoints::class, 'count_text' );
$a   = array( 'wishlistCountText' => '{count} frames', 'wishlistCountOneText' => '{count} frame' );
ok( $has && '0 frames' === Account_Endpoints::count_text( 0, $a ), 'zero reads as the plural wording' );
ok( $has && '1 frame' === Account_Endpoints::count_text( 1, $a ), 'one reads as the singular wording' );
ok( $has && '1 frames' === Account_Endpoints::count_text( 1, array( 'wishlistCountText' => '{count} frames' ) ), 'with no singular wording the plural is used' );
ok( $has && '' === Account_Endpoints::count_text( 3, array() ), 'unset prints nothing' );

Account_Endpoints::$active = array( 'tabHeadings' => true );
ob_start();
Account_Endpoints::print_tab_heading( 'Wishlist', '0 frames' );
$html = ob_get_clean();
ok( false !== strpos( $html, '<h2 class="sgs-account__heading sgs-account__tab-heading">Wishlist</h2>' ) && false !== strpos( $html, 'sgs-account__tab-count">0 frames<' ) && false !== strpos( $html, 'sgs-account__tab-head' ), 'the heading and its count share one row' );
ob_start();
Account_Endpoints::print_tab_heading( 'Wishlist', '' );
$plain = ob_get_clean();
ok( '<h2 class="sgs-account__heading sgs-account__tab-heading">Wishlist</h2>' === $plain, 'without a count the heading is as before' );

echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
