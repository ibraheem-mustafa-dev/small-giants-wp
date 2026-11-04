<?php
/**
 * SGS shared responsive breakpoint source (Spec 37 FR-37-16, FP-1).
 *
 * THE single source of truth for the device-tier breakpoint values used by the
 * header/footer/nav responsive-override engine. Never hardcode a second
 * 768/1024 or 1023/767 pair in a block — read these constants / this helper.
 *
 * Standard (matches ~/.claude/rules/visual-standards.md + the existing SGS
 * device-tier convention): mobile = base up to 767px, tablet = up to 1023px,
 * desktop = 1024px and up. Emission uses max-width tiers (mobile-first-up):
 *   - tablet override:  @media (max-width: TABLET_MAX)   → <=1023px screens
 *   - mobile override:  @media (max-width: MOBILE_MAX)   → <=767px screens, plus @container (max-width: CONTAINER_MOBILE_MAX)
 *                       for a block in a box narrower than 480px (FW-H: tiers follow the screen)
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

		/** A box narrower than this (px) takes the Mobile tier's values even on a wider screen (the Mobile `@container` copy). */
		const CONTAINER_MOBILE_MAX = 479;

		/**
		 * The bare media condition for a named device range, built from the tier constants.
		 *
		 * Keys: 'tablet' (up to TABLET_MAX), 'mobile' (up to MOBILE_MAX), 'tablet-up' (from MOBILE_MAX + 1),
		 * 'desktop' (from TABLET_MAX + 1), 'tablet-only' (MOBILE_MAX + 1 to TABLET_MAX).
		 *
		 * @param string $range Range key.
		 * @return string e.g. '(max-width:1023px)'; '' for an unknown key.
		 */
		public static function query( $range ) {
			switch ( $range ) {
				case 'tablet':
					return '(max-width:' . self::TABLET_MAX . 'px)';
				case 'mobile':
					return '(max-width:' . self::MOBILE_MAX . 'px)';
				case 'tablet-up':
					return '(min-width:' . ( self::MOBILE_MAX + 1 ) . 'px)';
				case 'desktop':
					return '(min-width:' . ( self::TABLET_MAX + 1 ) . 'px)';
				case 'tablet-only':
					return '(min-width:' . ( self::MOBILE_MAX + 1 ) . 'px) and (max-width:' . self::TABLET_MAX . 'px)';
				default:
					return '';
			}
		}

		/**
		 * The at-rule prefix (no opening brace) for a named device range: `@media` plus query().
		 *
		 * @param string $range Range key (see query()).
		 * @return string e.g. '@media(max-width:1023px)'.
		 */
		public static function media( $range ) {
			return '@media' . self::query( $range );
		}

		/**
		 * The at-rule prefix (no opening brace) for a single width edge at a width the caller computed: a per-instance
		 * collapse point, a custom-px tier, or a width already carrying its unit. The same grammar as media(), with the
		 * value supplied.
		 *
		 * @param string     $edge  'max' or 'min'.
		 * @param int|float|string $width Width: a number is taken as px; a string such as '767.98px' is used as given.
		 * @return string e.g. '@media(max-width:1023px)'; '' for an unknown edge or an empty width.
		 */
		public static function media_width( $edge, $width ) {
			$query = self::query_width( $edge, $width );
			return '' === $query ? '' : '@media' . $query;
		}

		/**
		 * The bare media condition for a single width edge at a width the caller computed (see media_width()).
		 *
		 * @param string           $edge  'max' or 'min'.
		 * @param int|float|string $width Width: a number is taken as px; a string such as '767.98px' is used as given.
		 * @return string e.g. '(max-width:1023px)'; '' for an unknown edge or an empty width.
		 */
		public static function query_width( $edge, $width ) {
			if ( ( 'max' !== $edge && 'min' !== $edge ) || '' === (string) $width ) {
				return '';
			}
			return '(' . $edge . '-width:' . ( is_numeric( $width ) ? $width . 'px' : $width ) . ')';
		}

		/**
		 * The at-rule prefix for a tier's `@container` copy (a box narrower than the Mobile container width).
		 *
		 * @param int|string $width Container max-width in px (or with unit).
		 * @return string e.g. '@container (max-width:479px)'.
		 */
		public static function container_width( $width ) {
			return '@container ' . self::query_width( 'max', $width );
		}

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
		 * The box width under which a tier's rule also applies as an `@container` query, or null when it never does.
		 *
		 * Device tiers follow the SCREEN (`@media`): a header, footer or gallery at a 768px screen is Tablet even though
		 * its content box is about 704px wide. The container copy exists only so a block in a genuinely narrow box (a
		 * sidebar, a narrow column on a wide screen) still takes its Mobile values: the Mobile tier, under
		 * CONTAINER_MOBILE_MAX. The Tablet tier has no container rule. A custom-px tier a block declares keeps the
		 * same px for its container copy.
		 *
		 * @param int $max_px The tier's screen max-width.
		 * @return int|null The container max-width, or null for no container rule.
		 */
		public static function container_max( $max_px ) {
			$max_px = (int) $max_px;
			if ( self::TABLET_MAX === $max_px ) {
				return null;
			}
			return self::MOBILE_MAX === $max_px ? self::CONTAINER_MOBILE_MAX : $max_px;
		}

		/**
		 * Build the opening of a scoped tier at-rule for a given max-width.
		 *
		 * Always emits the media query for the screen width. When $with_container, the Mobile tier ALSO gets a container
		 * query under CONTAINER_MOBILE_MAX (480px boxes), so a block reused in a narrow box (a sidebar, a narrow column on
		 * a wide screen) takes its Mobile values (Spec 37 FR-37-16, FW-H); the Tablet tier gets none, because the tiers
		 * follow the screen (`container_max()`).
		 *
		 * Returns an array of at-rule PREFIX strings (each already opened with
		 * `{`), so the caller wraps the inner `selector{decls}` and appends one
		 * closing `}` per prefix. Order does not matter — the declarations are
		 * identical, so whichever matches wins by being last is irrelevant.
		 *
		 * @param int  $max_px        Max-width in px.
		 * @param bool $with_container Also emit an @container variant.
		 * @return array<int,string> At-rule prefixes, e.g. ['@media(max-width:767px){'].
		 */
		public static function tier_at_rules( $max_px, $with_container = false ) {
			$max_px = (int) $max_px;
			$rules  = array( self::media_width( 'max', $max_px ) . '{' );
			if ( $with_container ) {
				$container = self::container_max( $max_px );
				if ( null !== $container ) {
					$rules[] = self::container_width( $container ) . '{';
				}
			}
			return $rules;
		}
	}
}
