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
function sgs_responsive_image( int $id, string $url, string $alt = '', string $size = 'large', array $attrs = array() ): string {
	// Merge defaults.
	$attrs = array_merge(
		array(
			'loading'  => 'lazy',
			'decoding' => 'async',
		),
		$attrs
	);

	// Use wp_get_attachment_image when we have a real attachment ID.
	if ( $id > 0 ) {
		$image = wp_get_attachment_image( $id, $size, false, array_merge( $attrs, array( 'alt' => $alt ) ) );
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

/**
 * Render inline SVG star icons for a given rating value.
 *
 * Used by star-rating, testimonial, and google-reviews blocks so star markup
 * is defined in exactly one place. Outputs filled, half, and empty SVG stars.
 *
 * @param float  $rating      Rating value, e.g. 4.5.
 * @param int    $best_rating Maximum stars to display (default 5).
 * @param int    $size        SVG width/height in pixels (default 20).
 * @param string $colour_css  CSS colour value for filled stars (default: currentColor).
 * @return string HTML string — a sequence of <span> elements, each wrapping an <svg>.
 */
function sgs_render_stars( float $rating, int $best_rating = 5, int $size = 20, string $colour_css = 'currentColor' ): string {
	$stars_html = '';
	$safe_size  = absint( $size );
	$safe_color = esc_attr( $colour_css );

	for ( $i = 1; $i <= $best_rating; $i++ ) {
		$filled = $i <= floor( $rating );
		$half   = ! $filled && ceil( $rating ) === (float) $i && fmod( $rating, 1 ) >= 0.5;

		if ( $half ) {
			$grad_id     = 'sgs-star-half-' . $i . '-' . wp_unique_id();
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--half" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' .
				'<defs><linearGradient id="%s"><stop offset="50%%" stop-color="%s"/><stop offset="50%%" stop-color="%s" stop-opacity="0.25"/></linearGradient></defs>' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#%s)"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				esc_attr( $grad_id ),
				$safe_color,
				$safe_color,
				esc_attr( $grad_id )
			);
		} elseif ( $filled ) {
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--filled" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="%s"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				$safe_color
			);
		} else {
			$stars_html .= sprintf(
				'<span class="sgs-star sgs-star--empty" aria-hidden="true">' .
				'<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' .
				'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="%s" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.35"/>' .
				'</svg></span>',
				$safe_size,
				$safe_size,
				$safe_color
			);
		}
	}

	return $stars_html;
}

/**
 * Compute the WCAG 2.1 relative luminance of an sRGB hex colour.
 *
 * Formula per WCAG 2.1 Success Criterion 1.4.3 (and the IEC 61966-2-1 sRGB spec):
 *   - Normalise each 8-bit channel to [0,1].
 *   - Linearise: channel ≤ 0.03928 → c / 12.92; else ((c + 0.055) / 1.055) ^ 2.4.
 *   - L = 0.2126 R + 0.7152 G + 0.0722 B.
 *
 * Returns -1.0 on an invalid / unparsable hex string.
 *
 * @param string $hex Colour string, e.g. '#f3e5ab', '#f0a', '#F3E5AB'.
 * @return float Relative luminance in [0.0, 1.0], or -1.0 on failure.
 */
function sgs_wcag_relative_luminance( string $hex ): float {
	// Normalise: strip leading '#', accept 3- or 6-character forms.
	$hex = ltrim( trim( $hex ), '#' );

	if ( 3 === strlen( $hex ) ) {
		// Expand shorthand #RGB → #RRGGBB.
		$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
	}

	if ( 6 !== strlen( $hex ) || ! ctype_xdigit( $hex ) ) {
		return -1.0;
	}

	$r_raw = hexdec( substr( $hex, 0, 2 ) ) / 255.0;
	$g_raw = hexdec( substr( $hex, 2, 2 ) ) / 255.0;
	$b_raw = hexdec( substr( $hex, 4, 2 ) ) / 255.0;

	$linearise = static function ( float $c ): float {
		return $c <= 0.03928
			? $c / 12.92
			: ( ( $c + 0.055 ) / 1.055 ) ** 2.4;
	};

	return 0.2126 * $linearise( $r_raw )
		+ 0.7152 * $linearise( $g_raw )
		+ 0.0722 * $linearise( $b_raw );
}

/**
 * Return `#000` or `#fff` — whichever gives the higher WCAG contrast ratio
 * against the supplied background hex colour.
 *
 * Algorithm (WCAG 2.1 §1.4.3):
 *   contrast_ratio = (L_lighter + 0.05) / (L_darker + 0.05)
 * where L_white = 1.0, L_black = 0.0.
 *
 * Tie-break: prefer the candidate that reaches ≥ 4.5 : 1. If neither does
 * (extremely mid-grey), pick the higher ratio.
 *
 * Guard: invalid hex → `#000` (safe fallback — dark text on unknown BG).
 *
 * Unit-reason:
 *   - #f3e5ab (pale yellow, L ≈ 0.773): black ratio ≈ 14.3, white ≈ 1.58 → #000 ✓
 *   - #000080 (navy, L ≈ 0.007): black ratio ≈ 1.08, white ≈ 20.1 → #fff ✓
 *   - #777777 (mid-grey, L ≈ 0.216): black ratio ≈ 3.9, white ratio ≈ 5.3 → #fff (≥4.5:1 ✓)
 *
 * @param string $hex Background colour in #RGB or #RRGGBB hex format.
 * @return string '#000' or '#fff'.
 */
