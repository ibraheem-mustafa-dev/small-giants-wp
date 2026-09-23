<?php
/**
 * WP function stubs for GoogleFontsTest (guarded; real WP wins when loaded).
 *
 * @package SGS\Blocks\Tests
 */

if ( ! function_exists( 'wp_parse_url' ) ) {
	// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
	function wp_parse_url( $url, $component = -1 ) { // phpcs:ignore
		return parse_url( $url, $component ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url
	}
}
if ( ! function_exists( 'wp_json_encode' ) ) {
	// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound -- WP stub.
	function wp_json_encode( $data ) { // phpcs:ignore
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
	}
}
