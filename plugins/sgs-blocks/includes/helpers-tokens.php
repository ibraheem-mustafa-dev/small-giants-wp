<?php
/**
 * Design-token resolution helpers for SGS block server-side rendering.
 *
 * Provides sgs_attr_has_value(), sgs_is_css_colour(), sgs_colour_value(),
 * sgs_shadow_value(), sgs_font_size_value(), and sgs_transition_vars() —
 * converting design token slugs to CSS custom properties and passing raw
 * CSS values through unchanged.
 *
 * @package SGS\Blocks
 */

/**
 * Determine whether an attribute value is meaningfully set.
 *
 * WordPress passes `type:"string"` attributes with `default:""` into render.php
 * as an empty string, not null. A bare `null !== $val` check wrongly fires for
 * those absent-attr cases, causing `floatval("")` = 0.0 to emit e.g. `padding-top:0px`.
 *
 * This helper returns `true` only when the value is neither null nor an empty string,
 * so it is safe to use as the gate for CSS emission. Numeric zero (`0` or `"0"`) returns
 * `true` because that is a legitimate explicitly-set value (e.g. `padding-top:0px` when
 * the operator intentionally wants zero padding).
 *
 * Typical usage (replaces bare `null !== $val` in CSS emission guards):
 *
 *   if ( sgs_attr_has_value( $padding_top ) ) {
 *       $style_parts[] = 'padding-top:' . floatval( $padding_top ) . esc_attr( $padding_unit );
 *   }
 *
 * @param mixed $val The attribute value to test.
 * @return bool True if the value is neither null nor empty string; false otherwise.
 */
function sgs_attr_has_value( $val ): bool {
	if ( null === $val ) {
		return false;
	}
	if ( '' === $val ) {
		return false;
	}
	return true;
}

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
		'aliceblue',
		'antiquewhite',
		'aqua',
		'aquamarine',
		'azure',
		'beige',
		'bisque',
		'black',
		'blanchedalmond',
		'blue',
		'blueviolet',
		'brown',
		'burlywood',
		'cadetblue',
		'chartreuse',
		'chocolate',
		'coral',
		'cornflowerblue',
		'cornsilk',
		'crimson',
		'cyan',
		'darkblue',
		'darkcyan',
		'darkgoldenrod',
		'darkgray',
		'darkgreen',
		'darkgrey',
		'darkkhaki',
		'darkmagenta',
		'darkolivegreen',
		'darkorange',
		'darkorchid',
		'darkred',
		'darksalmon',
		'darkseagreen',
		'darkslateblue',
		'darkslategray',
		'darkslategrey',
		'darkturquoise',
		'darkviolet',
		'deeppink',
		'deepskyblue',
		'dimgray',
		'dimgrey',
		'dodgerblue',
		'firebrick',
		'floralwhite',
		'forestgreen',
		'fuchsia',
		'gainsboro',
		'ghostwhite',
		'gold',
		'goldenrod',
		'gray',
		'green',
		'greenyellow',
		'grey',
		'honeydew',
		'hotpink',
		'indianred',
		'indigo',
		'ivory',
		'khaki',
		'lavender',
		'lavenderblush',
		'lawngreen',
		'lemonchiffon',
		'lightblue',
		'lightcoral',
		'lightcyan',
		'lightgoldenrodyellow',
		'lightgray',
		'lightgreen',
		'lightgrey',
		'lightpink',
		'lightsalmon',
		'lightseagreen',
		'lightskyblue',
		'lightslategray',
		'lightslategrey',
		'lightsteelblue',
		'lightyellow',
		'lime',
		'limegreen',
		'linen',
		'magenta',
		'maroon',
		'mediumaquamarine',
		'mediumblue',
		'mediumorchid',
		'mediumpurple',
		'mediumseagreen',
		'mediumslateblue',
		'mediumspringgreen',
		'mediumturquoise',
		'mediumvioletred',
		'midnightblue',
		'mintcream',
		'mistyrose',
		'moccasin',
		'navajowhite',
		'navy',
		'oldlace',
		'olive',
		'olivedrab',
		'orange',
		'orangered',
		'orchid',
		'palegoldenrod',
		'palegreen',
		'paleturquoise',
		'palevioletred',
		'papayawhip',
		'peachpuff',
		'peru',
		'pink',
		'plum',
		'powderblue',
		'purple',
		'rebeccapurple',
		'red',
		'rosybrown',
		'royalblue',
		'saddlebrown',
		'salmon',
		'sandybrown',
		'seagreen',
		'seashell',
		'sienna',
		'silver',
		'skyblue',
		'slateblue',
		'slategray',
		'slategrey',
		'snow',
		'springgreen',
		'steelblue',
		'tan',
		'teal',
		'thistle',
		'tomato',
		'turquoise',
		'violet',
		'wheat',
		'white',
		'whitesmoke',
		'yellow',
		'yellowgreen',
		// Special keywords.
		'transparent',
		'currentcolor',
		'inherit',
		'initial',
		'unset',
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
 * Resolve a shadow attribute value to a CSS box-shadow string.
 *
 * If the value is already a raw CSS shadow (contains a digit early in the
 * string, or starts with `var(`, `0 `, `rgb`, `inset`) it is returned
 * escaped as-is. Otherwise it is treated as a design token slug and wrapped
 * in a CSS custom property reference: var(--wp--preset--shadow--{slug}).
 *
 * Universal — mirrors sgs_colour_value() / sgs_font_size_value() shape.
 *
 * @param string|null $slug_or_value A CSS shadow string or a design token slug.
 * @return string A CSS box-shadow value, or empty string if input is empty.
 */
function sgs_shadow_value( ?string $slug_or_value ): string {
	if ( ! $slug_or_value ) {
		return '';
	}

	$value = trim( $slug_or_value );

	// Raw CSS shadow detection — any of the indicators below means
	// "don't wrap in preset var, pass through".
	$is_raw = (
		str_starts_with( $value, 'var(' ) ||
		str_starts_with( $value, 'inset' ) ||
		str_starts_with( $value, 'rgb' ) ||
		str_starts_with( $value, '0 ' ) ||
		(bool) preg_match( '/^\d/', $value )
	);

	if ( $is_raw ) {
		return esc_attr( $value );
	}

	// Sanitise slug to valid WordPress preset characters only.
	$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( $value ) );

	return 'var(--wp--preset--shadow--' . $slug . ')';
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
 * Build CSS custom properties for transition duration and easing.
 *
 * Extracts transition attributes from a block and returns an array of
 * CSS custom property strings. Used by 8+ blocks that share the same
 * hover transition controls.
 *
 * @param array $attributes Block attributes containing transitionDuration and transitionEasing.
 * @return array CSS custom property strings (e.g. '--sgs-transition-duration:300ms').
 */
function sgs_transition_vars( array $attributes ): array {
	$styles = array();

	$duration    = $attributes['transitionDuration'] ?? '';
	$duration_ms = preg_replace( '/[^0-9]/', '', $duration );
	$duration_ms = '' !== $duration_ms ? $duration_ms : '300';
	$styles[]    = '--sgs-transition-duration:' . $duration_ms . 'ms';

	$easing          = $attributes['transitionEasing'] ?? '';
	$allowed_easings = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
	$safe_easing     = in_array( $easing, $allowed_easings, true ) ? $easing : 'ease-in-out';
	$styles[]        = '--sgs-transition-easing:' . $safe_easing;

	return $styles;
}