function sgs_wcag_text_colour_for_bg( string $hex ): string {
	$l_bg = sgs_wcag_relative_luminance( $hex );

	// Guard: unparsable hex.
	if ( $l_bg < 0 ) {
		return '#000';
	}

	// Luminance of black (0.0) and white (1.0) are fixed.
	$l_black = 0.0;
	$l_white = 1.0;

	// Contrast of black text on this background.
	$lighter          = max( $l_bg, $l_black );
	$darker           = min( $l_bg, $l_black );
	$ratio_with_black = ( $lighter + 0.05 ) / ( $darker + 0.05 );

	// Contrast of white text on this background.
	$lighter          = max( $l_bg, $l_white );
	$darker           = min( $l_bg, $l_white );
	$ratio_with_white = ( $lighter + 0.05 ) / ( $darker + 0.05 );

	// If one reaches 4.5:1 and the other does not, pick the one that passes.
	$black_passes = $ratio_with_black >= 4.5;
	$white_passes = $ratio_with_white >= 4.5;

	if ( $black_passes && ! $white_passes ) {
		return '#000';
	}
	if ( $white_passes && ! $black_passes ) {
		return '#fff';
	}

	// Both pass (or neither — mid-grey edge case): pick the higher ratio.
	return $ratio_with_black >= $ratio_with_white ? '#000' : '#fff';
}

/**
 * Resolve a theme.json palette colour to its hex value by slug, reading the
 * MERGED global settings (default → theme → user/wp_global_styles), so the live
 * per-client colour wins (the canary serves its primary from the wp_global_styles
 * post, not theme.json on disk). User/custom origin is preferred over theme over
 * default. Used for build-time auto-contrast against a token-coloured background
 * whose hex is not known in CSS (e.g. the discount badge sat on --…--primary).
 *
 * Returns the $fallback when the slug is absent or global settings are
 * unavailable. A non-hex value (gradient / CSS var) flows through unchanged; the
 * luminance helper degrades it to a safe dark-text choice.
 *
 * @param string $slug     Palette slug, e.g. 'primary'.
 * @param string $fallback Returned when the slug cannot be resolved.
 * @return string Hex colour (e.g. '#e68a95') or the fallback.
 */
function sgs_resolve_palette_hex( string $slug, string $fallback = '' ): string {
	if ( ! function_exists( 'wp_get_global_settings' ) ) {
		return $fallback;
	}

	$palette = wp_get_global_settings( array( 'color', 'palette' ) );

	// wp_get_global_settings may return the palette keyed by origin
	// (default/theme/custom) or, in some WP versions, a flat list.
	$lists = array();
	if ( is_array( $palette ) && ( isset( $palette['custom'] ) || isset( $palette['theme'] ) || isset( $palette['default'] ) ) ) {
		foreach ( array( 'custom', 'theme', 'default' ) as $origin ) {
			if ( ! empty( $palette[ $origin ] ) && is_array( $palette[ $origin ] ) ) {
				$lists[] = $palette[ $origin ];
			}
		}
	} elseif ( is_array( $palette ) ) {
		$lists[] = $palette;
	}

	foreach ( $lists as $list ) {
		foreach ( $list as $entry ) {
			if ( is_array( $entry ) && isset( $entry['slug'], $entry['color'] ) && $slug === $entry['slug'] ) {
				return (string) $entry['color'];
			}
		}
	}

	return $fallback;
}

/**
 * Format a minor-int price as a plain display string (symbol + amount), matching
 * the SSR pattern used across the configurator (wc_price, tags stripped).
 *
 * @param int $minor    Price in minor units (pence).
 * @param int $decimals Currency decimals.
 * @return string e.g. "£9.99".
 */
function sgs_configurator_format_minor( int $minor, int $decimals ): string {
	return html_entity_decode(
		wp_strip_all_tags( wc_price( $minor / 10 ** $decimals ) ),
		ENT_QUOTES,
		'UTF-8'
	);
}

/**
 * The current-price display string for a combo under a tax-display mode (TAX-UI).
 *
 *  - 'auto'        : the shop-configured display price (unchanged behaviour).
 *  - 'inc-suffix'  : display price + the WC price suffix (e.g. "£11.99 inc. VAT").
 *  - 'ex-plus-vat' : ex-VAT price + " + £x VAT" (trade); no VAT line when tax is 0.
 *
 * @param array  $combo    Manifest combo (priceMinor / exMinor / taxMinor).
 * @param string $mode     'auto' | 'inc-suffix' | 'ex-plus-vat'.
 * @param int    $decimals Currency decimals.
 * @param string $suffix   Sanitised WC price suffix (inc-suffix mode only).
 * @return string
 */
