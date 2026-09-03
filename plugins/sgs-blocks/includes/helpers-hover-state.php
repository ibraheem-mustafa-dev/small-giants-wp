<?php
/**
 * Touch-safe hover emission — the ONE place a `:hover` rule is built.
 *
 * THE PROBLEM. Every SGS paint helper emitted `{sel}:hover` unconditionally.
 * On a touchscreen a tap engages `:hover` and it STICKS until the user taps
 * something else — the client reports it as "I tap it and the colour won't go
 * back", indistinguishable from a broken control. This framework is
 * mobile-first and the colour programme (D752) multiplies hover across
 * roughly 250 rows, so the cause is fixed here rather than at 250 call sites.
 *
 * TWO LAYERS, CSS FIRST (Bean-ruled 2026-09-03).
 *
 * 1. CSS — `@media (hover: hover) and (pointer: fine)`. Needs no JavaScript,
 *    so it works on a page that ships none, and it fixes phones and pure-touch
 *    tablets outright.
 *
 * 2. JS — a reactive `.sgs-touch-input` class on `<html>`, driven by the
 *    pointer type of the most recent `pointerdown`. This is PROGRESSIVE
 *    ENHANCEMENT: layer 1 already works without it.
 *
 * ⛔ WHY LAYER 2 EXISTS AT ALL, AND WHY LAYER 1 IS NOT ENOUGH ON ITS OWN.
 * `src/shared/effects/motion-utils.js`'s own module docblock records the
 * measured reason, and it is this framework's settled position: the media
 * feature describes the device's PRIMARY pointer ONLY. A hybrid — a
 * touchscreen laptop, a Surface, an iPad with a trackpad — reports
 * hover-capable and KEEPS reporting it for the whole session even while it is
 * being poked with a finger. So layer 1 alone leaves every hybrid device with
 * the sticky-hover bug. Layer 2 closes that, reactively, because a one-time
 * capability check is the wrong gate. Do not delete either layer believing
 * the other covers it — they cover different devices.
 *
 * ⚠ `:focus-visible` and `:focus-within` are KEYBOARD-reachable and MUST stay
 * OUTSIDE both guards. A keyboard user on a touchscreen laptop still needs the
 * focus state. Every caller therefore splits its hover selector from its focus
 * selector rather than emitting the single combined rule it used to.
 *
 * ⚠ The touch guard is wrapped in `:where()` so it contributes ZERO
 * specificity. A hover rule must keep out-ranking its own resting rule by the
 * `:hover` pseudo-class alone, exactly as before this file existed — a rule
 * that silently loses is indistinguishable from one that is absent.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

/** The pointer-capability media query. Layer 1. */
const SGS_HOVER_MEDIA = '@media (hover: hover) and (pointer: fine)';

/** Zero-specificity guard against the reactive touch class. Layer 2. */
const SGS_HOVER_NOT_TOUCH = ':where(:root:not(.sgs-touch-input))';

if ( ! function_exists( 'sgs_hover_guarded_rule' ) ) {
	/**
	 * Wrap a hover-only rule in both guards.
	 *
	 * Pass ONLY selectors carrying `:hover`. Focus selectors must be emitted
	 * separately by the caller, unguarded.
	 *
	 * @param string $hover_selector One or more comma-separated `:hover` selectors.
	 * @param string $decls          CSS declarations, no braces.
	 * @return string A complete guarded rule, or '' when either input is empty.
	 */
	function sgs_hover_guarded_rule( string $hover_selector, string $decls ): string {
		$decls          = trim( $decls );
		$hover_selector = trim( $hover_selector );

		if ( '' === $hover_selector || '' === $decls ) {
			return '';
		}

		$guarded = implode(
			',',
			array_map(
				static function ( $part ) {
					return SGS_HOVER_NOT_TOUCH . ' ' . trim( $part );
				},
				explode( ',', $hover_selector )
			)
		);

		return SGS_HOVER_MEDIA . '{' . $guarded . '{' . $decls . '}}';
	}
}

if ( ! function_exists( 'sgs_hover_state_rules' ) ) {
	/**
	 * Emit a hover state as a touch-safe PAIR: a guarded hover rule plus an
	 * unguarded focus rule carrying the identical declarations.
	 *
	 * Replaces the `{sel}:hover,{sel}:focus-x{decls}` one-rule shape that every
	 * paint helper used before 2026-09-03.
	 *
	 * @param string $selector One or more comma-separated base selectors.
	 * @param string $decls    CSS declarations, no braces.
	 * @param string $focus    Focus pseudo-class, e.g. ':focus-visible' or ':focus-within'.
	 * @param string $suffix   Optional pseudo-element suffix, e.g. '::after'.
	 * @return string Both rules concatenated, or '' when inputs are empty.
	 */
	function sgs_hover_state_rules( string $selector, string $decls, string $focus = ':focus-visible', string $suffix = '' ): string {
		$decls    = trim( $decls );
		$selector = trim( $selector );

		if ( '' === $selector || '' === $decls ) {
			return '';
		}

		$parts = array_map( 'trim', explode( ',', $selector ) );

		$hover_selector = implode(
			',',
			array_map(
				static function ( $part ) use ( $suffix ) {
					return $part . ':hover' . $suffix;
				},
				$parts
			)
		);

		$focus_selector = implode(
			',',
			array_map(
				static function ( $part ) use ( $focus, $suffix ) {
					return $part . $focus . $suffix;
				},
				$parts
			)
		);

		return sgs_hover_guarded_rule( $hover_selector, $decls )
			. $focus_selector . '{' . $decls . '}';
	}
}

if ( ! function_exists( 'sgs_hover_media_wrap' ) ) {
	/**
	 * Wrap an ALREADY-BUILT hover rule in the layer-1 media query.
	 *
	 * For callers that receive a finished rule string from another helper (an
	 * `@supports` companion, for instance) and so cannot hand over a
	 * selector/declaration pair. The layer-2 touch guard cannot be injected
	 * into an opaque rule, so such a caller prefixes SGS_HOVER_NOT_TOUCH onto
	 * the selector it passes to that helper itself.
	 *
	 * Nesting `@supports` inside `@media` is valid CSS Conditional Rules 3.
	 *
	 * @param string $rule A complete CSS rule.
	 * @return string The wrapped rule, or '' when the input is empty.
	 */
	function sgs_hover_media_wrap( string $rule ): string {
		$rule = trim( $rule );

		return '' === $rule ? '' : SGS_HOVER_MEDIA . '{' . $rule . '}';
	}
}
