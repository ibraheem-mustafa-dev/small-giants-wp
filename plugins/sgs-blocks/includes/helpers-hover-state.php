<?php
/**
 * Touch-safe hover emission: the ONE place a `:hover` rule is built.
 *
 * A tap on a touchscreen engages `:hover` and the browser keeps it until the user taps elsewhere. SGS lets that
 * happen: a tap shows the hover look (colours and motion) and tapping elsewhere clears it, so every device sees the
 * same hover rules and the browser's own sticky-hover behaviour does the rest.
 *
 * ONE OPTIONAL GUARD. A site can choose "Desktop only" for "Hover effects on touch screens" (the
 * `sgs_touch_hover` option, printed by `sgs_touch_hover_html_attribute()` as `data-sgs-touch-hover` on `<html>`).
 * `assets/js/touch-input.js` then sets `.sgs-touch-input` on `<html>` while the most recent pointer was a touch, and
 * every hover rule built here sits inside `:where(:root:not(.sgs-touch-input))`, so it stops applying while the page
 * is touched. With the default "Show on tap" the class is never set and the guard never matches.
 *
 * `:focus-visible` is KEYBOARD-reachable and stays OUTSIDE the guard. Every caller splits its hover selector from
 * its focus selector rather than emitting the single combined rule it used to. A paint that follows a container's
 * focus is keyed on `:focus-visible` (the element itself) plus `:has(:focus-visible)` (a descendant), never `:focus-within`: a tap or a mouse click focuses a link, and
 * `:focus-within` would paint the container on that tap.
 *
 * The guard is wrapped in `:where()` so it contributes ZERO specificity. A hover rule must keep out-ranking its own
 * resting rule by the `:hover` pseudo-class alone; a rule that silently loses is indistinguishable from one that is
 * absent.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

/** Zero-specificity guard against the reactive touch class (set only when the site chose "Desktop only"). */
const SGS_HOVER_NOT_TOUCH = ':where(:root:not(.sgs-touch-input))';

if ( ! function_exists( 'sgs_hover_guarded_rule' ) ) {
	/**
	 * Wrap a hover-only rule in the touch-class guard.
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

		return $guarded . '{' . $decls . '}';
	}
}

if ( ! function_exists( 'sgs_focus_rests_active' ) ) {
	/**
	 * Whether the block rendering now keeps its resting look on keyboard focus (`sgsFocusRests`).
	 *
	 * `Sgs_Focus_Rests` (`includes/class-sgs-focus-rests.php`) keeps a per-block render stack and publishes the
	 * flag of the block on top, so a nested block without the setting is unaffected. Every emitter that pairs a hover
	 * rule with a `:focus-visible` or `:focus-within` twin of the same declarations skips the twin while this is true.
	 *
	 * @return bool
	 */
	function sgs_focus_rests_active(): bool {
		return ! empty( $GLOBALS['sgs_focus_rests_active'] );
	}
}

if ( ! function_exists( 'sgs_hover_state_rules' ) ) {
	/**
	 * Emit a hover state as a PAIR: a guarded hover rule plus an unguarded
	 * focus rule carrying the identical declarations.
	 *
	 * Replaces the `{sel}:hover,{sel}:focus-x{decls}` one-rule shape that every
	 * paint helper used before 2026-09-03. While `sgs_focus_rests_active()` is true (the block's `sgsFocusRests`
	 * setting) the focus rule is left out.
	 *
	 * @param string $selector One or more comma-separated base selectors.
	 * @param string $decls    CSS declarations, no braces.
	 * @param string $focus    Focus pseudo-class, e.g. ':focus-visible'. ':focus-within' is emitted as
	 *                         both ':focus-visible' (the element itself) and ':has(:focus-visible)' (a descendant),
	 *                         so keyboard focus paints it and a tap or click does not.
	 * @param string $suffix   Optional pseudo-element suffix, e.g. '::after'.
	 * @return string Both rules concatenated, or '' when inputs are empty.
	 */
	function sgs_hover_state_rules( string $selector, string $decls, string $focus = ':focus-visible', string $suffix = '' ): string {
		$decls    = trim( $decls );
		$selector = trim( $selector );

		if ( '' === $selector || '' === $decls ) {
			return '';
		}

		// A `:focus-within` target can take focus itself (a button or link), which `:has()` never matches, so it gets both.
		$focuses = ':focus-within' === $focus ? array( ':focus-visible', ':has(:focus-visible)' ) : array( $focus );

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
				static function ( $part ) use ( $focuses, $suffix ) {
					return implode(
						',',
						array_map(
							static function ( $state ) use ( $part, $suffix ) {
								return $part . $state . $suffix;
							},
							$focuses
						)
					);
				},
				$parts
			)
		);

		// Group hovered (Spec 38A §6.2 `source: group`): while a block whose motion hover uses the group source renders,
		// the motion renderer sets this flag, and the nearest `[data-sgs-hover-group]` ancestor's hover and
		// focus-visible-within drive the same declarations.
		if ( ! empty( $GLOBALS['sgs_hover_group_active'] ) ) {
			foreach ( $parts as $part ) {
				$hover_selector .= ',[data-sgs-hover-group]:hover ' . $part . $suffix;
				$focus_selector .= ',[data-sgs-hover-group]:has(:focus-visible) ' . $part . $suffix;
			}
		}

		// Keyboard focus keeps the resting look (`sgsFocusRests`): the guarded hover rule only; the focus ring is
		// focus.css's.
		if ( sgs_focus_rests_active() ) {
			return sgs_hover_guarded_rule( $hover_selector, $decls );
		}

		return sgs_hover_guarded_rule( $hover_selector, $decls )
			. $focus_selector . '{' . $decls . '}';
	}
}

if ( ! function_exists( 'sgs_hover_media_wrap' ) ) {
	/**
	 * Pass an ALREADY-BUILT hover rule through the one declared hover wrapper.
	 *
	 * For callers that receive a finished rule string from another helper (an
	 * `@supports` companion, for instance) and so cannot hand over a
	 * selector/declaration pair. The touch-class guard cannot be injected into
	 * an opaque rule, so such a caller prefixes SGS_HOVER_NOT_TOUCH onto the
	 * selector it passes to that helper itself. The rule is returned unchanged
	 * (no media query): the wrapper marks the rule as a hover rule for
	 * `scripts/hover-guard/php-hover-scan.php`.
	 *
	 * @param string $rule A complete CSS rule.
	 * @return string The rule, or '' when the input is empty.
	 */
	function sgs_hover_media_wrap( string $rule ): string {
		$rule = trim( $rule );

		return $rule;
	}
}