function sgs_configurator_mode_price( array $combo, string $mode, int $decimals, string $suffix ): string {
	// Defensive: a stale combo missing the ex/tax fields degrades to the display
	// price instead of emitting "£0.00".
	if ( 'ex-plus-vat' === $mode && isset( $combo['exMinor'], $combo['taxMinor'] ) ) {
		$out = sgs_configurator_format_minor( (int) $combo['exMinor'], $decimals );
		if ( ! empty( $combo['taxMinor'] ) && (int) $combo['taxMinor'] > 0 ) {
			$out .= ' + ' . sgs_configurator_format_minor( (int) $combo['taxMinor'], $decimals ) . ' ' . __( 'VAT', 'sgs-blocks' );
		}
		return $out;
	}
	if ( 'inc-suffix' === $mode && '' !== $suffix ) {
		return sgs_configurator_format_minor( (int) $combo['priceMinor'], $decimals ) . ' ' . $suffix;
	}
	return sgs_configurator_format_minor( (int) $combo['priceMinor'], $decimals );
}

/**
 * The struck-through regular-price display string for a combo under a tax mode.
 *
 * @param array  $combo    Manifest combo (regularMinor / regularExMinor).
 * @param string $mode     Tax-display mode.
 * @param int    $decimals Currency decimals.
 * @return string
 */
function sgs_configurator_mode_regular( array $combo, string $mode, int $decimals ): string {
	$minor = ( 'ex-plus-vat' === $mode && isset( $combo['regularExMinor'] ) )
		? (int) $combo['regularExMinor']
		: (int) $combo['regularMinor'];
	return sgs_configurator_format_minor( $minor, $decimals );
}

/**
 * Per-unit price display string for a combo under a tax mode, e.g. "£1.04 per bar".
 *
 * Derived live (price ÷ divisor) — NEVER a stored price. Returns '' when the
 * variation has no divisor (>0) or no unit label, so the per-unit line is hidden.
 * The headline base mirrors sgs_configurator_mode_price(): ex-VAT in ex-plus-vat
 * mode, else the display price — so "per bar" matches the price shown above it.
 *
 * @param array  $combo    Manifest combo (priceMinor/exMinor/unitDivisor/unitLabel).
 * @param string $mode     Tax-display mode ('auto'|'inc-suffix'|'ex-plus-vat').
 * @param int    $decimals Currency decimals.
 * @param string $template Translated "per %s" template (e.g. from __() ).
 * @return string
 */
function sgs_configurator_per_unit_display( array $combo, string $mode, int $decimals, string $template ): string {
	$divisor = isset( $combo['unitDivisor'] ) ? (float) $combo['unitDivisor'] : 0.0;
	$label   = isset( $combo['unitLabel'] ) ? (string) $combo['unitLabel'] : '';
	if ( $divisor <= 0 || '' === $label ) {
		return '';
	}
	$base_minor     = ( 'ex-plus-vat' === $mode && isset( $combo['exMinor'] ) ) ? (int) $combo['exMinor'] : (int) $combo['priceMinor'];
	$per_unit_minor = (int) round( $base_minor / $divisor );
	return sgs_configurator_format_minor( $per_unit_minor, $decimals ) . ' ' . sprintf( $template, $label );
}

/**
 * Plain-text saving label for one row of the comparative value ladder (Spec 28 P1).
 *
 * Returns '' in any of these cases:
 *  - The anchor is not a genuine single price (!$anchor_is_genuine_single).
 *  - The saving is zero or negative (no false claim).
 *  - framing_mode is 'neutral'.
 *
 * Rule of 100:
 *  - anchor >= 100p → whole-percent saving, FLOORED (never overstates).
 *  - anchor < 100p  → pence saving, rounded to nearest integer.
 *
 * For sub-£1 anchors (< 100p) with framing 'loss-aversion', a tail is
 * appended: " vs sale price" when $is_active_sale, else " vs buying singly".
 * Framing 'savings' omits the tail.
 *
 * The unit label is NOT embedded — the caller renders it separately.
 * All strings use __() with text domain 'sgs-blocks'.
 *
 * @param int    $anchor_per_unit_pence Per-unit price of the anchor (pence).
 * @param int    $pack_per_unit_pence   Per-unit price of this pack (pence).
 * @param string $framing_mode         'savings' | 'loss-aversion' | 'neutral'.
 * @param bool   $anchor_is_genuine_single True when owner has set a real single-item price.
 * @param bool   $is_active_sale        True when the active WC price is a sale price.
 * @return string Plain text saving label, or '' when no claim should be shown.
 */
