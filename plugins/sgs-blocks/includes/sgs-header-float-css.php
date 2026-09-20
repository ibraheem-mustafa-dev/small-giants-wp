<?php
/**
 * Floating header ("pill") geometry — scoped CSS emission for sgs/site-header.
 *
 * A pill is a sticky header whose `top` offset is an inset instead of zero,
 * whose width is capped and centred, and which carries the radius, shadow and
 * backdrop blur the client already controls. It is deliberately NOT a second
 * positioning system: `position`/`top`/`z-index` stay with the shared
 * tri-state merge in site-header/render.php, and everything emitted here is
 * geometry (custom-property values, width, centring) plus the two composition
 * rulings that geometry forces.
 *
 * Nothing in this file emits anything at all unless `headerFloat` resolves
 * 'on' for at least one device tier. That is the regression guarantee: a
 * header that has never heard of float mode produces byte-identical CSS.
 *
 * Custom properties published on the header's own uid selector:
 *   --sgs-header-float-inset-top / -right / -left
 * Each is `max( <authored value>, env( safe-area-inset-* ) )`, so a notch or a
 * home indicator can only ever widen the gap, never narrow it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-breakpoints.php';
require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-responsive.php';

if ( ! function_exists( 'sgs_header_float_tiers' ) ) {
	/**
	 * Which device tiers resolve float ON, through the canonical cascade.
	 *
	 * @param array $attributes Block attributes.
	 * @return string[] Subset of desktop/tablet/mobile, in tier order.
	 */
	function sgs_header_float_tiers( array $attributes ): array {
		return sgs_resolve_on_tiers( $attributes['headerFloat'] ?? array(), 'on', 'off' );
	}
}

if ( ! function_exists( 'sgs_header_float_inset_for_tier' ) ) {
	/**
	 * Resolve the TIER-of-BOX `headerFloatInset` for one tier.
	 *
	 * Sides cascade individually: a tablet box declaring only `top` keeps
	 * desktop's `right`/`left`. That mirrors how the frontend actually paints a
	 * tier-of-boxes attribute (both `max-width` queries can match at once, so an
	 * undeclared side simply keeps the wider tier's value) and how the editor
	 * preview resolves one (`src/utils/spacing-preview.js::resolveBoxTierPreview`).
	 *
	 * `bottom` is never read: a pill is offset from the top and the two sides,
	 * and a bottom inset on a pinned bar means nothing. The UI does not offer it.
	 *
	 * Every value passes through sgs_css_length_value(), so an unparseable or
	 * hostile string becomes '' and falls back to the documented default rather
	 * than reaching the stylesheet.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $tier       'desktop' | 'tablet' | 'mobile'.
	 * @return array{top:string,right:string,left:string} Resolved CSS lengths.
	 */
	function sgs_header_float_inset_for_tier( array $attributes, string $tier ): array {
		$raw   = is_array( $attributes['headerFloatInset'] ?? null ) ? $attributes['headerFloatInset'] : array();
		$order = array( 'desktop' );
		if ( 'tablet' === $tier || 'mobile' === $tier ) {
			$order[] = 'tablet';
		}
		if ( 'mobile' === $tier ) {
			$order[] = 'mobile';
		}

		// The measured reference value (lamalama, 16px at both 1440 and 390) in
		// a RELATIVE unit: a bare px inset fails WCAG 1.4.4 at 200% zoom.
		$sides = array(
			'top'   => '1rem',
			'right' => '1rem',
			'left'  => '1rem',
		);
		foreach ( $order as $tier_key ) {
			$box = is_array( $raw[ $tier_key ] ?? null ) ? $raw[ $tier_key ] : array();
			foreach ( array_keys( $sides ) as $side ) {
				$value = sgs_css_length_value( $box[ $side ] ?? '' );
				if ( '' !== $value ) {
					$sides[ $side ] = $value;
				}
			}
		}
		return $sides;
	}
}

