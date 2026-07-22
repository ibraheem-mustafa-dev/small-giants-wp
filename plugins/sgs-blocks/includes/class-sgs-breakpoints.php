<?php
/**
 * SGS shared responsive breakpoint source (FR-S9-6, R-31-1).
 *
 * THE single source of truth for the device-tier breakpoint values used by the
 * §S9 header/footer/nav responsive-override engine. Never hardcode a second
 * 768/1024 or 1023/767 pair in a block — read these constants / this helper.
 *
 * Standard (matches ~/.claude/rules/visual-standards.md + the existing SGS
 * device-tier convention): mobile = base up to 767px, tablet = up to 1023px,
 * desktop = 1024px and up. Emission uses max-width tiers (mobile-first-up):
 *   - tablet override:  @media/@container (max-width: TABLET_MAX)   → <=1023px
 *   - mobile override:  @media/@container (max-width: MOBILE_MAX)   → <=767px
 * A block MAY additionally declare a fourth CUSTOM-px tier (e.g. a per-instance
 * collapse breakpoint) — that value is per-instance, but it is still emitted
 * through this same helper so the query grammar stays consistent.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'SGS_Breakpoints' ) ) {
	/**
	 * Shared breakpoint constants + query builders for the responsive engine.
	 *
	 * Final, all-static: this is a value/utility holder, never instantiated.
	 */
	final class SGS_Breakpoints {

		/** Tablet tier upper bound in px (override applies at <= this width). */
		const TABLET_MAX = 1023;

		/** Mobile tier upper bound in px (override applies at <= this width). */
		const MOBILE_MAX = 767;

		/**
		 * Return the max-width (px, integer) for a named device tier.
		 *
		 * @param string $tier 'tablet' | 'mobile'.
		 * @return int|null Max-width in px, or null for an unknown tier
		 *                  (desktop/base has no max-width — it is the default rule).
		 */
		public static function max_for_tier( $tier ) {
			switch ( $tier ) {
				case 'tablet':
					return self::TABLET_MAX;
				case 'mobile':
					return self::MOBILE_MAX;
				default:
					return null;
			}
		}

		/**
		 * Build the opening of a scoped tier at-rule for a given max-width.
		 *
		 * Emits BOTH a media query and (when $with_container) a container query
		 * with identical bounds — the FR-S9-6 "container queries + media queries
		 * together" contract. The container query lets the block adapt to its own
		 * wrapper width when reused in a narrower context (e.g. a sidebar); the
		 * media query is the always-present fallback for contexts where the
		 * container query does not apply.
		 *
		 * Returns an array of at-rule PREFIX strings (each already opened with
		 * `{`), so the caller wraps the inner `selector{decls}` and appends one
		 * closing `}` per prefix. Order does not matter — the declarations are
		 * identical, so whichever matches wins by being last is irrelevant.
		 *
		 * @param int  $max_px        Max-width in px.
		 * @param bool $with_container Also emit an @container variant.
		 * @return array<int,string> At-rule prefixes, e.g. ['@media (max-width:767px){'].
		 */
		public static function tier_at_rules( $max_px, $with_container = false ) {
			$max_px = (int) $max_px;
			$rules  = array( '@media (max-width:' . $max_px . 'px){' );
			if ( $with_container ) {
				$rules[] = '@container (max-width:' . $max_px . 'px){';
			}
			return $rules;
		}
	}
}
