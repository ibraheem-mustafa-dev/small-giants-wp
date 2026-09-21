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
 * 'on' for at least one device tier. (Backdrop blur is not emitted here: the container wrapper
 * owns it, through includes/helpers-surface-ground.php.) That is
 * the regression guarantee: a header with neither set produces byte-identical
 * CSS. The blur is not gated on float because a frosted full-width bar is a
 * legitimate look in its own right, and the editor canvas previews it that way.
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
	 * Every value passes through sgs_css_single_length_value(), which accepts
	 * only a value that is legal INSIDE `max()` — a single length or a single
	 * length-valued function call. Anything else (a two-value list, a keyword, a
	 * negative) falls back to the documented default rather than reaching the
	 * stylesheet, where it would invalidate the whole declaration.
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
				$value = sgs_css_single_length_value( $box[ $side ] ?? '' );
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
	 * @param string $root_sel              The header's uid-scoped selector.
	 * @param array  $attributes            Block attributes.
	 * @param array  $transparent_effective Per-tier EFFECTIVE transparency ('on'|'off'),
	 *                                      with `contrastSafe: force-solid` already
	 *                                      resolved to 'off'. Computed once in
	 *                                      render.php and passed in so there is one
	 *                                      resolver of the transparent state, not two.
	 * @param bool   $solid_first           True when `headerTransparentDirection` is
	 *                                      'solid-first' — the header rests SOLID and
	 *                                      turns see-through once scrolled.
	 * @return string CSS text, no <style> wrapper.
	 */
	function sgs_header_float_css( string $root_sel, array $attributes, array $transparent_effective = array(), bool $solid_first = false ): string {
		$css = '';

		$float_tiers = sgs_header_float_tiers( $attributes );
		if ( empty( $float_tiers ) ) {
			return $css;
		}

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

		$prev         = null;
		$pill_emitted = false;
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$decls = $geometry_by_tier[ $tier ];
			if ( $decls === $prev ) {
				continue;
			}
			$prev = $decls;
			if ( '' === $decls ) {
				if ( ! $pill_emitted ) {
					// Nothing above this tier laid any pill geometry down, so
					// there is nothing to cancel — a "float at tablet only"
					// header emitting a desktop `width:100%` would be a rule
					// that undoes something no rule ever did.
					continue;
				}
				// A narrower tier that is NOT floating must actively cancel the
				// wider tier's pill geometry, or a "float on desktop only"
				// header stays inset on a phone. `revert` is wrong for a custom
				// property (it would roll past the author origin); zeroing the
				// three insets makes the width expression resolve to 100%.
				$decls = '--sgs-header-float-inset-top:0px;--sgs-header-float-inset-right:0px;'
					. '--sgs-header-float-inset-left:0px;width:100%;';
			} else {
				$pill_emitted = true;
			}
			if ( 'desktop' === $tier ) {
				$css .= $root_sel . '{' . $decls . '}';
			} else {
				$max  = ( 'tablet' === $tier ) ? SGS_Breakpoints::TABLET_MAX : SGS_Breakpoints::MOBILE_MAX;
				$css .= '@media (max-width:' . $max . 'px){' . $root_sel . '{' . $decls . '}}';
			}
		}

		// ── Float + Transparent at the same tier: suppress the shadow where the
		// header is actually SEE-THROUGH. ──
		// A detached pill with a see-through fill and a shadow reads as a shadow
		// around nothing. Which STATE is see-through is not the raw
		// `headerTransparent` value: `contrastSafe: force-solid` turns a tier
		// solid, and `headerTransparentDirection: solid-first` swaps the two
		// states over, so the suppression keys on the effective transparency
		// render.php resolved, at the state that carries it.
		//
		// The off-value RESTATES the resting shadow rather than emitting nothing.
		// Tier rules are minimised against the tier above, so an empty off-value
		// leaves a narrower non-transparent tier inheriting the wider tier's
		// `box-shadow:none` — the header would lose its shadow on a phone because
		// the desktop is see-through. `revert` cannot do the restating either: it
		// rolls past the author origin, skipping the wrapper's own rule.
		$resting_shadow = sgs_shadow_value_composed(
			isset( $attributes['shadow'] ) && is_string( $attributes['shadow'] ) ? $attributes['shadow'] : '',
			isset( $attributes['shadowColour'] ) && is_string( $attributes['shadowColour'] ) ? $attributes['shadowColour'] : ''
		);
		if ( '' !== $resting_shadow ) {
			$suppress     = array();
			$any_suppress = false;
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$on = in_array( $tier, $float_tiers, true )
					&& 'on' === ( $transparent_effective[ $tier ] ?? 'off' );
				$suppress[ $tier ] = $on ? 'on' : 'off';
				$any_suppress      = $any_suppress || $on;
			}

			// A scrolled shadow the operator set is an explicit instruction for
			// the scrolled state, so it keeps winning there: render.php emits it
			// on `.is-header-scrolled` and nothing below touches that state.
			$scrolled_shadow = sgs_shadow_value_composed(
				isset( $attributes['shadowScrolled'] ) && is_string( $attributes['shadowScrolled'] ) ? $attributes['shadowScrolled'] : '',
				isset( $attributes['shadowScrolledColour'] ) && is_string( $attributes['shadowScrolledColour'] ) ? $attributes['shadowScrolledColour'] : ''
			);
			$restate = 'box-shadow:' . $resting_shadow . ';';

			if ( $any_suppress && $solid_first ) {
				// Solid at rest, see-through once scrolled: the resting rule keeps
				// its shadow and the scrolled state is the one to suppress.
				if ( '' === $scrolled_shadow ) {
					$css .= sgs_emit_tier_rules( $root_sel . '.is-header-scrolled', $suppress, 'box-shadow:none;', $restate, 'off' );
				}
			} elseif ( $any_suppress ) {
				// See-through at rest, solid once scrolled: suppress at rest and
				// bring the resting shadow back on the scrolled state.
				$css .= sgs_emit_tier_rules( $root_sel, $suppress, 'box-shadow:none;', $restate, 'off' );
				if ( '' === $scrolled_shadow ) {
					$css .= sgs_emit_tier_rules( $root_sel . '.is-header-scrolled', $suppress, $restate, '', 'off' );
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
