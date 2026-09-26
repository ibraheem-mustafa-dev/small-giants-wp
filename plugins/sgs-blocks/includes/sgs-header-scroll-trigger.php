<?php
/**
 * Section-adaptive header scroll trigger — the single writer for
 * sgs/site-header's `scrolledTrigger` / `scrolledOffset` (Wave 3C U-13 M-03,
 * `.claude/reports/2026-09-26-u13-header-ink-design.md` §4.6).
 *
 * `scrolledTrigger` chooses what makes view.js add `is-header-scrolled` /
 * `is-header-shrunk`:
 *   - `position` (default): scrollY past `scrolledOffset` — today's
 *     behaviour, now with a settable threshold instead of the hard-coded 50.
 *   - `direction`: scrollY past `scrolledOffset` AND the last movement was
 *     downward; cleared on an 8px+ upward movement (deadzone) or at/below
 *     the offset. view.js (src/header-behaviours/direction-scroll-state.js)
 *     owns the state machine; this file only emits the data attributes it
 *     reads and the fade CSS for a solid-first transparent header.
 *
 * THE FADE (§4.6): a `background-image` swap between a gradient and `none`
 * is a discrete CSS value with no interpolation, so today's instant
 * `.is-header-scrolled{background:transparent !important}` toggle cannot be
 * animated on the header's own box. In `direction` mode, for a tier that is
 * both `solid-first` and genuinely Transparent, the header's own resting
 * fill is duplicated onto `::after` (a free pseudo-element — `::before` is
 * the contrastSafe scrim) with `opacity` doing the fade, and the header's
 * OWN background is forced fully transparent at that tier (both states) so
 * the pseudo-element carries 100% of the visual weight. This is additive: it
 * only fires for the (solid-first + Transparent-on + direction) combination,
 * which did not exist before this attribute was added, so no previously
 * reachable config changes behaviour.
 *
 * Scope: the fade is built for `headerTransparentDirection: solid-first`
 * only (the fantasy exit cell). `transparent-first` + `direction` still gets
 * the direction-keyed is-header-scrolled STATE (the class toggles correctly),
 * but its own scrolled-fill swap stays an instant appear/disappear, same as
 * `position` mode today — that pairing uses a different fill
 * (backgroundColourScrolled) resolved much later in render.php and is not
 * part of the required exit cell.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';

// PHP allow-list mirroring block.json's `scrolledTrigger` enum.
if ( ! defined( 'SGS_HEADER_SCROLLED_TRIGGER_VALUES' ) ) {
	define( 'SGS_HEADER_SCROLLED_TRIGGER_VALUES', array( 'position', 'direction' ) );
}

if ( ! function_exists( 'sgs_header_scrolled_trigger_value' ) ) {
	/**
	 * Resolve `scrolledTrigger`, coercing any off-enum/junk value to the
	 * default rather than emitting it raw.
	 *
	 * @param array $attributes Block attributes.
	 * @return string 'position'|'direction'.
	 */
	function sgs_header_scrolled_trigger_value( array $attributes ): string {
		$raw = isset( $attributes['scrolledTrigger'] ) ? (string) $attributes['scrolledTrigger'] : 'position';
		return in_array( $raw, SGS_HEADER_SCROLLED_TRIGGER_VALUES, true ) ? $raw : 'position';
	}
}

if ( ! function_exists( 'sgs_header_scrolled_offset_value' ) ) {
	/**
	 * Resolve `scrolledOffset` as a sanitised integer pixel value.
	 *
	 * @param array $attributes Block attributes.
	 * @return int 0-2000, default 50.
	 */
	function sgs_header_scrolled_offset_value( array $attributes ): int {
		if ( ! isset( $attributes['scrolledOffset'] ) || ! is_numeric( $attributes['scrolledOffset'] ) ) {
			return 50;
		}
		$offset = absint( $attributes['scrolledOffset'] );
		return min( 2000, max( 0, $offset ) );
	}
}