if ( ! function_exists( 'sgs_header_float_collapse' ) ) {
	/**
	 * Resolve `headerFloatCollapse` into an enabled flag plus a breakpoint.
	 *
	 * ONE toggle and ONE number, never three per-tier switches: the only
	 * reference with a real pill keeps it at a 390px viewport, and the one that
	 * ignores responsiveness is the one that breaks there.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{enabled:bool,breakpoint:int}
	 */
	function sgs_header_float_collapse( array $attributes ): array {
		$raw        = is_array( $attributes['headerFloatCollapse'] ?? null ) ? $attributes['headerFloatCollapse'] : array();
		$breakpoint = isset( $raw['breakpoint'] ) ? absint( $raw['breakpoint'] ) : 0;
		if ( $breakpoint < 1 ) {
			$breakpoint = SGS_Breakpoints::MOBILE_MAX + 1;
		}
		return array(
			'enabled'    => ! empty( $raw['enabled'] ),
			'breakpoint' => $breakpoint,
		);
	}
}

if ( ! function_exists( 'sgs_header_float_inset_declarations' ) ) {
	/**
	 * The three inset custom-property VALUES for one tier.
	 *
	 * Values, never property declarations — Spec 32. The consumers are this
	 * file's own width expression, the merge's `top`, and the hide-on-scroll
	 * travel emitted by render.php.
	 *
	 * @param array $sides Resolved {top,right,left} lengths.
	 * @return string CSS declarations, no selector or braces.
	 */
	function sgs_header_float_inset_declarations( array $sides ): string {
		return '--sgs-header-float-inset-top:max(' . $sides['top'] . ',env(safe-area-inset-top));'
			. '--sgs-header-float-inset-right:max(' . $sides['right'] . ',env(safe-area-inset-right));'
			. '--sgs-header-float-inset-left:max(' . $sides['left'] . ',env(safe-area-inset-left));';
	}
}

