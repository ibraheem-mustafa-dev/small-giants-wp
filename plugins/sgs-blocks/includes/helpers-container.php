<?php
/**
 * Container layout helpers for SGS block server-side rendering.
 *
 * Provides sgs_sanitize_grid_template() and sgs_container_gap_value() —
 * sanitising CSS grid-template-columns values and resolving gap attribute
 * values to safe CSS fragments.
 *
 * Both functions are guarded with function_exists() wrappers so that
 * class-sgs-container-wrapper.php (which also defines them) can be loaded
 * in any order without fatal redeclaration errors.
 *
 * @package SGS\Blocks
 */

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

if ( ! function_exists( 'sgs_serialise_box_sides' ) ) {
	/**
	 * Serialise a 4-side box-object attr ({top,right,bottom,left}) to a CSS
	 * padding shorthand string ("top right bottom left"). Neutral: an empty
	 * or absent box returns '' (matches the pre-migration empty-string
	 * default so callers' existing `'' !== $value` guards stay unchanged).
	 *
	 * Thin wrapper over sgs_box_object_shorthand() (helpers-box.php) — that
	 * helper fills an unset side with '0' when at least one side IS set;
	 * this wrapper only adds the null→'' normalisation for string-typed
	 * callers (e.g. class-sgs-container-wrapper.php's grid-item defaults).
	 *
	 * @param mixed $box Box object (array) or legacy scalar/empty value.
	 * @return string CSS shorthand, or '' when nothing is set.
	 */
	function sgs_serialise_box_sides( $box ): string {
		if ( ! is_array( $box ) ) {
			// Defensive: a legacy string value read from an old post still renders as-is.
			return (string) $box;
		}
		$shorthand = function_exists( 'sgs_box_object_shorthand' ) ? sgs_box_object_shorthand( $box ) : null;
		return null === $shorthand ? '' : $shorthand;
	}
}

if ( ! function_exists( 'sgs_serialise_box_corners' ) ) {
	/**
	 * Serialise a 4-corner box-object attr
	 * ({topLeft,topRight,bottomLeft,bottomRight}) to a CSS border-radius
	 * shorthand string. CSS border-radius shorthand order is
	 * TL TR BR BL (NOT TL TR BL BR — a common transcription error).
	 * Neutral: an empty or absent object returns ''.
	 *
	 * @param mixed $box Corner object (array) or legacy scalar/empty value.
	 * @return string CSS shorthand, or '' when nothing is set.
	 */
	function sgs_serialise_box_corners( $box ): string {
		if ( ! is_array( $box ) ) {
			// Defensive: a legacy string value read from an old post still renders as-is.
			return (string) $box;
		}
		$top_left     = sgs_css_length_sanitise( $box['topLeft'] ?? '' );
		$top_right    = sgs_css_length_sanitise( $box['topRight'] ?? '' );
		$bottom_left  = sgs_css_length_sanitise( $box['bottomLeft'] ?? '' );
		$bottom_right = sgs_css_length_sanitise( $box['bottomRight'] ?? '' );
		if ( '' === $top_left && '' === $top_right && '' === $bottom_left && '' === $bottom_right ) {
			return '';
		}
		// CSS order: top-left top-right bottom-right bottom-left.
		return ( '' !== $top_left ? $top_left : '0' ) . ' '
			. ( '' !== $top_right ? $top_right : '0' ) . ' '
			. ( '' !== $bottom_right ? $bottom_right : '0' ) . ' '
			. ( '' !== $bottom_left ? $bottom_left : '0' );
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
		// Sanitise — keep only characters that can appear in a CSS gap value.
		// Allowlist: digits, dot, a–z (covers px/rem/em/vw/vh/ch/ex etc.), percent,
		// AND space — a two-value gap is "row-gap col-gap" (e.g. "16px 12px"); the
		// space MUST survive or the value collapses to invalid CSS ("16px12px").
		// Rejects: semicolons, braces, parentheses, quotes, slashes, angle brackets.
		$sanitised = preg_replace( '/[^0-9a-z.% ]/', '', strtolower( $gap ) );
		$sanitised = trim( preg_replace( '/\s+/', ' ', $sanitised ) );
		if ( '' === $sanitised ) {
			return '';
		}

		return $sanitised;
	}
}
