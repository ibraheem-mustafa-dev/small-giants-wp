<?php
/**
 * Section-adaptive header ink — the single writer for sgs/site-header's
 * `sectionInk` (Wave 3C U-13 §4.1/§4.2, `.claude/reports/2026-09-26-u13-header-ink-design.md`).
 *
 * `sectionInk` is a per-tier enum (`off` | `adapt` | `blend`):
 *   - `off`   paints nothing (today's behaviour).
 *   - `adapt` follows the section behind the header. view.js toggles
 *     `is-header-on-dark` / `is-header-on-light` only inside the live window
 *     published in `data-sgs-header-ink` (see sgs_header_ink_live_state()).
 *   - `blend` paints `mix-blend-mode:difference` on the header's rows with
 *     the ink forced to white, needing no JS at all.
 *
 * The header never styles the logo; the logo reads the same classes (§4.5).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-motion-easing.php';
require_once __DIR__ . '/class-sgs-breakpoints.php';

// PHP allow-list mirroring block.json's `sectionInk` per-tier enum.
if ( ! defined( 'SGS_HEADER_INK_VALUES' ) ) {
	define( 'SGS_HEADER_INK_VALUES', array( 'off', 'adapt', 'blend' ) );
}

if ( ! function_exists( 'sgs_header_ink_tiers' ) ) {
	/**
	 * `sectionInk` resolved per tier via the canonical cascade. A junk value
	 * coerces to 'off', never emitted raw.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,string> desktop|tablet|mobile => 'off'|'adapt'|'blend'.
	 */
	function sgs_header_ink_tiers( array $attributes ) {
		$raw   = isset( $attributes['sectionInk'] ) ? $attributes['sectionInk'] : array();
		$tiers = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$resolved       = sgs_resolve_tier( $raw, $tier, 'off' );
			$value          = $resolved['value'];
			$tiers[ $tier ] = in_array( $value, SGS_HEADER_INK_VALUES, true ) ? $value : 'off';
		}
		return $tiers;
	}
}

if ( ! function_exists( 'sgs_header_ink_resolve_colour' ) ) {
	/**
	 * Resolve an ink colour attribute, falling back to the default token.
	 *
	 * @param mixed  $raw      Raw attribute value.
	 * @param string $fallback A CSS colour value (a `var(...)` token).
	 * @return string A CSS colour value. Never empty.
	 */
	function sgs_header_ink_resolve_colour( $raw, string $fallback ): string {
		$raw      = (string) $raw;
		$resolved = '' !== $raw ? sgs_colour_value( $raw ) : '';
		return '' !== $resolved ? $resolved : $fallback;
	}
}

if ( ! function_exists( 'sgs_header_ink_resolve_fill' ) ) {
	/**
	 * Resolve a fill colour + gradient pair into one `background` shorthand
	 * value, gradient layered over the flat colour. Empty when neither is
	 * set — "fill unchanged" (§4.1).
	 *
	 * @param mixed $colour   Raw colour attribute value.
	 * @param mixed $gradient Raw gradient attribute value.
	 * @return string A `background` shorthand value, or '' when unset.
	 */
	function sgs_header_ink_resolve_fill( $colour, $gradient ): string {
		$colour_value   = '' !== (string) $colour ? sgs_colour_value( (string) $colour ) : '';
		$gradient_value = '' !== (string) $gradient ? sgs_css_gradient_value( (string) $gradient ) : '';
		if ( '' === $colour_value && '' === $gradient_value ) {
			return '';
		}
		if ( '' !== $gradient_value ) {
			return '' !== $colour_value ? $gradient_value . ',' . $colour_value : $gradient_value;
		}
		return $colour_value;
	}
}

if ( ! function_exists( 'sgs_header_ink_mode_for_tier' ) ) {
	/**
	 * Decide WHICH ink mechanism (if any) applies at one tier (§4.2: ink adapts
	 * only where the header is see-through, or where a tone fill follows the
	 * section so the ink pairs with it).
	 *
	 * @param string $ink_state      This tier's resolved `sectionInk` value.
	 * @param bool   $has_tone_fill  fillOnLight/fillOnDark (or gradients) resolve.
	 * @param bool   $has_own_fill   The header has ANY resting fill of its own.
	 * @param bool   $transparent_on Transparent resolves ON at this tier
	 *                               (already force-solid-adjusted by the caller).
	 * @return string 'none'|'blend'|'tone-fill'|'tone-fill-transparent'|'transparent-only'|'unconditional'.
	 */
	function sgs_header_ink_mode_for_tier( string $ink_state, bool $has_tone_fill, bool $has_own_fill, bool $transparent_on ): string {
		if ( 'blend' === $ink_state ) {
			return 'blend';
		}
		if ( 'adapt' !== $ink_state ) {
			return 'none';
		}
		if ( $has_tone_fill ) {
			return $transparent_on ? 'tone-fill-transparent' : 'tone-fill';
		}
		if ( $transparent_on ) {
			return 'transparent-only';
		}
		if ( ! $has_own_fill ) {
			return 'unconditional';
		}
		// Opaque, no tone fill, not transparent: reads its own fill (§4.4 advisory).
		return 'none';
	}
}

