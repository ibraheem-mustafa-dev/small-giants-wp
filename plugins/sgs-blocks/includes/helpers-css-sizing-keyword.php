<?php
/**
 * CSS sizing-keyword allowance for the shared container wrapper's length sanitiser.
 *
 * SGS_Container_Wrapper's `$sgs_css_length` closure strips every character
 * except [A-Za-z0-9.%] so a length can never break out of its declaration. That
 * also removes the hyphen and the parentheses, so the CSS intrinsic sizing
 * keywords stopped working: `max-content` became `maxcontent` (invalid CSS, the
 * browser drops the declaration) and `fit-content(320px)` became
 * `fitcontent320px`. A draft that sets `width: max-content` on a row therefore
 * lost the value on the way to the page.
 *
 * sgs_css_sizing_keyword() recognises exactly four shapes, by whole-string
 * match, and returns the canonical lower-case form. Anything else returns ''
 * and the caller falls through to its existing strip, so no other value changes
 * meaning and an injection attempt such as `max-content;}body{display:none}`
 * never matches (it stays on the strip path, which removes the breakout
 * characters).
 *
 * Universal: no per-block condition. Every property the wrapper sanitises with
 * `$sgs_css_length` (max-width, min-height, contentWidth, padding, margin, ...)
 * gets the same treatment; a keyword that is meaningless for a given property
 * (for example `padding: max-content`) is simply dropped by the browser, exactly
 * as the previous `maxcontent` was.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_css_sizing_keyword' ) ) {
	/**
	 * Return a CSS intrinsic sizing keyword in canonical form, or '' when the value is not one.
	 *
	 * Accepted (case-insensitive, surrounding whitespace ignored): `max-content`,
	 * `min-content`, `fit-content`, and `fit-content(<length-percentage>)` where the
	 * argument is a plain number with an optional unit (`fit-content(320px)`,
	 * `fit-content(50%)`, `fit-content(0)`). A non-zero unitless argument is
	 * invalid CSS and is refused.
	 *
	 * @param mixed $value Raw attribute value.
	 * @return string Canonical keyword, or '' when the value is not a sizing keyword.
	 */
	function sgs_css_sizing_keyword( $value ): string {
		if ( ! is_scalar( $value ) ) {
			return '';
		}

		$v = strtolower( trim( (string) $value ) );

		if ( 'max-content' === $v || 'min-content' === $v || 'fit-content' === $v ) {
			return $v;
		}

		$units = 'px|em|rem|ex|ch|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cqw|cqh|cqi|cqb|cm|mm|in|pt|pc|%';
		if ( ! preg_match( '/^fit-content\(\s*(\d+(?:\.\d+)?|\.\d+)(' . $units . ')?\s*\)$/', $v, $m ) ) {
			return '';
		}

		$unit = $m[2] ?? '';
		if ( '' === $unit && 0.0 !== (float) $m[1] ) {
			return '';
		}

		return 'fit-content(' . $m[1] . $unit . ')';
	}
}

if ( ! function_exists( 'sgs_css_length_or_sizing_keyword' ) ) {
	/**
	 * Sanitise a CSS length, letting the intrinsic sizing keywords through intact.
	 *
	 * A sizing keyword is returned in canonical form; every other value gets the
	 * wrapper's long-standing strip (digits, letters, dot, percent only), so the
	 * result for a non-keyword is byte-identical to what the wrapper produced
	 * before this helper existed.
	 *
	 * @param mixed $value Raw attribute value.
	 * @return string Safe CSS length fragment (may be '').
	 */
	function sgs_css_length_or_sizing_keyword( $value ): string {
		$keyword = sgs_css_sizing_keyword( $value );
		if ( '' !== $keyword ) {
			return $keyword;
		}

		return (string) preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
	}
}
