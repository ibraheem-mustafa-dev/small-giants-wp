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
