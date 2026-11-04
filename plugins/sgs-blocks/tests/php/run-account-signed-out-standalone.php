<?php
/**
 * Standalone test: sgs/account's signed-out card and sign-in tabs helpers
 * (includes/account/helpers-account-signed-out.php, Spec 27 FR-30-25).
 *
 * Run: php plugins/sgs-blocks/tests/php/run-account-signed-out-standalone.php
 */

// phpcs:disable
define( 'ABSPATH', __DIR__ );

require dirname( __DIR__, 2 ) . '/scripts/qa/lib/wp-stubs.php';
if ( ! function_exists( 'wp_unslash' ) ) {
	function wp_unslash( $value ) {
		return $value;
	}
}
if ( ! function_exists( 'add_query_arg' ) ) {
	function add_query_arg( $args, $url ) {
		return $url . ( false === strpos( $url, '?' ) ? '?' : '&' ) . http_build_query( $args );
	}
}
if ( ! function_exists( 'wc_get_page_permalink' ) ) {
	function wc_get_page_permalink( $page ) {
		return 'https://example.test/my-account/';
	}
}
if ( ! function_exists( 'home_url' ) ) {
	function home_url( $path = '' ) {
		return 'https://example.test' . $path;
	}
}
if ( ! function_exists( 'is_wc_endpoint_url' ) ) {
	function is_wc_endpoint_url() {
		return (bool) ( $GLOBALS['t_endpoint'] ?? false );
	}
}
// wp-stubs.php's render_block() hands a block to this callable.
$GLOBALS['sgs_qa_render_child'] = static function ( array $block ): string {
	return '<a class="t-btn" href="' . $block['attrs']['url'] . '" data-preset="' . $block['attrs']['inheritStyle'] . '">' . $block['attrs']['label'] . '</a>';
};
require dirname( __DIR__, 2 ) . '/scripts/qa/lib/tag-processor-stub.php';

require dirname( __DIR__, 2 ) . '/includes/render-helpers.php';
require dirname( __DIR__, 2 ) . '/includes/account/helpers-account-signed-out.php';

$failures = 0;
function ok( bool $cond, string $label ): void {
	global $failures;
	echo ( $cond ? 'PASS  ' : 'FAIL  ' ) . $label . "\n";
	if ( ! $cond ) {
		++$failures;
	}
}
function with_options( array $options, callable $fn ) {
	putenv( 'SGS_QA_OPTIONS=' . wp_json_encode( $options ) );
	$out = $fn();
	putenv( 'SGS_QA_OPTIONS' );
	return $out;
}

// 1) The card is opt-in: absent signedOutView is today's WooCommerce form.
ok( false === sgs_account_signed_out_card_active( array() ), 'absent signedOutView shows the log-in form' );
ok( false === sgs_account_signed_out_card_active( array( 'signedOutView' => 'login' ) ), 'an unknown value shows the log-in form' );
ok( true === sgs_account_signed_out_card_active( array( 'signedOutView' => 'card' ) ), 'card shows the card to a visitor' );
$_GET['sgs-login'] = '1';
ok( false === sgs_account_signed_out_card_active( array( 'signedOutView' => 'card' ) ), '?sgs-login=1 shows the form' );
unset( $_GET['sgs-login'] );
$GLOBALS['t_endpoint'] = true;
ok( false === sgs_account_signed_out_card_active( array( 'signedOutView' => 'card' ) ), 'a WooCommerce endpoint (lost password) shows the form' );
$GLOBALS['t_endpoint'] = false;

// 2) Card buttons: empty links fall back to this page; registration off hides Create account.
$html = with_options( array( 'woocommerce_enable_myaccount_registration' => 'yes' ), static fn() => sgs_account_signed_out_html( array() ) );
ok( false !== strpos( $html, 'sgs-login=1"' ), 'empty sign-in link opens the form (?sgs-login=1)' );
ok( false !== strpos( $html, 'mode=register' ), 'empty create-account link opens the register form' );
ok( false !== strpos( $html, 'data-preset="primary"' ) && false !== strpos( $html, 'data-preset="secondary"' ), 'buttons use the primary and secondary presets' );
$html = sgs_account_signed_out_html( array() );
ok( false === strpos( $html, 'mode=register' ), 'create-account button hidden while registration is off' );
$html = sgs_account_signed_out_html( array( 'signedOutSignInUrl' => '/sign-in/', 'signedOutHeading' => 'Hello' ) );
ok( false !== strpos( $html, 'href="/sign-in/"' ) && false !== strpos( $html, '>Hello</h2>' ), 'set link and heading are used' );

// 3) Tabs: ARIA tabs pattern over WooCommerce's two columns.
$wc = '<div class="u-columns col2-set" id="customer_login"><div class="u-column1 col-1"><h2>Login</h2></div><div class="u-column2 col-2"><h2>Register</h2></div></div>';
$out = sgs_account_apply_tabs( $wc, false, 'u1', 'Sign in', 'Create account' );
ok( 2 === substr_count( $out, 'role="tab"' ) && 2 === substr_count( $out, 'role="tabpanel"' ), 'two tabs and two panels' );
ok( 1 === substr_count( $out, 'tabindex="0"' ) && 1 === substr_count( $out, 'tabindex="-1"' ), 'roving tabindex: one tab in the order' );
ok( 1 === substr_count( $out, 'hidden' ) && preg_match( '/u-column2[^>]*hidden/', $out ), 'only the register panel is hidden by default' );
$out = sgs_account_apply_tabs( $wc, true, 'u1', 'Sign in', 'Create account' );
ok( preg_match( '/id="u1-tab-register"[^>]*aria-selected="true"/', $out ) && preg_match( '/u-column1[^>]*hidden/', $out ), '?mode=register opens the second tab' );
ok( '<form class="x"></form>' === sgs_account_apply_tabs( '<form class="x"></form>', false, 'u1', 'a', 'b' ), 'markup without the two columns is returned unchanged' );

echo $failures ? "\n{$failures} FAILED\n" : "\nall passed\n";
exit( $failures ? 1 : 0 );
