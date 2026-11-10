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
add_filter( 'render_block_data', __NAMESPACE__ . '\sgs_checkout_arm_field_labels' );
add_filter( 'gettext', __NAMESPACE__ . '\sgs_checkout_field_gettext', 10, 3 );

/**
 * Field-label keys: key => WooCommerce's original text (the msgid its PHP passes to `__()`).
 *
 * WooCommerce builds these labels in PHP while the Checkout block renders (`CoreCheckoutFields::get_fields`) and hands
 * them to the block as `wcSettings.defaultFields`, so the client-side translation filter never sees them; the PHP
 * `gettext` filter does, for as long as the Checkout block is rendering.
 *
 * @return array<string, string>
 */
function sgs_checkout_field_label_keys(): array {
	return array(
		'emailLabel' => 'Email address',
		'cityLabel'  => 'City',
	);
}

/**
 * The field labels the Checkout block being rendered asks for (original text => client's text); set before the block
 * renders, cleared once it has.
 *
 * @param array<string, string>|null $set New map, or null to read.
 * @return array<string, string>
 */
function sgs_checkout_field_labels_state( ?array $set = null ): array {
	static $labels = array();
	if ( null !== $set ) {
		$labels = $set;
	}
	return $labels;
}

/**
 * Keep the field-label keys with non-empty plain text.
 *
 * @param mixed $raw The `sgsCheckoutStrings` attribute.
 * @return array<string, string> Original text => client's label.
 */
function sgs_checkout_field_labels( $raw ): array {
	$labels = array();
	if ( ! is_array( $raw ) ) {
		return $labels;
	}
	foreach ( sgs_checkout_field_label_keys() as $key => $original ) {
		if ( isset( $raw[ $key ] ) && is_scalar( $raw[ $key ] ) ) {
			$text = trim( sanitize_text_field( (string) $raw[ $key ] ) );
			if ( '' !== $text ) {
				$labels[ $original ] = $text;
			}
		}
	}
	return $labels;
}

/**
 * `render_block_data` filter: before the Checkout block renders, note which field labels it sets. Any other block
 * clears nothing and sets nothing.
 *
 * @param mixed $parsed_block The block about to render.
 * @return mixed The block, unchanged.
 */
function sgs_checkout_arm_field_labels( $parsed_block ) {
	if ( is_array( $parsed_block ) && 'woocommerce/checkout' === ( $parsed_block['blockName'] ?? '' ) ) {
		$attrs = is_array( $parsed_block['attrs'] ?? null ) ? $parsed_block['attrs'] : array();
		sgs_checkout_field_labels_state( sgs_checkout_field_labels( $attrs['sgsCheckoutStrings'] ?? null ) );
	}
	return $parsed_block;
}

/**
 * `gettext` filter: the client's wording for the email and city labels while the Checkout block renders.
 *
 * @param mixed $translation Translated text.
 * @param mixed $text        Original text.
 * @param mixed $domain      Text domain.
 * @return mixed
 */
function sgs_checkout_field_gettext( $translation, $text, $domain ) {
	if ( 'woocommerce' !== $domain || ! is_string( $text ) ) {
		return $translation;
	}
	$labels = sgs_checkout_field_labels_state();
	return array() !== $labels && isset( $labels[ $text ] ) ? $labels[ $text ] : $translation;
}

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
		'summaryTitle'       => 'Order summary',
		'newPasswordLabel'   => 'Create a password',
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
	// WooCommerce passes `__()` no context for these strings, so the filter cannot tell which component asked. It
	// rewrites only while the Checkout block is on the page (the block's own wrapper), once per page.
	return 'if ( ! window.sgsCheckoutStringsApplied ) { window.sgsCheckoutStringsApplied = true; '
		. '( function ( map ) { if ( ! window.wp || ! window.wp.hooks ) { return; } var onCheckout = null; '
		. 'window.wp.hooks.addFilter( "i18n.gettext_woocommerce", "sgs/checkout-strings", function ( translation, text ) { '
		. 'if ( ! Object.prototype.hasOwnProperty.call( map, text ) ) { return translation; } '
		. 'if ( ! onCheckout ) { onCheckout = document.querySelector( ".wp-block-woocommerce-checkout" ); } '
		. 'return onCheckout ? map[ text ] : translation; } ); '
		. '}( ' . $json . ' ) ); }';
}

/**
 * Render-block filter: hand the script to the page for the Checkout block.
 *
 * Before `wp-i18n` prints, the script is appended to that handle so it runs ahead of the block's bundle; once it has
 * printed, it goes through a footer handle of its own.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_checkout_strings_inject( $block_content, $block ) {
	if ( ! is_string( $block_content ) || ! is_array( $block ) || 'woocommerce/checkout' !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	$attrs = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
	sgs_checkout_field_labels_state( array() );
	$script = sgs_checkout_strings_script( sgs_checkout_strings_map( $attrs['sgsCheckoutStrings'] ?? null ) );
	if ( '' === $script ) {
		return $block_content;
	}
	if ( ! wp_script_is( 'wp-i18n', 'done' ) ) {
		wp_add_inline_script( 'wp-i18n', $script, 'after' );
		return $block_content;
	}
	// Printed through a footer handle of its own: script text placed in post or block content is run through
	// `wptexturize`, which encodes `&&` and quotes and breaks the script.
	if ( ! wp_script_is( 'sgs-checkout-strings', 'registered' ) ) {
		wp_register_script( 'sgs-checkout-strings', false, array( 'wp-hooks' ), false, true );
	}
	wp_enqueue_script( 'sgs-checkout-strings' );
	wp_add_inline_script( 'sgs-checkout-strings', $script );
	return $block_content;
}
