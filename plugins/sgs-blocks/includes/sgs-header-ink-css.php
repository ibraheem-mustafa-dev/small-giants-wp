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
require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-motion-easing.php';
require_once __DIR__ . '/class-sgs-breakpoints.php';
require_once __DIR__ . '/sgs-header-ink-helpers.php';

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
			return array( 'css' => '', 'transition' => '', 'any_adapt' => false, 'live' => '' );
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
