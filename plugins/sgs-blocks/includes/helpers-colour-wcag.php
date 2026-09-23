<?php
/**
 * WCAG colour-contrast helpers for SGS block server-side rendering.
 *
 * Provides sgs_wcag_relative_luminance(), sgs_wcag_white_wins_for_luminance(),
 * sgs_wcag_text_colour_for_bg(), sgs_resolve_palette_hex(), and
 * sgs_colour_background_tone() — WCAG 2.1 relative luminance, the shared
 * black/white contrast decision, auto-contrast text colour, palette-slug
 * resolution, and the dark/light classification of one solid background
 * colour (D1, 2026-09-23). The multi-layer surface-tone resolver that builds
 * on this (D2 — gradients, overlays, images) lives in
 * helpers-surface-tone.php, which sgs_colour_background_tone() also depends
 * on for sgs_colour_resolve_hex_alpha() (both files are always loaded
 * together via render-helpers.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-colour-parse.php';

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
 * Whether white beats black for WCAG contrast against a background of the given
 * relative luminance (WCAG 2.1 §1.4.3: ratio = (L_lighter+0.05)/(L_darker+0.05);
 * prefer the candidate reaching >= 4.5:1, else the higher ratio). The shared
 * decision behind sgs_wcag_text_colour_for_bg() (text) and a gradient's
 * mean-luminance tone (D2/D1, 2026-09-23), so both read one rule.
 *
 * @param float $l_bg Relative luminance of the background, in [0.0, 1.0].
 * @return bool True when white wins the contrast decision.
 */
function sgs_wcag_white_wins_for_luminance( float $l_bg ): bool {
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
		return false;
	}
	if ( $white_passes && ! $black_passes ) {
		return true;
	}

	// Both pass (or neither — mid-grey edge case): pick the higher ratio.
	return $ratio_with_white > $ratio_with_black;
}

/**
 * Return `#000` or `#fff` — whichever gives the higher WCAG contrast ratio
 * against the supplied background hex colour.
 *
 * Guard: invalid hex → `#000` (safe fallback — dark text on unknown BG).
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

	return sgs_wcag_white_wins_for_luminance( $l_bg ) ? '#fff' : '#000';
}

/**
 * Return a PREFERRED foreground colour when it meets WCAG AA (>= 4.5:1)
 * against the given background; otherwise degrade to the binary `#000`/`#fff`
 * auto-contrast fallback (sgs_wcag_text_colour_for_bg()).
 *
 * Lets a client's own token (e.g. the `text` palette slug) win over the
 * generic black/white pairing WHEN it is legible on the resolved background —
 * without ever risking a contrast failure: an unresolvable or failing
 * preferred colour silently falls back to the guaranteed-safe binary choice.
 * No per-client branching — the same rule runs for every palette.
 *
 * @param string $bg_hex        Background colour, hex.
 * @param string $preferred_hex Preferred foreground colour, hex (e.g. the
 *                               resolved `text` token). Empty string skips the
 *                               preference and returns the binary fallback.
 * @return string Hex colour — $preferred_hex when it passes AA, else '#000'/'#fff'.
 */
function sgs_wcag_preferred_text_colour_for_bg( string $bg_hex, string $preferred_hex ): string {
	if ( '' === $preferred_hex ) {
		return sgs_wcag_text_colour_for_bg( $bg_hex );
	}

	$l_bg = sgs_wcag_relative_luminance( $bg_hex );
	$l_fg = sgs_wcag_relative_luminance( $preferred_hex );

	if ( $l_bg < 0 || $l_fg < 0 ) {
		return sgs_wcag_text_colour_for_bg( $bg_hex );
	}

	$lighter = max( $l_bg, $l_fg );
	$darker  = min( $l_bg, $l_fg );
	$ratio   = ( $lighter + 0.05 ) / ( $darker + 0.05 );

	return $ratio >= 4.5 ? $preferred_hex : sgs_wcag_text_colour_for_bg( $bg_hex );
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
 * Classify a SOLID background colour value as dark or light.
 *
 * Accepts every form sgs_colour_resolve_hex_alpha() resolves (hex 3/6/8, `rgb()`/
 * `rgba()`, `black`/`white`, a palette slug or `var(--wp--preset--color--SLUG)`);
 * an 8-digit hex's or rgba()'s alpha is ignored here — this judges the COLOUR
 * only, never a composited result (that is sgs_surface_tone()'s job, D2).
 *
 * Dark/light is ONE definition, shared with text legibility (D1, 2026-09-23):
 * `dark` when white text would be chosen (sgs_wcag_text_colour_for_bg() ===
 * '#fff'), `light` when black would. A surface a designer would put white text
 * on is a surface a black shadow disappears on.
 *
 * Anything else returns '' and never throws or emits: empty, `transparent`,
 * `inherit`, `currentColor`, a gradient, an unknown slug, or junk.
 *
 * @param string $value Background colour value as stored in a block attribute.
 * @return string 'dark', 'light', or '' when the value is not one solid known colour.
 */
function sgs_colour_background_tone( string $value ): string {
	$value = trim( $value );

	if ( '' === $value ) {
		return '';
	}

	$parsed = sgs_colour_resolve_hex_alpha( $value );
	if ( '' === $parsed['hex'] ) {
		return '';
	}

	// A resolved palette entry can itself be a gradient or CSS variable: the
	// luminance helper returns -1.0 for anything that is not a plain hex.
	$luminance = sgs_wcag_relative_luminance( $parsed['hex'] );
	if ( $luminance < 0 ) {
		return '';
	}

	return sgs_wcag_white_wins_for_luminance( $luminance ) ? 'dark' : 'light';
}

/**
 * Whether a SOLID background colour value is dark (see sgs_colour_background_tone()).
 *
 * @param string $value Background colour value as stored in a block attribute.
 * @return bool True only when the value resolves to a dark solid colour.
 */
function sgs_colour_is_dark_background( string $value ): bool {
	return 'dark' === sgs_colour_background_tone( $value );
}
