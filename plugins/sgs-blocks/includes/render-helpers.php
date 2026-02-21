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

	return 'var(--wp--preset--color--' . esc_attr( $value ) . ')';
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

	if ( preg_match( '/^[\d.]/', $value ) || 0 === strpos( $value, 'clamp(' ) ) {
		return esc_attr( $value );
	}

	return 'var(--wp--preset--font-size--' . esc_attr( $value ) . ')';
}