if ( ! function_exists( 'sgs_header_float_css' ) ) {
	/**
	 * Emit the whole floating-header geometry block.
	 *
	 * Returns '' — emitting nothing whatsoever — when float is off at every
	 * tier, which is every header shipping today.
	 *
	 * What is deliberately NOT here:
	 *   - `position` / `top` / `z-index`: owned by the tri-state merge in
	 *     render.php, so there stays exactly ONE writer of each.
	 *   - width CAP, radius, shadow, border: the client's existing `maxWidth`,
	 *     `borderRadius`, `shadow` and border attributes already reach this
	 *     selector. `width: calc( 100% - insets )` with the existing
	 *     `max-width` IS `min( cap, 100% - insets )`; a second cap attribute
	 *     would be the duplicate control the gates exist to catch.
	 *   - `overflow: hidden`. A rounded container that clips overflow cuts the
	 *     focus ring off the leftmost and rightmost items (WCAG 2.4.11/2.4.13).
	 *     Radius without clipping is the requirement.
	 *
	 * @param string $root_sel   The header's uid-scoped selector.
	 * @param array  $attributes Block attributes.
	 * @return string CSS text, no <style> wrapper.
	 */
	function sgs_header_float_css( string $root_sel, array $attributes ): string {
		$float_tiers = sgs_header_float_tiers( $attributes );
		if ( empty( $float_tiers ) ) {
			return '';
		}

		$css = '';

		// ── Per-tier insets, width and centring. ──
		// Emitted through the same differs-from-the-tier-above minimisation the
		// other header behaviours use, so a pill that is identical at all three
		// tiers emits exactly one rule.
		$geometry_by_tier = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$geometry_by_tier[ $tier ] = in_array( $tier, $float_tiers, true )
				? sgs_header_float_inset_declarations( sgs_header_float_inset_for_tier( $attributes, $tier ) )
					// `100%` resolves against the header's containing block, which
					// for a sticky element is its normal-flow parent — the page, at
					// full width. `margin-inline:auto` then centres the shortfall.
					. 'width:calc(100% - var(--sgs-header-float-inset-left) - var(--sgs-header-float-inset-right));'
					. 'margin-inline:auto;'
				: '';
		}

		$prev = null;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$decls = $geometry_by_tier[ $tier ];
			if ( $decls === $prev ) {
				$prev = $decls;
				continue;
			}
			$prev = $decls;
			if ( '' === $decls ) {
				// A narrower tier that is NOT floating must actively cancel the
				// wider tier's pill geometry, or a "float on desktop only"
				// header stays inset on a phone. `revert` is wrong for a custom
				// property (it would roll past the author origin); zeroing the
				// three insets makes the width expression resolve to 100%.
				$decls = '--sgs-header-float-inset-top:0px;--sgs-header-float-inset-right:0px;'
					. '--sgs-header-float-inset-left:0px;width:100%;';
			}
			if ( 'desktop' === $tier ) {
				$css .= $root_sel . '{' . $decls . '}';
			} else {
				$max  = ( 'tablet' === $tier ) ? SGS_Breakpoints::TABLET_MAX : SGS_Breakpoints::MOBILE_MAX;
				$css .= '@media (max-width:' . $max . 'px){' . $root_sel . '{' . $decls . '}}';
			}
		}

		// ── Backdrop blur. ──
		// The defining treatment of the only measured reference pill, which has
		// no shadow, no border and a transparent fill. Same value vocabulary and
		// the same paired `-webkit-` emission as sgs/nav-drawer's `surfaceBlur`.
		// Not tier-gated and not suppressed on scroll: a blur is what makes a
		// see-through pill legible, so removing it at rest would defeat the look
		// it exists to produce.
		$blur = sgs_css_length_value( $attributes['backdropBlur'] ?? '' );
		if ( '' !== $blur ) {
			$css .= $root_sel . '{backdrop-filter:blur(' . $blur . ');-webkit-backdrop-filter:blur(' . $blur . ');}';
		}

		// ── Float + Transparent at the same tier: suppress the shadow at rest. ──
		// A detached pill with a see-through fill and a shadow reads as a shadow
		// around nothing. The shadow comes back once `.is-header-scrolled` is on:
		// `shadowScrolled` when the client set one (render.php already emits it at
		// higher specificity), otherwise the resting `shadow` restated.
		$transparent_tiers = sgs_resolve_on_tiers( $attributes['headerTransparent'] ?? array(), 'on', 'off' );
		$both_tiers        = array_values( array_intersect( $float_tiers, $transparent_tiers ) );
		if ( ! empty( $both_tiers ) ) {
			$suppress = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$suppress[ $tier ] = in_array( $tier, $both_tiers, true ) ? 'on' : 'off';
			}
			$css .= sgs_emit_tier_rules( $root_sel, $suppress, 'box-shadow:none;', '', 'off' );

			$scrolled_shadow = sgs_shadow_value_composed(
				isset( $attributes['shadowScrolled'] ) && is_string( $attributes['shadowScrolled'] ) ? $attributes['shadowScrolled'] : '',
				isset( $attributes['shadowScrolledColour'] ) && is_string( $attributes['shadowScrolledColour'] ) ? $attributes['shadowScrolledColour'] : ''
			);
			if ( '' === $scrolled_shadow ) {
				$scrolled_shadow = sgs_shadow_value_composed(
					isset( $attributes['shadow'] ) && is_string( $attributes['shadow'] ) ? $attributes['shadow'] : '',
					isset( $attributes['shadowColour'] ) && is_string( $attributes['shadowColour'] ) ? $attributes['shadowColour'] : ''
				);
				if ( '' !== $scrolled_shadow ) {
					$css .= sgs_emit_tier_rules(
						$root_sel . '.is-header-scrolled',
						$suppress,
						'box-shadow:' . $scrolled_shadow . ';',
						'',
						'off'
					);
				}
			}
		}

		// ── The single signed opt-out: collapse to a full-width bar. ──
		// Emitted LAST so its cancellations beat the pill geometry above and the
		// border-radius tiers render.php emits before it, at equal specificity
		// and without reaching for `!important`.
		$collapse = sgs_header_float_collapse( $attributes );
		if ( $collapse['enabled'] ) {
			$css .= '@media (max-width:' . ( $collapse['breakpoint'] - 1 ) . 'px){' . $root_sel
				. '{--sgs-header-float-inset-top:0px;--sgs-header-float-inset-right:0px;'
				. '--sgs-header-float-inset-left:0px;width:100%;border-radius:0;}}';
		}

		return $css;
	}
}
