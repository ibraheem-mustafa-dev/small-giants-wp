<?php
/**
 * Standalone runner for AccountButtonKitTest: renders sgs/account's signed-out card, its empty-state card and its button
 * kit CSS (includes/account/helpers-account-signed-out.php) in a clean process and prints one JSON object.
 *
 * `sgs/button` is stubbed: a button prints as `<btn>` plus the JSON of the attributes the helper handed it, so a test sees
 * exactly what the real button would receive (and the real button renders byte for byte the same for the same attributes).
 *
 * Usage: php run-account-button-kit-standalone.php <cases.json>
 * Each case: { "fn": "signed_out" | "empty" | "kit_css", "attrs": {...}, "register": bool, "args": [...] }.
 *
 * @package SGS\Blocks\Tests
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
		return false;
	}
}
$GLOBALS['sgs_qa_render_child'] = static function ( array $block ): string {
	return '<btn ' . wp_json_encode( $block['attrs'] ) . '>';
};
require dirname( __DIR__, 2 ) . '/scripts/qa/lib/tag-processor-stub.php';
require dirname( __DIR__, 2 ) . '/includes/render-helpers.php';
require dirname( __DIR__, 2 ) . '/includes/account/helpers-account-signed-out.php';

$cases = json_decode( (string) file_get_contents( $argv[1] ), true, 512, JSON_THROW_ON_ERROR );
$out   = array();
foreach ( $cases as $name => $case ) {
	putenv( 'SGS_QA_OPTIONS=' . wp_json_encode( array( 'woocommerce_enable_myaccount_registration' => ! empty( $case['register'] ) ? 'yes' : 'no' ) ) );
	$attrs = (array) ( $case['attrs'] ?? array() );
	$args  = (array) ( $case['args'] ?? array() );
	switch ( $case['fn'] ) {
		case 'signed_out':
			$out[ $name ] = sgs_account_signed_out_html( $attrs );
			break;
		case 'empty':
			$out[ $name ] = sgs_account_empty_card_html( ...$args );
			break;
		case 'kit_css':
			$out[ $name ] = function_exists( 'sgs_account_button_kit_css' ) ? sgs_account_button_kit_css( $attrs, (string) ( $args[0] ?? '.sgs-acct-x' ) ) : 'MISSING';
			break;
		default:
			$out[ $name ] = 'UNKNOWN';
	}
}
echo wp_json_encode( $out, JSON_UNESCAPED_SLASHES );
