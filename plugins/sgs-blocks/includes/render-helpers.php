<?php
/**
 * Shared render helper functions for SGS block server-side rendering.
 *
 * Provides consistent colour and font-size resolution across all blocks,
 * converting design token slugs to CSS custom properties and passing raw
 * CSS values through unchanged.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Determine whether a value is a direct CSS colour rather than a design token slug.
 *
 * Handles all modern CSS colour formats:
 * - Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 * - Functional: rgb(), rgba(), hsl(), hsla(), oklch(), lch(), oklab(), lab(), hwb()
 * - Named keywords: red, blue, transparent, currentColor, inherit, etc.
 *
 * @param string $value The value to test.
 * @return bool True if the value is a CSS colour, false if it looks like a slug.
 */
function sgs_is_css_colour( string $value ): bool {
	$value = trim( $value );

	if ( '' === $value ) {
		return false;
	}

	// Hex colours: #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
	if ( preg_match( '/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $value ) ) {
		return true;
	}

	// Functional colour notations.
	if ( preg_match( '/^(rgb|rgba|hsl|hsla|oklch|lch|oklab|lab|hwb)\s*\(/i', $value ) ) {
		return true;
	}

	// CSS named colour keywords (complete list per CSS Color Level 4).
	$named_colours = array(
		'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige',
		'bisque', 'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown',
		'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
		'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
		'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey',
		'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange',
		'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue',
		'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet',
		'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue',
		'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro',
		'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
		'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory',
		'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon',
		'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow',
		'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
		'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey',
		'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
		'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid',
		'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen',
		'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
		'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive',
		'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod',
		'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip',
		'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
		'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown',
		'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue',
		'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue', 'tan',
		'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
		'whitesmoke', 'yellow', 'yellowgreen',
		// Special keywords.
		'transparent', 'currentcolor', 'inherit', 'initial', 'unset',
	);

	if ( in_array( strtolower( $value ), $named_colours, true ) ) {
		return true;
	}

	return false;
}

/**
 * Resolve a colour attribute value to a CSS colour string.
 *
 * If the value is a raw CSS colour (hex, rgb, named, etc.) it is returned
 * escaped as-is. If it is a design token slug, it is wrapped in a CSS custom
 * property reference: var(--wp--preset--color--{slug}).
 *
 * @param string|null $slug_or_value A CSS colour string or a design token slug.
 * @return string A CSS colour value, or an empty string if input is empty.
 */
function sgs_colour_value( ?string $slug_or_value ): string {
	if ( ! $slug_or_value ) {
		return '';
	}

	$value = trim( $slug_or_value );

	if ( sgs_is_css_colour( $value ) ) {
		return esc_attr( $value );
	}

	// Sanitise slug to valid WordPress preset characters only (prevents CSS injection).
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );

	return 'var(--wp--preset--color--' . $slug . ')';
}

/**
 * Resolve a font-size attribute value to a CSS font-size string.
 *
 * If the value starts with a digit (e.g. "16px", "1.5em") or with "clamp(",
 * it is treated as a raw CSS value and returned escaped. Otherwise it is
 * treated as a design token slug: var(--wp--preset--font-size--{slug}).
 *
 * @param string|null $slug_or_value A CSS font-size string or a design token slug.
 * @return string A CSS font-size value, or an empty string if input is empty.
 */
function sgs_font_size_value( ?string $slug_or_value ): string {
	if ( ! $slug_or_value ) {
		return '';
	}

	$value = trim( $slug_or_value );

	// Raw CSS value: only permit <number><unit> or clamp() — block injection attempts.
	if ( preg_match( '/^\d+(\.\d+)?(px|em|rem|vh|vw|vmin|vmax|ch|ex|%)$/', $value ) ) {
		return $value;
	}
	if ( 0 === strpos( $value, 'clamp(' ) ) {
		$sanitised = safecss_filter_attr( 'font-size:' . $value );
		return $sanitised ? $value : '';
	}

	// Sanitise slug to valid WordPress preset characters only.
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );

	return 'var(--wp--preset--font-size--' . $slug . ')';
}

/**
 * Output a responsive image tag with srcset when a valid attachment ID is available.
 *
 * Falls back to a plain <img> when the attachment ID is 0 or invalid (e.g. images
 * imported from external URLs or pasted content without media library entries).
 *
 * @param int    $id    WordPress attachment ID (0 = unknown/external).
 * @param string $url   Image URL fallback.
 * @param string $alt   Alt text.
 * @param string $size  WordPress image size name (default: 'large').
 * @param array  $attrs Extra HTML attributes (class, style, loading, etc.).
 * @return string HTML img tag.
 */
function sgs_responsive_image( int $id, string $url, string $alt = '', string $size = 'large', array $attrs = [] ): string {
	// Merge defaults.
	$attrs = array_merge(
		[
			'loading' => 'lazy',
			'decoding' => 'async',
		],
		$attrs
	);

	// Use wp_get_attachment_image when we have a real attachment ID.
	if ( $id > 0 ) {
		$image = wp_get_attachment_image( $id, $size, false, array_merge( $attrs, [ 'alt' => $alt ] ) );
		if ( $image ) {
			return $image;
		}
	}

	// Fallback: plain <img> with no srcset.
	// Attempt to retrieve explicit dimensions from the attachment metadata so
	// the browser can reserve the correct space and avoid layout shift (CLS).
	if ( ! isset( $attrs['width'] ) && ! isset( $attrs['height'] ) ) {
		$resolve_id = $id;
		// If no attachment ID was provided, try resolving from URL.
		if ( 0 === $resolve_id && ! empty( $url ) ) {
			$resolve_id = absint( attachment_url_to_postid( $url ) );
		}
		if ( $resolve_id > 0 ) {
			$src_data = wp_get_attachment_image_src( $resolve_id, $size );
			if ( $src_data && ! empty( $src_data[1] ) && ! empty( $src_data[2] ) ) {
				$attrs['width']  = (int) $src_data[1];
				$attrs['height'] = (int) $src_data[2];
			}
		}
	}

	$attr_str = '';
	foreach ( $attrs as $key => $value ) {
		$attr_str .= ' ' . esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
	}

	return sprintf(
		'<img src="%s" alt="%s"%s />',
		esc_url( $url ),
		esc_attr( $alt ),
		$attr_str
	);
}