if ( ! function_exists( 'sgs_header_ink_live_state' ) ) {
	/**
	 * When the tone classes may be set at one tier, for view.js: 'always',
	 * 'rest' (only while not `.is-header-scrolled`), 'scrolled' (only while
	 * scrolled) or '' (never). view.js sets `is-header-on-dark`/`-light` ONLY
	 * inside this window, so every consumer of those classes (this helper's
	 * ink and fill, the logo's ground response) is live exactly where the
	 * header is see-through or tone-filled, and nowhere else.
	 *
	 * @param string $mode        sgs_header_ink_mode_for_tier()'s return value.
	 * @param bool   $solid_first Whether Transparent's direction is solid-first.
	 * @return string
	 */
	function sgs_header_ink_live_state( string $mode, bool $solid_first ): string {
		if ( 'transparent-only' === $mode ) {
			return $solid_first ? 'scrolled' : 'rest';
		}
		return in_array( $mode, array( 'unconditional', 'tone-fill', 'tone-fill-transparent' ), true ) ? 'always' : '';
	}
}

if ( ! function_exists( 'sgs_header_ink_mode_rule' ) ) {
	/**
	 * The CSS text for one resolved mode, unwrapped (the caller wraps it in
	 * that tier's exact-range `@media`, so no tier ever cancels another).
	 * Ink rules carry no scroll-state selector: view.js sets the tone classes
	 * only inside the live window (sgs_header_ink_live_state()).
	 *
	 * @param string $mode        sgs_header_ink_mode_for_tier()'s return value.
	 * @param string $root_sel    The header's uid-scoped selector.
	 * @param string $ink_dark    Resolved ink colour over a dark section.
	 * @param string $ink_light   Resolved ink colour over a light section.
	 * @param string $fill_dark   Resolved fill over a dark section ('' = unchanged).
	 * @param string $fill_light  Resolved fill over a light section ('' = unchanged).
	 * @param bool   $solid_first Whether Transparent's direction is solid-first.
	 * @return string CSS rule text (no `@media` wrapper), '' for nothing.
	 */
	function sgs_header_ink_mode_rule( string $mode, string $root_sel, string $ink_dark, string $ink_light, string $fill_dark, string $fill_light, bool $solid_first ): string {
		if ( 'blend' === $mode ) {
			// mix-blend-mode:difference on the header's rows, ink forced white so
			// difference inverts; isolation scopes the blend to the header.
			return $root_sel . '{isolation:isolate;color:#fff !important;}'
				. $root_sel . ' .sgs-site-header-row{mix-blend-mode:difference;}';
		}
		if ( 'none' === $mode ) {
			return '';
		}

		$css = $root_sel . '.is-header-on-dark{color:' . $ink_dark . ' !important;}'
			. $root_sel . '.is-header-on-light{color:' . $ink_light . ' !important;}';

		// While live, top-level links and the burger follow the ink over the
		// menu's own colour; hover, focus and dropdown panels keep theirs.
		foreach ( array( 'dark', 'light' ) as $tone ) {
			$on   = $root_sel . '.is-header-on-' . $tone;
			$css .= $on . ' .sgs-nav-bar-menu__item>.sgs-nav-bar-menu__link:not(:hover):not(:focus-visible),'
				. $on . ' .sgs-nav-bar-menu__burger:not(:hover):not(:focus-visible)'
				. '{color:inherit !important;-webkit-text-fill-color:currentColor !important;}';
		}

		if ( 'tone-fill' === $mode || 'tone-fill-transparent' === $mode ) {
			// Transparent on: the fill follows the section only in the header's
			// SOLID state (wearecollins: see-through at the top, filled once
			// scrolled); the see-through state keeps its transparency. Three or
			// more classes, beating the two-class `!important` scrolled fill.
			$state = '';
			if ( 'tone-fill-transparent' === $mode ) {
				$state = $solid_first ? ':not(.is-header-scrolled)' : '.is-header-scrolled';
			}
			if ( '' !== $fill_dark ) {
				$css .= $root_sel . '.is-header-on-dark' . $state . '{background:' . $fill_dark . ' !important;}';
			}
			if ( '' !== $fill_light ) {
				$css .= $root_sel . '.is-header-on-light' . $state . '{background:' . $fill_light . ' !important;}';
			}
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_header_ink_css' ) ) {
	/**
	 * The complete section-ink CSS for sgs/site-header, plus the transition
	 * value to append to the shared `transition` shorthand list render.php
	 * already builds ($sh_shadow_tx_append / $sh_shadow_tx_off).
	 *
	 * @param string $root_sel              The header's uid-scoped selector.
	 * @param string $uid                   The header's uid (kept for parity with
	 *                                       the other sgs-header-*.php helpers' shape).
	 * @param array  $attributes            Block attributes.
	 * @param array  $transparent_effective Per-tier 'on'/'off' Transparent state,
	 *                                       already force-solid-adjusted (render.php's
	 *                                       $sh_transparent_effective — never re-resolved
	 *                                       here, so the two never disagree).
	 * @param bool   $solid_first           Whether Transparent's direction is solid-first.
	 * @param string $resting_bg_color      The header's own resolved resting background
	 *                                       colour ('' = none).
	 * @param string $resting_bg_image      The header's own resolved resting background
	 *                                       gradient ('' = none).
	 * @return array{css:string,transition:string,any_adapt:bool}
	 */
	function sgs_header_ink_css( string $root_sel, string $uid, array $attributes, array $transparent_effective, bool $solid_first, string $resting_bg_color, string $resting_bg_image ): array {
		$ink_tiers = sgs_header_ink_tiers( $attributes );
		$any_adapt = in_array( 'adapt', $ink_tiers, true );
		$any_blend = in_array( 'blend', $ink_tiers, true );

		if ( ! $any_adapt && ! $any_blend ) {
			return array(
				'css'        => '',
				'transition' => '',
				'any_adapt'  => false,
				'live'       => '',
			);
		}

		$ink_light  = sgs_header_ink_resolve_colour( $attributes['inkOnLight'] ?? '', 'var(--wp--preset--color--text)' );
		$ink_dark   = sgs_header_ink_resolve_colour( $attributes['inkOnDark'] ?? '', 'var(--wp--preset--color--text-inverse)' );
		$fill_light = sgs_header_ink_resolve_fill( $attributes['fillOnLight'] ?? '', $attributes['fillOnLightGradient'] ?? '' );
		$fill_dark  = sgs_header_ink_resolve_fill( $attributes['fillOnDark'] ?? '', $attributes['fillOnDarkGradient'] ?? '' );

		$has_tone_fill = ( '' !== $fill_light ) || ( '' !== $fill_dark );
		$has_own_fill  = ( '' !== $resting_bg_color ) || ( '' !== $resting_bg_image );

		$modes = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$transparent_on  = isset( $transparent_effective[ $tier ] ) && 'on' === $transparent_effective[ $tier ];
			$modes[ $tier ]  = sgs_header_ink_mode_for_tier( $ink_tiers[ $tier ], $has_tone_fill, $has_own_fill, $transparent_on );
		}

		$media_by_tier = array(
			'desktop' => '@media (min-width:' . ( SGS_Breakpoints::TABLET_MAX + 1 ) . 'px)',
			'tablet'  => '@media (min-width:' . ( SGS_Breakpoints::MOBILE_MAX + 1 ) . 'px) and (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px)',
			'mobile'  => '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px)',
		);

		// Each tier's rule sits in its own exact-range query, so a tier with
		// ink off simply emits nothing and never has to cancel a wider tier.
		$css  = '';
		$live = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$rule = sgs_header_ink_mode_rule( $modes[ $tier ], $root_sel, $ink_dark, $ink_light, $fill_dark, $fill_light, $solid_first );
			if ( '' !== $rule ) {
				$css .= $media_by_tier[ $tier ] . '{' . $rule . '}';
			}
			$live_state = sgs_header_ink_live_state( $modes[ $tier ], $solid_first );
			if ( '' !== $live_state ) {
				$live[] = $tier . ':' . $live_state;
			}
		}

		// Transition — appended to the shared shorthand list (render.php's
		// $sh_shadow_tx_append), never a second writer of `transition`. Only
		// when ink actually paints something ('adapt' resolves to a real
		// mode) — 'blend' is instant, and 'none' needs no transition.
		$transition = '';
		$paints_ink = array() !== $live;
		if ( $paints_ink ) {
			$duration = sgs_motion_ms( $attributes['inkDuration'] ?? null, 400 );
			if ( $duration > 0 ) {
				$easing = sgs_motion_easing_css( (string) ( $attributes['inkEasing'] ?? 'ease' ), (string) ( $attributes['inkEasingCustom'] ?? '' ) );
				$props  = $has_tone_fill ? array( 'color', 'background-color' ) : array( 'color' );
				$parts  = array();
				foreach ( $props as $prop ) {
					$parts[] = $prop . ' ' . $duration . 'ms ' . $easing;
				}
				$transition = implode( ',', $parts );
			}
		}

		return array(
			'css'        => $css,
			'transition' => $transition,
			'any_adapt'  => $any_adapt,
			'live'       => implode( ' ', $live ),
		);
	}
}