function sgs_saving_display( int $anchor_per_unit_pence, int $pack_per_unit_pence, string $framing_mode, bool $anchor_is_genuine_single, bool $is_active_sale ): string {
	// FR-28-16: no claim when the anchor is not a genuine single-item price.
	if ( ! $anchor_is_genuine_single ) {
		return '';
	}

	// Neutral framing suppresses all saving strings.
	if ( 'neutral' === $framing_mode ) {
		return '';
	}

	$saving_each = max( 0, $anchor_per_unit_pence - $pack_per_unit_pence );

	// No positive saving → no string.
	if ( $saving_each <= 0 ) {
		return '';
	}

	// Rule of 100 (PD-4): anchor >= £1 (100p) → whole-percent, floored;
	// anchor < £1 → pence saving.
	if ( $anchor_per_unit_pence >= 100 ) {
		// Exact integer floor (PD-4: floor so we never OVERSTATE). intdiv avoids the
		// float-imprecision that makes floor((29/100)*100) collapse to 28 — both
		// floor, but intdiv on the already-integer pence is exact (gives a true 29%).
		$pct = intdiv( $saving_each * 100, $anchor_per_unit_pence );
		if ( $pct <= 0 ) {
			return '';
		}
		/* translators: %d is a whole-number percentage, e.g. "save 17%". */
		return sprintf( __( 'save %d%%', 'sgs-blocks' ), $pct );
	}

	// Sub-£1 anchor: display saving in pence.
	$pence = (int) round( $saving_each );
	if ( $pence <= 0 ) {
		return '';
	}

	/* translators: %d is a whole-number pence amount, e.g. "save 8p each". */
	$base = sprintf( __( 'save %dp each', 'sgs-blocks' ), $pence );

	// Loss-aversion framing appends a contextual tail.
	if ( 'loss-aversion' === $framing_mode ) {
		if ( $is_active_sale ) {
			/* translators: Appended to a saving label, e.g. "save 8p each vs sale price". */
			return $base . ' ' . __( 'vs sale price', 'sgs-blocks' );
		}
		/* translators: Appended to a saving label, e.g. "save 8p each vs buying singly". */
		return $base . ' ' . __( 'vs buying singly', 'sgs-blocks' );
	}

	// 'savings' framing: base string only, no tail.
	return $base;
}

/**
 * Build a sorted, deduplicated comparative value ladder for a product's combos (Spec 28 P1).
 *
 * Collapses to ONE row per distinct unitDivisor value: where multiple combos share
 * the same divisor (e.g. different flavours of the same pack size), the lowest-priced
 * combo in that group is used.
 *
 * Rows are sorted by unitDivisor ascending (smallest pack first).
 *
 * Per-unit calculation mirrors sgs_configurator_per_unit_display() exactly:
 *  - ex-plus-vat mode: use exMinor when present, else fall back to priceMinor.
 *  - all other modes: use priceMinor.
 *
 * Anchor:
 *  - $base_pence > 0: the owner-set single-item reference price (genuine anchor).
 *  - $base_pence null or 0: smallest row's per-unit is the anchor; no genuine-single claim.
 *
 * Monotonicity guard (PD-5): a row whose per-unit is NOT strictly less than the
 * previous row's per-unit is marked suppressed=true; its saving_display is set to ''
 * and it cannot be is_target.
 *
 * Target (PD-5): the LARGEST non-suppressed row with a positive saving. When
 * $decoy_enabled is true the target is the 2nd-largest such row instead.
 * If no qualifying row exists, no row carries is_target=true.
 *
 * row_label: uses $combo['termLabel'] when the caller has enriched the combo with a
 * size-attribute term name; otherwise falls back to (string)(int)round(unitDivisor).
 *
 * Combos missing unitDivisor or priceMinor are silently skipped (no PHP warning).
 *
 * @param array    $combos       Associative array of manifest combos (keyed by combo key).
 * @param int|null $base_pence   Owner-set single-item reference price in pence, or null/0.
 * @param string   $framing_mode Saving-label style: 'savings' | 'loss-aversion' | 'neutral'.
 * @param bool     $decoy_enabled When true, badge targets the 2nd-largest qualifying row.
 * @param string   $tax_mode     Tax-display mode ('auto' | 'inc-suffix' | 'ex-plus-vat').
 * @param int      $decimals     Currency decimal places (from manifest).
 * @return array Ordered list of row arrays, each containing:
 *               pack (int), per_unit_pence (int), per_unit_display (string),
 *               saving_display (string), is_target (bool), suppressed (bool),
 *               is_active_sale (bool), row_label (string).
 */
