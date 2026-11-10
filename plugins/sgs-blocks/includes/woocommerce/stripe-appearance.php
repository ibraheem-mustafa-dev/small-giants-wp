<?php
/**
 * Checkout: the Stripe card fields take the look of the block's own form-field settings.
 *
 * WooCommerce Stripe draws the card number, expiry and security code in its own frame, so no stylesheet reaches them.
 * Its block checkout reads `blocksAppearance` from its script data when that key is set and hands it to Stripe's
 * Elements as the Appearance object; otherwise it derives one from the page's computed styles. When the Checkout
 * block's `sgsStripeMatchFields` is on, this file builds that object from the block's field settings (border, radius,
 * padding, minimum height, fill, text, label colour and size, font) and the theme's focus ring and font, resolving
 * palette slugs to hex because Stripe cannot read CSS variables. A block without the setting changes nothing.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block_data', __NAMESPACE__ . '\sgs_stripe_appearance_record' );
add_filter( 'wc_stripe_params', __NAMESPACE__ . '\sgs_stripe_appearance_params' );

/**
 * The attributes of the Checkout block rendered on this request (set while the block's data is prepared, which is
 * before WooCommerce builds its payment script data).
 *
 * @param array<string, mixed>|null $set The attributes to remember, or null to read.
 * @return array<string, mixed>
 */
function sgs_stripe_appearance_state( ?array $set = null ): array {
	static $attrs = array();
	if ( null !== $set ) {
		$attrs = $set;
	}
	return $attrs;
}

/**
 * `render_block_data` filter: remember the Checkout block's attributes.
 *
 * @param mixed $parsed_block The block about to render.
 * @return mixed The block, unchanged.
 */
function sgs_stripe_appearance_record( $parsed_block ) {
	if ( is_array( $parsed_block ) && 'woocommerce/checkout' === ( $parsed_block['blockName'] ?? '' ) ) {
		sgs_stripe_appearance_state( is_array( $parsed_block['attrs'] ?? null ) ? $parsed_block['attrs'] : array() );
	}
	return $parsed_block;
}

/**
 * `wc_stripe_params` filter: add `blocksAppearance` when the Checkout block asks for it.
 *
 * @param mixed $params WooCommerce Stripe's script data.
 * @return mixed
 */
function sgs_stripe_appearance_params( $params ) {
	$attrs = sgs_stripe_appearance_state();
	if ( ! is_array( $params ) || true !== ( $attrs['sgsStripeMatchFields'] ?? false ) ) {
		return $params;
	}
	$params['blocksAppearance'] = sgs_stripe_appearance_from_attrs( $attrs );
	return $params;
}

/**
 * A palette slug or a literal colour as a hex or rgb() value.
 *
 * @param mixed $value Slug, hex or rgb() text.
 * @return string '' when it is neither a literal colour nor a known slug.
 */
function sgs_stripe_resolve_colour( $value ): string {
	$value = is_string( $value ) ? trim( $value ) : '';
	if ( '' === $value ) {
		return '';
	}
	if ( 1 === preg_match( '/^(#[0-9a-f]{3,8}|rgba?\([0-9 ,.%\/]+\))$/i', $value ) ) {
		return $value;
	}
	if ( 1 === preg_match( '/^var\(--wp--preset--color--([a-z0-9-]+)/', $value, $m ) ) {
		$value = $m[1];
	}
	$palette = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings( array( 'color', 'palette' ) ) : null;
	foreach ( array( 'custom', 'theme', 'default' ) as $origin ) {
		foreach ( is_array( $palette[ $origin ] ?? null ) ? $palette[ $origin ] : array() as $entry ) {
			if ( is_array( $entry ) && ( $entry['slug'] ?? '' ) === $value && is_string( $entry['color'] ?? null ) ) {
				return $entry['color'];
			}
		}
	}
	return '';
}

/**
 * The site's font stack for a font-family preset slug.
 *
 * @param string $slug Preset slug.
 * @return string '' when the preset is unknown.
 */
function sgs_stripe_font_stack( string $slug ): string {
	$fonts = function_exists( 'wp_get_global_settings' ) ? wp_get_global_settings( array( 'typography', 'fontFamilies' ) ) : null;
	foreach ( array( 'custom', 'theme', 'default' ) as $origin ) {
		foreach ( is_array( $fonts[ $origin ] ?? null ) ? $fonts[ $origin ] : array() as $entry ) {
			if ( is_array( $entry ) && ( $entry['slug'] ?? '' ) === $slug && is_string( $entry['fontFamily'] ?? null ) ) {
				return $entry['fontFamily'];
			}
		}
	}
	return '';
}

/**
 * One member of a responsive object's desktop tier.
 *
 * @param mixed  $raw The stored object.
 * @param string $key Member name inside the desktop tier (for example 'top').
 * @return string '' when it is not set.
 */
function sgs_stripe_desktop_value( $raw, string $key ): string {
	$tier  = is_array( $raw ) && is_array( $raw['desktop'] ?? null ) ? $raw['desktop'] : array();
	$value = $tier[ $key ] ?? '';
	return is_scalar( $value ) ? trim( (string) $value ) : '';
}

