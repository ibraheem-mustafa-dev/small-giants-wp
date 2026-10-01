<?php
/**
 * G-1: viewport-fluid header scale — scoped CSS emission for sgs/site-header.
 *
 * Reference design: every header size is authored in rem on a fluid
 * root — 16px up to a 1440px viewport, then roughly 1.111vw, giving 21.33px
 * at 1920px (the pill grows from 438x50 at top 16 to 584x67 at top 21).
 *
 * Two designs were weighed:
 *   1. `zoom` on the header's own scoped selector. One declaration scales
 *      EVERYTHING already inside the header's own box — padding, border,
 *      border-radius, and any descendant font-size (however it was set,
 *      rem/px/preset) — the same way a genuine viewport-fluid root would,
 *      with zero changes to any other block's CSS.
 *   2. A fluid root-size CSS variable that every header length would need to
 *      be rewritten to multiply against. Rejected: it would mean touching
 *      every rem/px value this block (and its row/nav/logo children, owned
 *      by other blocks) already emits, for a feature that is OFF by default —
 *      a much larger and more invasive surface for the same visual result.
 *
 * `zoom` was chosen. It is standard in Chrome, Safari and Firefox 126+
 * (per-file limitation: older Firefox ignores it and the header simply does
 * not scale, degrading to today's fixed sizing — never a broken layout).
 *
 * `zoom` scales everything the header paints, its own `top`/`left` offsets
 * included (measured: a 16px float inset lands the pill 21.33px down at 1920
 * under a 1.333 factor, the reference's 21), so the floating pill's inset
 * needs no second rule.
 *
 * The factor is published as `--sgs-header-fluid-scale` on `:root` — a
 * unitless ratio, 1 below the breakpoint — so a `sgs/nav-drawer` anchored to
 * the header box (rendered as a SIBLING, outside this <header> element) can
 * read the identical value and scale in step. This file is that contract's
 * one writer; a consumer reads it with a `,1` fallback so an unrelated page
 * with no fluid-scale header never sees an undefined variable.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';

if ( ! function_exists( 'sgs_header_fluid_scale_resolve' ) ) {
	/**
	 * Resolve `fluidScale` into an enabled flag plus a breakpoint, mirroring
	 * sgs_header_float_collapse()'s one-toggle-plus-one-number shape.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{enabled:bool,breakpoint:int}
	 */
	function sgs_header_fluid_scale_resolve( array $attributes ): array {
		$raw        = is_array( $attributes['fluidScale'] ?? null ) ? $attributes['fluidScale'] : array();
		$breakpoint = isset( $raw['breakpoint'] ) ? absint( $raw['breakpoint'] ) : 0;
		if ( $breakpoint < 1 ) {
			$breakpoint = 1440;
		}
		return array(
			'enabled'    => ! empty( $raw['enabled'] ),
			'breakpoint' => $breakpoint,
		);
	}
}

if ( ! function_exists( 'sgs_header_fluid_scale_css' ) ) {
	/**
	 * Emit the whole viewport-fluid-scale block.
	 *
	 * Returns '' — emitting nothing whatsoever — when `fluidScale.enabled` is
	 * false, which is every header shipping today (off by default).
	 *
	 * @param string $root_sel        The header's uid-scoped selector.
	 * @param array  $attributes      Block attributes.
	 * @return string CSS text, no <style> wrapper.
	 */
	function sgs_header_fluid_scale_css( string $root_sel, array $attributes ): string {
		$resolved = sgs_header_fluid_scale_resolve( $attributes );
		if ( ! $resolved['enabled'] ) {
			return '';
		}

		$bp  = $resolved['breakpoint'];
		$css = '';

		// The published contract — defined at 1 everywhere first, so a
		// consumer (this header, or an external drawer) never reads an
		// undefined custom property even before the viewport crosses the
		// breakpoint. `tan(atan2(100vw,<bp>px))` is a unitless ratio: at
		// exactly the breakpoint it resolves to 1 (100vw == bp), then grows
		// roughly linearly with viewport width above it — max(1, …) floors it
		// at 1 so a viewport narrower than the breakpoint (a media-query edge
		// case, e.g. a zoomed-out desktop) never SHRINKS the header.
		$css .= ':root{--sgs-header-fluid-scale:1;}';
		$css .= '@media (min-width:' . $bp . 'px){:root{--sgs-header-fluid-scale:max(1,tan(atan2(100vw,' . $bp . 'px)));}}';

		// The header reads the same variable back as its own `zoom` — one
		// factor, two consumers (this rule, and whatever external element
		// reads the custom property), so they can never disagree.
		$css .= '@media (min-width:' . $bp . 'px){' . $root_sel . '{zoom:var(--sgs-header-fluid-scale,1);}}';

		return $css;
	}
}