function sgs_value_ladder( array $combos, ?int $base_pence, string $framing_mode, bool $decoy_enabled, string $tax_mode, int $decimals ): array {
	// ── 1. Collapse to lowest-priced combo per distinct unitDivisor ─────────
	// Keyed by the STRING form of the divisor: a float array key is truncated to
	// int by PHP (so 12.5 and 12.9 would collide) and triggers an 8.1 deprecation.
	// String keys preserve fractional/weight-based sizes; the real float divisor is
	// stored inside each entry for sorting + row labelling.
	$by_divisor = array(); // (string) $divisor → ['min_per_unit'=>int,'combo'=>array,'divisor'=>float].

	foreach ( $combos as $combo ) {
		// Skip combos missing required fields.
		if ( ! isset( $combo['unitDivisor'], $combo['priceMinor'] ) ) {
			continue;
		}
		$divisor = (float) $combo['unitDivisor'];
		if ( $divisor <= 0 ) {
			continue;
		}
		$dkey = (string) $divisor;

		// Resolve the price basis (mirrors sgs_configurator_per_unit_display).
		$base_minor = ( 'ex-plus-vat' === $tax_mode && isset( $combo['exMinor'] ) )
			? (int) $combo['exMinor']
			: (int) $combo['priceMinor'];

		$per_unit = (int) round( $base_minor / $divisor );

		if ( ! isset( $by_divisor[ $dkey ] ) || $per_unit < $by_divisor[ $dkey ]['min_per_unit'] ) {
			$by_divisor[ $dkey ] = array(
				'min_per_unit' => $per_unit,
				'combo'        => $combo,
				'divisor'      => $divisor,
			);
		}
	}

	if ( empty( $by_divisor ) ) {
		return array();
	}

	// ── 2. Sort by divisor ascending (smallest pack first) ──────────────────
	ksort( $by_divisor, SORT_NUMERIC );

	// ── 3. Resolve anchor ────────────────────────────────────────────────────
	$anchor_is_genuine_single = ( is_int( $base_pence ) && $base_pence > 0 );
	if ( $anchor_is_genuine_single ) {
		$anchor_per_unit = $base_pence;
	} else {
		// Fallback: smallest row's per-unit.
		$first           = reset( $by_divisor );
		$anchor_per_unit = $first['min_per_unit'];
	}

	// ── 4. Build raw rows (no suppression or target yet) ────────────────────
	$rows = array();
	foreach ( $by_divisor as $entry ) {
		$divisor   = $entry['divisor'];
		$combo     = $entry['combo'];
		$per_unit  = $entry['min_per_unit'];
		$is_sale   = isset( $combo['saleMinor'] ) && null !== $combo['saleMinor'];
		$row_label = ( isset( $combo['termLabel'] ) && '' !== (string) $combo['termLabel'] )
			? (string) $combo['termLabel']
			: (string) (int) round( $divisor );

		$rows[] = array(
			'divisor'          => $divisor,
			'pack'             => (int) round( $divisor ),
			'per_unit_pence'   => $per_unit,
			'per_unit_display' => sgs_configurator_format_minor( $per_unit, $decimals ),
			'is_active_sale'   => $is_sale,
			'row_label'        => $row_label,
			// saving_display + suppressed + is_target resolved in the next passes.
			'saving_display'   => '',
			'suppressed'       => false,
			'is_target'        => false,
		);
	}

	// ── 5. Monotonicity guard (suppression pass) ─────────────────────────────
	$prev_per_unit = null;
	foreach ( $rows as $i => &$row ) {
		if ( null !== $prev_per_unit && $row['per_unit_pence'] >= $prev_per_unit ) {
			$row['suppressed'] = true;
		}
		if ( ! $row['suppressed'] ) {
			$prev_per_unit = $row['per_unit_pence'];
		}
	}
	unset( $row );

	// ── 6. Saving-display pass (only non-suppressed rows) ────────────────────
	foreach ( $rows as &$row ) {
		if ( $row['suppressed'] ) {
			continue;
		}
		$row['saving_display'] = sgs_saving_display(
			$anchor_per_unit,
			$row['per_unit_pence'],
			$framing_mode,
			$anchor_is_genuine_single,
			$row['is_active_sale']
		);
	}
	unset( $row );

	// ── 7. Target selection (PD-5) ───────────────────────────────────────────
	// Collect non-suppressed rows with a positive saving, largest divisor last.
	$qualifying_indices = array();
	foreach ( $rows as $i => $row ) {
		if ( ! $row['suppressed'] && '' !== $row['saving_display'] ) {
			$qualifying_indices[] = $i;
		}
	}

	if ( ! empty( $qualifying_indices ) ) {
		// Qualifying list is already in ascending order (rows sorted by divisor asc).
		// Largest = last; 2nd-largest = second-to-last.
		if ( $decoy_enabled && count( $qualifying_indices ) >= 2 ) {
			$target_index = $qualifying_indices[ count( $qualifying_indices ) - 2 ];
		} else {
			$target_index = end( $qualifying_indices );
		}
		$rows[ $target_index ]['is_target'] = true;
	}

	// ── 8. Strip the internal 'divisor' key before returning ─────────────────
	foreach ( $rows as &$row ) {
		unset( $row['divisor'] );
	}
	unset( $row );

	return $rows;
}

if ( ! function_exists( 'sgs_sanitize_grid_template' ) ) {
	/**
	 * Sanitise a CSS grid-template-columns value for safe inline-style emission.
	 *
	 * Allows: digits, letters, whitespace, percent, parens, commas, dashes.
	 * Forbids: semicolons, braces, quotes, angle brackets, slashes.
	 * Strips: anything else.
	 *
	 * @param string $value Raw attribute value.
	 * @return string Sanitised CSS fragment.
	 */
	function sgs_sanitize_grid_template( $value ) {
		$value = (string) $value;
		// Keep only characters that can appear in a legitimate grid-template-columns value.
		$value = preg_replace( '/[^A-Za-z0-9\s%(),.\-]/', '', $value );
		return trim( $value );
	}
}

