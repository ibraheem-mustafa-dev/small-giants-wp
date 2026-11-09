<?php
/**
 * Checkout wording: the client's own text for the strings WooCommerce's Checkout block draws in JavaScript.
 *
 * The Checkout block's text is built in React with `@wordpress/i18n`, never through PHP gettext, so a PHP `gettext`
 * filter cannot reach it. The `sgsCheckoutStrings` attribute of `woocommerce/checkout` maps a supported key to the
 * client's text; when any is set the block's render hands a short script to the page that adds an
 * `i18n.gettext_woocommerce` filter (the client-side translation filter `@wordpress/i18n` provides) before the block
 * mounts. Only the Checkout block's own page carries it, and an unset block prints nothing.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\sgs_checkout_strings_inject', 12, 2 );

/**
 * Supported keys: key => WooCommerce's original text (the msgid the Checkout block passes to `__()`).
 *
 * @return array<string, string>
 */
function sgs_checkout_strings_supported(): array {
	return array(
		'loginLink'          => 'Log in',
		'createAccountLabel' => 'Create an account with %s',
		'expressDivider'     => 'Or continue below',
	);
}

/**
 * Keep known keys with non-empty plain text.
 *
 * @param mixed $raw The `sgsCheckoutStrings` attribute.
 * @return array<string, string> Original text => client's text.
 */
function sgs_checkout_strings_map( $raw ): array {
	if ( ! is_array( $raw ) ) {
		return array();
	}
	$map = array();
	foreach ( sgs_checkout_strings_supported() as $key => $original ) {
		if ( isset( $raw[ $key ] ) && is_scalar( $raw[ $key ] ) ) {
			$text = trim( sanitize_text_field( (string) $raw[ $key ] ) );
			if ( '' !== $text ) {
				$map[ $original ] = $text;
			}
		}
	}
	return $map;
}

/**
 * The script that adds the gettext filter.
 *
 * @param array<string, string> $map Original text => client's text.
 * @return string JavaScript, '' when the map is empty.
 */
function sgs_checkout_strings_script( array $map ): string {
	if ( array() === $map ) {
		return '';
	}
	$json = wp_json_encode( $map, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE );
	return '( function ( map ) { if ( ! window.wp || ! window.wp.hooks ) { return; } '
		. 'window.wp.hooks.addFilter( "i18n.gettext_woocommerce", "sgs/checkout-strings", '
		. 'function ( translation, text ) { return Object.prototype.hasOwnProperty.call( map, text ) ? map[ text ] : translation; } ); '
		. '}( ' . $json . ' ) );';
}

/**
 * Render-block filter: hand the script to the page for the Checkout block.
 *
 * Before `wp-i18n` prints, the script is appended to that handle so it runs ahead of the block's bundle; once it has
 * printed, the script follows the block's own markup.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_checkout_strings_inject( $block_content, $block ) {
	if ( ! is_string( $block_content ) || ! is_array( $block ) || 'woocommerce/checkout' !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	$attrs  = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
	$script = sgs_checkout_strings_script( sgs_checkout_strings_map( $attrs['sgsCheckoutStrings'] ?? null ) );
	if ( '' === $script ) {
		return $block_content;
	}
	if ( ! wp_script_is( 'wp-i18n', 'done' ) ) {
		wp_add_inline_script( 'wp-i18n', $script, 'after' );
		return $block_content;
	}
	return $block_content . '<script>' . $script . '</script>';
}
