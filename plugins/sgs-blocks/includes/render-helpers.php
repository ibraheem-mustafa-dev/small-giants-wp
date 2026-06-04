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