if ( ! function_exists( 'sgs_container_gap_value' ) ) {
	/**
	 * Resolve a gap attribute value to a safe CSS declaration fragment (the part after "gap:").
	 *
	 * Slug vs raw-length detection rule:
	 *   - A BARE SLUG is a value whose characters are ALL digits (e.g. "40", "80").
	 *     WP spacing-preset slugs are numeric keys. These are wrapped in
	 *     var(--wp--preset--spacing--SLUG) for back-compat with existing posts.
	 *   - A RAW CSS LENGTH contains at least one unit character (a–z) or a percent sign
	 *     (e.g. "16px", "1.5rem", "2vw", "50%"). These are emitted directly.
	 *     Sanitised: only [0-9], [.], unit letters [a-z], and [%] are kept; everything
	 *     else (semicolons, braces, quotes) is stripped — no injection path.
	 *
	 * @param string $gap Raw gap attribute value from block attributes.
	 * @return string CSS value fragment safe to emit after "gap:", or empty string on failure.
	 */
	function sgs_container_gap_value( $gap ) {
		$gap = (string) $gap;
		if ( '' === $gap ) {
			return '';
		}

		// Bare slug: digits only → wrap in WP spacing-preset var().
		if ( preg_match( '/^\d+$/', $gap ) ) {
			return 'var(--wp--preset--spacing--' . esc_attr( $gap ) . ')';
		}

		// Raw CSS length: contains at least one letter or percent (i.e. a unit).
		// Sanitise — keep only characters that can appear in a CSS length value.
		// Allowlist: digits, dot, a–z (covers px/rem/em/vw/vh/ch/ex etc.), percent.
		// Rejects: semicolons, braces, parentheses, quotes, slashes, angle brackets.
		$sanitised = preg_replace( '/[^0-9a-z.%]/', '', strtolower( $gap ) );
		if ( '' === $sanitised ) {
			return '';
		}

		return $sanitised;
	}
}

if ( ! function_exists( 'sgs_render_media' ) ) {
	/**
	 * Render an image or video from a unified SGS media-slot attribute.
	 *
	 * Used by any block that accepts both image and video in the same slot
	 * (Gap H-3 — "video everywhere image works"). Pairs with the JS
	 * MediaPicker component which produces the attribute shape this helper
	 * consumes.
	 *
	 * Expected $attrs shape:
	 *   - url           string  Asset URL (required — empty string => silent return).
	 *   - type          string  'image' | 'video'.
	 *   - alt           string  Alt text (image) or aria-label (video). Optional.
	 *   - id            int     Attachment ID (0 = external). Optional.
	 *   - mobile_url    string  Optional mobile-specific source (image only — emits <picture>).
	 *   - video_options array   Optional override for video flags. Keys:
	 *       autoplay (bool, default true)
	 *       loop     (bool, default true)
	 *       muted    (bool, default true)
	 *       controls (bool, default false)
	 *       playsinline (bool, default true)
	 *
	 * For images: emits a lazy-loaded <img> (or <picture> with mobile source).
	 * For videos: emits a <video> with safe defaults — autoplay, loop, muted,
	 * playsinline so the asset autoplays on mobile without a sound prompt.
	 * Empty url returns an empty string so the caller can render a fallback.
	 *
	 * @param array  $attrs   Media attributes (see shape above).
	 * @param string $context Block name for class scoping (e.g. 'sgs/hero').
	 * @return string HTML string, or '' if no url is provided.
	 */
	function sgs_render_media( $attrs, $context = '' ) {
		if ( empty( $attrs ) || ! is_array( $attrs ) ) {
			return '';
		}

		$url = isset( $attrs['url'] ) ? trim( (string) $attrs['url'] ) : '';
		if ( '' === $url ) {
			return '';
		}

		$type = isset( $attrs['type'] ) ? (string) $attrs['type'] : 'image';
		$alt  = isset( $attrs['alt'] ) ? (string) $attrs['alt'] : '';

		// Build a CSS-safe context slug for the class hook.
		$context_slug = preg_replace( '/[^a-z0-9-]/', '-', strtolower( (string) $context ) );
		$context_slug = trim( $context_slug, '-' );
		$context_cls  = '' !== $context_slug ? ' sgs-media--' . $context_slug : '';

		if ( 'video' === $type ) {
			$opts_in = isset( $attrs['video_options'] ) && is_array( $attrs['video_options'] )
				? $attrs['video_options']
				: array();
			$opts    = array_merge(
				array(
					'autoplay'    => true,
					'loop'        => true,
					'muted'       => true,
					'controls'    => false,
					'playsinline' => true,
				),
				$opts_in
			);

			$flags = '';
			if ( ! empty( $opts['autoplay'] ) ) {
				$flags .= ' autoplay';
			}
			if ( ! empty( $opts['loop'] ) ) {
				$flags .= ' loop';
			}
			if ( ! empty( $opts['muted'] ) ) {
				$flags .= ' muted';
			}
			if ( ! empty( $opts['playsinline'] ) ) {
				$flags .= ' playsinline';
			}
			if ( ! empty( $opts['controls'] ) ) {
				$flags .= ' controls';
			}

			// Resolve MIME from extension fallback if not explicit.
			$mime = isset( $attrs['mime'] ) && $attrs['mime'] ? (string) $attrs['mime'] : '';
			if ( '' === $mime ) {
				$ext  = strtolower( pathinfo( wp_parse_url( $url, PHP_URL_PATH ) ?? '', PATHINFO_EXTENSION ) );
				$map  = array(
					'mp4'  => 'video/mp4',
					'webm' => 'video/webm',
					'ogv'  => 'video/ogg',
					'mov'  => 'video/quicktime',
				);
				$mime = isset( $map[ $ext ] ) ? $map[ $ext ] : 'video/mp4';
			}

			$aria = '' !== $alt ? $alt : esc_attr__( 'Background video', 'sgs-blocks' );

			return sprintf(
				'<video class="sgs-media sgs-media--video%s"%s aria-label="%s"><source src="%s" type="%s"></video>',
				esc_attr( $context_cls ),
				$flags,
				esc_attr( $aria ),
				esc_url( $url ),
				esc_attr( $mime )
			);
		}

		// Image branch.
		$mobile_url = isset( $attrs['mobile_url'] ) ? trim( (string) $attrs['mobile_url'] ) : '';
		$img_class  = 'sgs-media sgs-media--image' . $context_cls;
		$img_tag    = sprintf(
			'<img src="%s" alt="%s" class="%s" loading="lazy" decoding="async" />',
			esc_url( $url ),
			esc_attr( $alt ),
			esc_attr( $img_class )
		);

		if ( '' !== $mobile_url ) {
			return sprintf(
				'<picture class="sgs-media-picture%s"><source media="(max-width: 767px)" srcset="%s" />%s</picture>',
				esc_attr( $context_cls ),
				esc_url( $mobile_url ),
				$img_tag
			);
		}

		return $img_tag;
	}
}