if ( ! function_exists( 'sgs_header_scroll_fade_css' ) ) {
	/**
	 * The complete fade CSS for direction-mode, solid-first, Transparent-on
	 * tiers, plus the filtered Transparent-effective map the caller should use
	 * for the OLD instant `.is-header-scrolled` toggle instead of the raw one
	 * (fade tiers must not also get the instant toggle — the two would fight
	 * over the same `background` property).
	 *
	 * @param string $root_sel              The header's uid-scoped selector.
	 * @param string $scroll_trigger         sgs_header_scrolled_trigger_value()'s result.
	 * @param bool   $solid_first            Whether headerTransparentDirection is solid-first.
	 * @param array  $transparent_effective  Per-tier 'on'/'off' Transparent state (render.php's
	 *                                       $sh_transparent_effective, already force-solid-adjusted).
	 * @param string $resting_bg_color       The header's own resolved resting background colour
	 *                                       ('' = none).
	 * @param string $resting_bg_image       The header's own resolved resting background gradient
	 *                                       ('' = none).
	 * @return array{css:string, toggle_effective:array<string,string>, any_fade:bool}
	 */
	function sgs_header_scroll_fade_css( string $root_sel, string $scroll_trigger, bool $solid_first, array $transparent_effective, string $resting_bg_color, string $resting_bg_image ): array {
		// Fade only applies to direction mode's solid-first pairing (see this
		// file's docblock for why transparent-first is out of scope) and only
		// where the header actually has a resting fill to fade — a header with
		// neither a colour nor a gradient has nothing to duplicate onto ::after,
		// so the instant (no-op) toggle is left untouched.
		$fade_possible = ( 'direction' === $scroll_trigger ) && $solid_first
			&& ( '' !== $resting_bg_color || '' !== $resting_bg_image );

		if ( ! $fade_possible ) {
			return array(
				'css'              => '',
				'toggle_effective' => $transparent_effective,
				'any_fade'         => false,
			);
		}

		$media_by_tier = array(
			'desktop' => '@media (min-width:' . ( SGS_Breakpoints::TABLET_MAX + 1 ) . 'px)',
			'tablet'  => '@media (min-width:' . ( SGS_Breakpoints::MOBILE_MAX + 1 ) . 'px) and (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px)',
			'mobile'  => '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px)',
		);

		$css              = '';
		$toggle_effective = array();
		$any_fade         = false;

		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$tier_on = isset( $transparent_effective[ $tier ] ) && 'on' === $transparent_effective[ $tier ];

			if ( ! $tier_on ) {
				// Not Transparent at this tier: nothing to fade, leave the old
				// toggle map untouched (it already emits nothing here either).
				$toggle_effective[ $tier ] = $transparent_effective[ $tier ] ?? 'off';
				continue;
			}

			$any_fade                  = true;
			$toggle_effective[ $tier ] = 'off'; // Replace the instant toggle with the fade below.

			// The header's own background is forced fully transparent at this
			// tier in BOTH states — ::after now carries 100% of the visual
			// weight, so the two never double-paint.
			$css .= $media_by_tier[ $tier ] . '{' . $root_sel . '{background:transparent !important;}}';

			// The duplicated resting fill, at rest opacity 1 (the resting fill's
			// own alpha — e.g. surfaceOpacity's baked-in 0.5 — is untouched;
			// this opacity is the FADE axis, layered on top of it), fading to 0
			// once `.is-header-scrolled` (scrollY past the offset AND moving
			// down — the state view.js's direction-scroll-state module owns).
			$after_bg = 'background-color:' . ( '' !== $resting_bg_color ? $resting_bg_color : 'transparent' ) . ';'
				. 'background-image:' . ( '' !== $resting_bg_image ? $resting_bg_image : 'none' ) . ';';

			$css .= $media_by_tier[ $tier ] . '{'
				. $root_sel . '::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;'
				. $after_bg . 'opacity:1;transition:opacity 300ms ease;}'
				. $root_sel . '.is-header-scrolled::after{opacity:0;}'
				. '}';
		}

		if ( $any_fade ) {
			// Self-contained reduced-motion reset — the shared one near the end
			// of render.php targets the root selector only, not this pseudo-element.
			$css .= '@media (prefers-reduced-motion: reduce) {' . $root_sel . '::after{transition:none !important;}}';
		}

		return array(
			'css'              => $css,
			'toggle_effective' => $toggle_effective,
			'any_fade'         => $any_fade,
		);
	}
}
