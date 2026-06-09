<?php
/**
 * WCAG colour-contrast helpers for SGS block server-side rendering.
 *
 * Provides sgs_wcag_relative_luminance(), sgs_wcag_text_colour_for_bg(), and
 * sgs_resolve_palette_hex() — computing WCAG 2.1 relative luminance and
 * auto-contrast text colour, and resolving theme palette slugs to hex values.
 *
 * @package SGS\Blocks
 */

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