/**
 * Returns the wp_kses allowed-tags array for sanitising inline SVG markup.
 *
 * Covers the full set of SVG 1.1 + SVG 2 drawing, structural, and
 * presentation elements needed for animated logos. Strips script elements,
 * event-handler attributes (on*), and any HTML-only elements.
 *
 * Used by sgs/responsive-logo render.php when inlining a media-library SVG
 * for animation via Vivus Instant.
 *
 * @return array<string, array<string, bool>> Tag → allowed attributes map.
 */
function sgs_svg_kses_allowed_tags(): array {
	// Shared presentation attributes permitted on most SVG elements.
	$presentation_attrs = array(
		'id'                  => true,
		'class'               => true,
		'style'               => true,
		'fill'                => true,
		'fill-opacity'        => true,
		'fill-rule'           => true,
		'stroke'              => true,
		'stroke-dasharray'    => true,
		'stroke-dashoffset'   => true,
		'stroke-linecap'      => true,
		'stroke-linejoin'     => true,
		'stroke-miterlimit'   => true,
		'stroke-opacity'      => true,
		'stroke-width'        => true,
		'opacity'             => true,
		'transform'           => true,
		'clip-path'           => true,
		'clip-rule'           => true,
		'marker'              => true,
		'marker-end'          => true,
		'marker-mid'          => true,
		'marker-start'        => true,
		'filter'              => true,
		'mask'                => true,
		'display'             => true,
		'visibility'          => true,
		'color'               => true,
		'color-interpolation' => true,
		'color-rendering'     => true,
		'shape-rendering'     => true,
		'text-rendering'      => true,
		'image-rendering'     => true,
	);

	$core_attrs = array_merge(
		$presentation_attrs,
		array(
			'xml:space'   => true,
			'xml:lang'    => true,
			'xmlns'       => true,
			'xmlns:xlink' => true,
		)
	);

	return array(
		'svg'               => array_merge(
			$core_attrs,
			array(
				'viewbox'             => true,
				'viewBox'             => true,
				'width'               => true,
				'height'              => true,
				'x'                   => true,
				'y'                   => true,
				'version'             => true,
				'baseprofile'         => true,
				'preserveaspectratio' => true,
				'role'                => true,
				'aria-label'          => true,
				'aria-hidden'         => true,
				'focusable'           => true,
			)
		),
		'g'                 => $core_attrs,
		'defs'              => $core_attrs,
		'use'               => array_merge(
			$core_attrs,
			array(
				'xlink:href' => true,
				'href'       => true,
				'x'          => true,
				'y'          => true,
				'width'      => true,
				'height'     => true,
			)
		),
		'symbol'            => array_merge(
			$core_attrs,
			array(
				'viewbox' => true,
				'viewBox' => true,
				'width'   => true,
				'height'  => true,
				'x'       => true,
				'y'       => true,
			)
		),
		'path'              => array_merge(
			$core_attrs,
			array(
				'd'          => true,
				'pathLength' => true,
			)
		),
		'rect'              => array_merge(
			$core_attrs,
			array(
				'x'      => true,
				'y'      => true,
				'width'  => true,
				'height' => true,
				'rx'     => true,
				'ry'     => true,
			)
		),
		'circle'            => array_merge(
			$core_attrs,
			array(
				'cx' => true,
				'cy' => true,
				'r'  => true,
			)
		),
		'ellipse'           => array_merge(
			$core_attrs,
			array(
				'cx' => true,
				'cy' => true,
				'rx' => true,
				'ry' => true,
			)
		),
		'line'              => array_merge(
			$core_attrs,
			array(
				'x1' => true,
				'y1' => true,
				'x2' => true,
				'y2' => true,
			)
		),
		'polyline'          => array_merge( $core_attrs, array( 'points' => true ) ),
		'polygon'           => array_merge( $core_attrs, array( 'points' => true ) ),
		'text'              => array_merge(
			$core_attrs,
			array(
				'x'              => true,
				'y'              => true,
				'dx'             => true,
				'dy'             => true,
				'text-anchor'    => true,
				'font-size'      => true,
				'font-family'    => true,
				'font-weight'    => true,
				'letter-spacing' => true,
			)
		),
		'tspan'             => array_merge(
			$core_attrs,
			array(
				'x'  => true,
				'y'  => true,
				'dx' => true,
				'dy' => true,
			)
		),
		'textpath'          => array_merge(
			$core_attrs,
			array(
				'xlink:href'  => true,
				'href'        => true,
				'startoffset' => true,
				'method'      => true,
				'spacing'     => true,
			)
		),
		'image'             => array_merge(
			$core_attrs,
			array(
				'x'                   => true,
				'y'                   => true,
				'width'               => true,
				'height'              => true,
				'href'                => true,
				'xlink:href'          => true,
				'preserveaspectratio' => true,
			)
		),
		'clippath'          => array_merge( $core_attrs, array( 'clippathunits' => true ) ),
		'mask'              => array_merge(
			$core_attrs,
			array(
				'x'                => true,
				'y'                => true,
				'width'            => true,
				'height'           => true,
				'maskunits'        => true,
				'maskcontentunits' => true,
			)
		),
		'marker'            => array_merge(
			$core_attrs,
			array(
				'viewbox'      => true,
				'viewBox'      => true,
				'markerwidth'  => true,
				'markerheight' => true,
				'markerunits'  => true,
				'orient'       => true,
				'refx'         => true,
				'refy'         => true,
			)
		),
		'pattern'           => array_merge(
			$core_attrs,
			array(
				'x'                   => true,
				'y'                   => true,
				'width'               => true,
				'height'              => true,
				'patternunits'        => true,
				'patterncontentunits' => true,
				'patterntransform'    => true,
				'viewbox'             => true,
				'viewBox'             => true,
			)
		),
		'lineargradient'    => array_merge(
			$core_attrs,
			array(
				'x1'                => true,
				'y1'                => true,
				'x2'                => true,
				'y2'                => true,
				'gradientunits'     => true,
				'gradienttransform' => true,
				'spreadmethod'      => true,
				'xlink:href'        => true,
				'href'              => true,
			)
		),
		'radialgradient'    => array_merge(
			$core_attrs,
			array(
				'cx'                => true,
				'cy'                => true,
				'r'                 => true,
				'fx'                => true,
				'fy'                => true,
				'gradientunits'     => true,
				'gradienttransform' => true,
				'spreadmethod'      => true,
				'xlink:href'        => true,
				'href'              => true,
			)
		),
		'stop'              => array_merge(
			$core_attrs,
			array(
				'offset'       => true,
				'stop-color'   => true,
				'stop-opacity' => true,
			)
		),
		'filter'            => array_merge(
			$core_attrs,
			array(
				'x'              => true,
				'y'              => true,
				'width'          => true,
				'height'         => true,
				'filterunits'    => true,
				'primitiveunits' => true,
			)
		),
		'feblend'           => array_merge(
			$core_attrs,
			array(
				'in'     => true,
				'in2'    => true,
				'mode'   => true,
				'result' => true,
			)
		),
		'fecolormatrix'     => array_merge(
			$core_attrs,
			array(
				'in'     => true,
				'type'   => true,
				'values' => true,
				'result' => true,
			)
		),
		'fecomposite'       => array_merge(
			$core_attrs,
			array(
				'in'       => true,
				'in2'      => true,
				'operator' => true,
				'k1'       => true,
				'k2'       => true,
				'k3'       => true,
				'k4'       => true,
				'result'   => true,
			)
		),
		'fedisplacementmap' => array_merge(
			$core_attrs,
			array(
				'in'               => true,
				'in2'              => true,
				'scale'            => true,
				'xchannelselector' => true,
				'ychannelselector' => true,
				'result'           => true,
			)
		),
		'fegaussianblur'    => array_merge(
			$core_attrs,
			array(
				'in'           => true,
				'stddeviation' => true,
				'result'       => true,
			)
		),
		'femerge'           => $core_attrs,
		'femergenode'       => array_merge( $core_attrs, array( 'in' => true ) ),
		'feoffset'          => array_merge(
			$core_attrs,
			array(
				'in'     => true,
				'dx'     => true,
				'dy'     => true,
				'result' => true,
			)
		),
		'title'             => array( 'id' => true ),
		'desc'              => array( 'id' => true ),
		'metadata'          => array( 'id' => true ),
		'a'                 => array_merge(
			$core_attrs,
			array(
				'href'       => true,
				'xlink:href' => true,
				'target'     => true,
			)
		),
	);
}
