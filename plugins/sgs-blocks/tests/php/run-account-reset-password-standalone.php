<?php
/**
 * Standalone test: with resetErrorsInline on, the block's own reset-password template replaces WooCommerce's and shows
 * the validation errors as red text under the fields (not a boxed notice above the form) while keeping every field
 * WooCommerce's handler reads; the "passwords do not match" line takes the block's wording; other notices stay.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-reset-password-standalone.php [path to a plugin copy]
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable
$base = rtrim( $argv[1] ?? dirname( __DIR__, 2 ), '/' . chr( 92 ) );
define( 'ABSPATH', $base . '/' );
require $base . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'esc_url' ) ) { function esc_url( $u ) { return (string) $u; } }
if ( ! function_exists( 'esc_attr' ) ) { function esc_attr( $u ) { return htmlspecialchars( (string) $u, ENT_QUOTES ); } }
if ( ! function_exists( 'add_filter' ) ) { function add_filter() {} }
if ( ! function_exists( 'add_action' ) ) { function add_action() {} }
if ( ! function_exists( 'remove_filter' ) ) { function remove_filter() {} }
if ( ! function_exists( 'wp_nonce_field' ) ) { function wp_nonce_field( $a, $n ) { echo '<input type="hidden" name="' . $n . '" value="n-' . $a . '" />'; } }
if ( ! function_exists( 'wc_wp_theme_get_element_class_name' ) ) { function wc_wp_theme_get_element_class_name( $e ) { return ''; } }
if ( ! function_exists( 'esc_html_e' ) ) { function esc_html_e( $t, $d = '' ) { echo esc_html( $t ); } }
if ( ! function_exists( 'wc_get_notices' ) ) {
	function wc_get_notices( $type = '' ) { $n = $GLOBALS['notices']; return '' === $type ? $n : ( $n[ $type ] ?? array() ); }
	function wc_clear_notices() { $GLOBALS['notices'] = array(); }
	function wc_add_notice( $m, $t = 'success', $d = array() ) { $GLOBALS['notices'][ $t ][] = array( 'notice' => $m, 'data' => $d ); }
}
$GLOBALS['actions'] = array();
function do_action( $tag, ...$args ) { $GLOBALS['actions'][] = array( $tag, $GLOBALS['notices'] ); }

require_once $base . '/includes/account/class-account-strings.php';
require_once $base . '/includes/account/class-account-endpoints.php';
require_once $base . '/includes/account/class-account-extras.php';
use SGS\Blocks\Account_Endpoints;
use SGS\Blocks\Account_Extras;
use SGS\Blocks\Account_Strings;

$failures = 0;
function ok( bool $c, string $label ): void {
	global $failures;
	echo ( $c ? 'PASS ' : 'FAIL ' ) . $label . "\n";
	if ( ! $c ) { ++$failures; }
}

$swap = method_exists( Account_Extras::class, 'maybe_swap_reset_password_template' );
Account_Endpoints::$active = array();
ok( $swap && '/wc/r.php' === Account_Extras::maybe_swap_reset_password_template( '/wc/r.php', 'myaccount/form-reset-password.php' ), 'with resetErrorsInline off WooCommerce keeps its reset form' );
Account_Endpoints::$active = array( 'resetErrorsInline' => true );
ok( $swap && str_ends_with( (string) Account_Extras::maybe_swap_reset_password_template( '/wc/r.php', 'myaccount/form-reset-password.php' ), 'templates/form-reset-password.php' ), 'with it on the block template replaces the form' );
ok( $swap && '/wc/x.php' === Account_Extras::maybe_swap_reset_password_template( '/wc/x.php', 'myaccount/form-login.php' ), 'no other template is touched' );

$args = array( 'key' => 'k"ey', 'login' => 'lo<g' );
$GLOBALS['notices'] = array(
	'error'  => array( array( 'notice' => 'Passwords do not match.', 'data' => array() ), array( 'notice' => 'Please enter your password.', 'data' => array() ) ),
	'notice' => array( array( 'notice' => 'Keep me', 'data' => array() ) ),
);
Account_Endpoints::$active = array( 'resetErrorsInline' => true );
Account_Strings::begin( array( 'strings' => array( 'passwordMismatch' => 'Those two do not match. Try again.' ) ) );
ob_start();
if ( $swap ) { include $base . '/includes/account/templates/form-reset-password.php'; }
$html = ob_get_clean();
Account_Strings::end();

ok( false !== strpos( $html, 'name="password_1"' ) && false !== strpos( $html, 'name="password_2"' ), 'both password fields print' );
ok( false !== strpos( $html, 'name="reset_key" value="k&quot;ey"' ) && false !== strpos( $html, 'name="reset_login" value="lo&lt;g"' ), 'the reset key and login are kept, escaped' );
ok( false !== strpos( $html, 'name="wc_reset_password" value="true"' ) && false !== strpos( $html, 'name="woocommerce-reset-password-nonce" value="n-reset_password"' ), 'the action field and nonce WooCommerce checks are kept' );
ok( false !== strpos( $html, '<p class="sgs-account__reset-error" role="alert">Those two do not match. Try again.</p>' ), 'the mismatch line takes the block wording as red text with role alert' );
ok( false !== strpos( $html, '>Please enter your password.</p>' ), 'other errors print the same way, text unchanged' );
ok( strpos( $html, 'sgs-account__reset-error' ) > strpos( $html, 'name="password_2"' ) && strpos( $html, 'sgs-account__reset-error' ) < strpos( $html, 'type="submit"' ), 'the errors sit under the fields and above the button' );
ok( ! isset( $GLOBALS['notices']['error'] ) && 'Keep me' === $GLOBALS['notices']['notice'][0]['notice'], 'the errors are taken out of the notice list so no box prints above; other notices stay' );
$before = array_values( array_filter( $GLOBALS['actions'], fn( $a ) => 'woocommerce_before_reset_password_form' === $a[0] ) );
ok( 1 === count( $before ) && ! isset( $before[0][1]['error'] ), 'WooCommerce\'s before-form hook still runs, after the errors were taken out' );

echo $failures ? "\n$failures FAILED\n" : "\nALL PASSED\n";
exit( $failures ? 1 : 0 );