/**
 * A pixel length as an integer, or null when the value is not in px.
 *
 * @param string $length For example '48px' or '14'.
 * @return int|null
 */
function sgs_stripe_px( string $length ): ?int {
	return 1 === preg_match( '/^(\d+(?:\.\d+)?)(px)?$/', trim( $length ), $m ) ? (int) round( (float) $m[1] ) : null;
}

/**
 * The Stripe Appearance object for a Checkout block's field settings.
 *
 * @param array<string, mixed> $attrs The Checkout block's attributes.
 * @return array<string, mixed> Stripe Appearance: variables, rules, labels.
 */
function sgs_stripe_appearance_from_attrs( array $attrs ): array {
	$font_attr = is_string( $attrs['sgsFieldFontFamily'] ?? null ) ? $attrs['sgsFieldFontFamily'] : '';
	$stack     = sgs_stripe_font_stack( '' !== $font_attr ? $font_attr : 'body' );
	$unit      = (string) ( $attrs['sgsFieldFontSizeUnit'] ?? 'px' );
	$size_px   = isset( $attrs['sgsFieldFontSize'] ) && ( 'px' === $unit || '' === $unit ) ? sgs_stripe_px( (string) $attrs['sgsFieldFontSize'] ) : null;
	$fill      = sgs_stripe_resolve_colour( $attrs['sgsFieldBackground'] ?? '' );
	$text      = sgs_stripe_resolve_colour( $attrs['sgsFieldColour'] ?? '' );

	$variables = array();
	if ( '' !== $stack ) {
		$variables['fontFamily'] = $stack;
	}
	if ( null !== $size_px ) {
		$variables['fontSizeBase'] = $size_px . 'px';
	}
	if ( '' !== $fill ) {
		$variables['colorBackground'] = $fill;
	}
	if ( '' !== $text ) {
		$variables['colorText'] = $text;
	}

	$input   = array();
	$border  = sgs_stripe_px( sgs_stripe_desktop_value( $attrs['sgsFieldBorderWidth'] ?? null, 'top' ) );
	$colour  = sgs_stripe_resolve_colour( $attrs['sgsFieldBorderColour'] ?? '' );
	$style   = (string) ( $attrs['sgsFieldBorderStyle'] ?? 'solid' );
	if ( null !== $border && '' !== $colour && in_array( $style, array( 'solid', 'dashed', 'dotted' ), true ) ) {
		$input['border'] = $border . 'px ' . $style . ' ' . $colour;
	}
	$radius = sgs_stripe_px( sgs_stripe_desktop_value( $attrs['sgsFieldBorderRadius'] ?? null, 'topLeft' ) );
	if ( null !== $radius ) {
		$input['borderRadius'] = $radius . 'px';
	}
	if ( '' !== $fill ) {
		$input['backgroundColor'] = $fill;
	}
	if ( '' !== $text ) {
		$input['color'] = $text;
	}
	if ( null !== $size_px ) {
		$input['fontSize'] = $size_px . 'px';
	}
	foreach ( array(
		'left'  => 'paddingLeft',
		'right' => 'paddingRight',
	) as $side => $prop ) {
		$pad = sgs_stripe_px( sgs_stripe_desktop_value( $attrs['sgsFieldPadding'] ?? null, $side ) );
		if ( null !== $pad ) {
			$input[ $prop ] = $pad . 'px';
		}
	}
	$min = sgs_stripe_px( (string) ( $attrs['sgsFieldMinHeight'] ?? '' ) );
	if ( null !== $min && null !== $size_px ) {
		$vertical               = max( 0, (int) round( ( $min - 2 * (int) $border - (int) round( $size_px * 1.25 ) ) / 2 ) );
		$input['paddingTop']    = $vertical . 'px';
		$input['paddingBottom'] = $vertical . 'px';
	}

	$rules = array( '.Input' => $input );
	$ring  = sgs_stripe_resolve_colour( function_exists( 'wp_get_global_settings' ) ? ( wp_get_global_settings( array( 'custom', 'focus' ) )['ring'] ?? '' ) : '' );
	if ( '' !== $ring ) {
		$rules['.Input:focus'] = array(
			'outline'       => '2px solid ' . $ring,
			'outlineOffset' => '-2px',
		);
	}
	$resting      = array();
	$label_colour = sgs_stripe_resolve_colour( $attrs['sgsFieldLabelColour'] ?? '' );
	$label_size   = isset( $attrs['sgsFieldLabelFontSize'] ) ? sgs_stripe_px( (string) $attrs['sgsFieldLabelFontSize'] ) : null;
	if ( '' !== $label_colour ) {
		$resting['color'] = $label_colour;
	}
	if ( null !== $label_size ) {
		$resting['fontSize'] = $label_size . 'px';
	}
	if ( array() !== $resting ) {
		$rules['.Label--resting'] = $resting;
	}

	return array(
		'theme'     => 'stripe',
		'labels'    => 'floating',
		'variables' => $variables,
		'rules'     => $rules,
	);
}
