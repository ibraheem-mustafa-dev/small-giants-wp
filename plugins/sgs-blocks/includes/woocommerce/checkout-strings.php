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
add_filter( 'woocommerce_shared_settings', __NAMESPACE__ . '\sgs_checkout_shared_settings' );

/**
 * Field-label keys: key => the WooCommerce field (`defaultFields` entry) whose label it replaces.
 *
 * WooCommerce builds these labels in PHP (`__()` at request time) and hands them to the Checkout block as
 * `wcSettings.defaultFields`, so the client-side translation filter never sees them.
 *
 * @return array<string, string>
 */
function sgs_checkout_field_label_keys(): array {
	return array(
		'emailLabel' => 'email',
		'cityLabel'  => 'city',
	);
}

/**
 * The field labels the Checkout block on this page asks for; set while the block renders, read when WooCommerce
 * prints its shared settings in the footer.
 *
 * @param array<string, string>|null $set New labels (field => text), or null to read.
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
 * @return array<string, string> WooCommerce field => client's label.
 */
function sgs_checkout_field_labels( $raw ): array {
	$labels = array();
	if ( ! is_array( $raw ) ) {
		return $labels;
	}
	foreach ( sgs_checkout_field_label_keys() as $key => $field ) {
		if ( isset( $raw[ $key ] ) && is_scalar( $raw[ $key ] ) ) {
			$text = trim( sanitize_text_field( (string) $raw[ $key ] ) );
			if ( '' !== $text ) {
				$labels[ $field ] = $text;
			}
		}
	}
	return $labels;
}

/**
 * `woocommerce_shared_settings` filter: write the client's field labels into `defaultFields`.
 *
 * @param mixed $settings WooCommerce's shared settings.
 * @return mixed
 */
function sgs_checkout_shared_settings( $settings ) {
	$labels = sgs_checkout_field_labels_state();
	if ( array() === $labels || ! is_array( $settings ) || ! is_array( $settings['defaultFields'] ?? null ) ) {
		return $settings;
	}
	foreach ( $labels as $field => $text ) {
		if ( is_array( $settings['defaultFields'][ $field ] ?? null ) ) {
			$settings['defaultFields'][ $field ]['label'] = $text;
		}
	}
	return $settings;
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
	sgs_checkout_field_labels_state( sgs_checkout_field_labels( $attrs['sgsCheckoutStrings'] ?? null ) );
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
