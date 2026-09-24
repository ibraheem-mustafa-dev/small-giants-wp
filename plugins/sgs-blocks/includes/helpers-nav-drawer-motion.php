<?php
/**
 * Nav drawer entry and exit motion (Wave 3C U-5, families M-31 and M-32).
 *
 * Resolves the drawer's motion attributes into scoped CSS custom-property
 * VALUES (never inline declarations, Spec 32). `nav-drawer/style.css` owns the
 * keyframes and the rules that read these properties; `nav-drawer-menu/style.css`
 * owns the per-item stagger rules. The close lifecycle in
 * `src/shared/nav-interactivity/store.js` waits on every animation these rules
 * start, so any duration here is honoured on close.
 *
 * Design: `.claude/reports/2026-09-24-u5-motion-design.md` section 3.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-motion-easing.php';
require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/class-sgs-breakpoints.php';

if ( ! function_exists( 'sgs_nav_drawer_motion_shapes' ) ) {
	/**
	 * Every `entryAnimation` value. Mirrors the JSON enum of the tier values.
	 *
	 * @return array<int,string>
	 */
	function sgs_nav_drawer_motion_shapes(): array {
		return array( 'auto', 'none', 'fade', 'slide-start', 'slide-end', 'slide-up', 'slide-down', 'wipe-down', 'wipe-down-skew', 'reveal-from-bar', 'curtain', 'scale' );
	}
}

if ( ! function_exists( 'sgs_nav_drawer_motion_keyframes' ) ) {
	/**
	 * The keyframe pair and transform origin for one resolved shape.
	 *
	 * `auto` follows the drawer's anchor at the same tier: `header` expands
	 * down from the header edge, `trigger` scales from its corner, `centred`
	 * scales up like a modal, and `full-screen` keeps the -8px nudge.
	 *
	 * @param string $shape  A value from sgs_nav_drawer_motion_shapes().
	 * @param string $anchor The drawer's anchor at the same tier.
	 * @return array{in:string,out:string,origin:string}
	 */
	function sgs_nav_drawer_motion_keyframes( string $shape, string $anchor ): array {
		if ( 'auto' === $shape ) {
			$auto  = array(
				'header'  => 'expand-down',
				'trigger' => 'corner-scale',
				'centred' => 'modal-scale',
			);
			$shape = $auto[ $anchor ] ?? 'nudge';
		}
		$map = array(
			'nudge'           => array( 'sgs-nav-drawer-in', 'sgs-nav-drawer-out', 'center' ),
			'expand-down'     => array( 'sgs-nav-drawer-expand-down-in', 'sgs-nav-drawer-expand-down-out', 'top center' ),
			'corner-scale'    => array( 'sgs-nav-drawer-corner-scale-in', 'sgs-nav-drawer-corner-scale-out', 'top right' ),
			'modal-scale'     => array( 'sgs-nav-drawer-modal-scale-in', 'sgs-nav-drawer-modal-scale-out', 'center' ),
			'scale'           => array( 'sgs-nav-drawer-modal-scale-in', 'sgs-nav-drawer-modal-scale-out', 'center' ),
			'none'            => array( 'none', 'none', 'center' ),
			'fade'            => array( 'sgs-nav-drawer-fade-in', 'sgs-nav-drawer-fade-out', 'center' ),
			'slide-start'     => array( 'sgs-nav-drawer-slide-start-in', 'sgs-nav-drawer-slide-start-out', 'center' ),
			'slide-end'       => array( 'sgs-nav-drawer-slide-end-in', 'sgs-nav-drawer-slide-end-out', 'center' ),
			'slide-up'        => array( 'sgs-nav-drawer-slide-up-in', 'sgs-nav-drawer-slide-up-out', 'center' ),
			'slide-down'      => array( 'sgs-nav-drawer-slide-down-in', 'sgs-nav-drawer-slide-down-out', 'center' ),
			'wipe-down'       => array( 'sgs-nav-drawer-wipe-down-in', 'sgs-nav-drawer-wipe-down-out', 'center' ),
			'wipe-down-skew'  => array( 'sgs-nav-drawer-wipe-skew-in', 'sgs-nav-drawer-wipe-skew-out', 'center' ),
			'reveal-from-bar' => array( 'sgs-nav-drawer-reveal-bar-in', 'sgs-nav-drawer-reveal-bar-out', 'center' ),
			'curtain'         => array( 'sgs-nav-drawer-curtain-host', 'sgs-nav-drawer-curtain-host', 'center' ),
		);
		$row = $map[ $shape ] ?? $map['nudge'];
		return array(
			'in'     => $row[0],
			'out'    => $row[1],
			'origin' => $row[2],
		);
	}
}

if ( ! function_exists( 'sgs_nav_drawer_motion_tier_decls' ) ) {
	/**
	 * The custom-property declarations for one tier's shape.
	 *
	 * @param string $shape  Resolved shape at this tier.
	 * @param string $anchor Resolved anchor at this tier.
	 * @return string Declarations, no selector.
	 */
	function sgs_nav_drawer_motion_tier_decls( string $shape, string $anchor ): string {
		$frames  = sgs_nav_drawer_motion_keyframes( $shape, $anchor );
		$curtain = 'curtain' === $shape;
		return '--sgs-nd-anim-in:' . $frames['in'] . ';'
			. '--sgs-nd-anim-out:' . $frames['out'] . ';'
			. '--sgs-nd-anim-origin:' . $frames['origin'] . ';'
			. '--sgs-nd-curtain-in:' . ( $curtain ? 'sgs-nav-drawer-curtain-sweep-in' : 'none' ) . ';'
			. '--sgs-nd-curtain-out:' . ( $curtain ? 'sgs-nav-drawer-curtain-sweep-out' : 'none' ) . ';'
			. '--sgs-nd-body-in:' . ( $curtain ? 'sgs-nav-drawer-fade-in' : 'none' ) . ';'
			. '--sgs-nd-body-out:' . ( $curtain ? 'sgs-nav-drawer-fade-out' : 'none' ) . ';';
	}
}

if ( ! function_exists( 'sgs_nav_drawer_motion' ) ) {
	/**
	 * Build the drawer's motion CSS, root classes and root data attributes.
	 *
	 * @param array  $attributes      Block attributes.
	 * @param string $root_sel        The drawer's scoped root selector.
	 * @param mixed  $anchor_raw      The raw `anchor` tier object.
	 * @param array  $allowed_anchors The anchor allow-list.
	 * @return array{css:string,classes:array<int,string>,data:array<string,string>,enter_ms:int,exit_ms:int,easing:string}
	 */
	function sgs_nav_drawer_motion( array $attributes, string $root_sel, $anchor_raw, array $allowed_anchors ): array {
		$shapes = sgs_nav_drawer_motion_shapes();
		$raw    = is_array( $attributes['entryAnimation'] ?? null ) ? $attributes['entryAnimation'] : array();

		$decls = array();
		$used  = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$shape = (string) sgs_resolve_tier( $raw, $tier, 'auto' )['value'];
			$shape = in_array( $shape, $shapes, true ) ? $shape : 'auto';

			$anchor = (string) sgs_resolve_tier( is_array( $anchor_raw ) ? $anchor_raw : array(), $tier, 'full-screen' )['value'];
			$anchor = in_array( $anchor, $allowed_anchors, true ) ? $anchor : 'full-screen';

			$decls[ $tier ] = sgs_nav_drawer_motion_tier_decls( $shape, $anchor );
			$used[ $shape ] = true;
		}

		$enter_ms = sgs_motion_ms( $attributes['entryDuration'] ?? 250, 250 );
		$exit_ms  = sgs_motion_ms( $attributes['exitDuration'] ?? 200, 200 );
		$easing   = sgs_motion_easing_css( (string) ( $attributes['entryEasing'] ?? 'ease-out-css' ), (string) ( $attributes['entryEasingCustom'] ?? '' ), 'ease-out' );
		$fade     = ! array_key_exists( 'entryFade', $attributes ) || ! empty( $attributes['entryFade'] );

		$base = $decls['desktop']
			. '--sgs-nd-enter-dur:' . $enter_ms . 'ms;'
			. '--sgs-nd-exit-dur:' . $exit_ms . 'ms;'
			. '--sgs-nd-ease:' . $easing . ';'
			. '--sgs-nd-from-opacity:' . ( $fade ? '0' : '1' ) . ';';

		$curtain_gradient = sgs_css_gradient_value( (string) ( $attributes['curtainColourGradient'] ?? '' ) );
		$curtain_colour   = '' !== $curtain_gradient ? $curtain_gradient : sgs_colour_value( (string) ( $attributes['curtainColour'] ?? '' ) );
		if ( '' !== $curtain_colour ) {
			$base .= '--sgs-nd-curtain-colour:' . $curtain_colour . ';';
		}

		$classes = array();
		$data    = array();

		$step = sgs_motion_ms( $attributes['itemStagger'] ?? 0, 0, 1000 );
		if ( $step > 0 ) {
			$classes[] = 'sgs-nav-drawer--stagger';
			$item_ms   = sgs_motion_ms( $attributes['itemStaggerDuration'] ?? 0, 0 );
			$max_ms    = sgs_motion_ms( $attributes['itemStaggerMax'] ?? 0, 0, 10000 );
			$base     .= '--sgs-nd-stagger-step:' . $step . 'ms;'
				. '--sgs-nd-stagger-dur:' . ( $item_ms > 0 ? $item_ms : $enter_ms ) . 'ms;';
			if ( $max_ms > 0 ) {
				$base .= '--sgs-nd-stagger-max:' . $max_ms . 'ms;';
			}
			if ( ! empty( $attributes['itemStaggerOnClose'] ) ) {
				$classes[] = 'sgs-nav-drawer--stagger-close';
			}
		}

		if ( isset( $used['curtain'] ) ) {
			$classes[] = 'sgs-nav-drawer--curtain';
		}
		if ( $enter_ms > 500 ) {
			$data['sgs-nd-focus-after-entry'] = '';
		}

		$css = $root_sel . '{' . $base . '}';
		if ( $decls['tablet'] !== $decls['desktop'] ) {
			$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $root_sel . '{' . $decls['tablet'] . '}}';
		}
		if ( $decls['mobile'] !== $decls['tablet'] ) {
			$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $root_sel . '{' . $decls['mobile'] . '}}';
		}

		// The item travel distance is a tier object (studionamma: 168px on a phone, 387px on desktop).
		if ( $step > 0 ) {
			$css .= sgs_emit_responsive_css(
				$root_sel,
				array(
					array(
						'css'       => '--sgs-nd-stagger-dist',
						'value'     => sgs_responsive_normalise_object( $attributes['itemStaggerDistance'] ?? array() ),
						'transform' => 'sgs_nav_drawer_motion_distance',
					),
				)
			);
		}

		return array(
			'css'      => $css,
			'classes'  => $classes,
			'data'     => $data,
			'enter_ms' => $enter_ms,
			'exit_ms'  => $exit_ms,
			'easing'   => $easing,
		);
	}
}

if ( ! function_exists( 'sgs_nav_drawer_motion_distance' ) ) {
	/**
	 * One tier's item travel distance: a bare number is pixels, and negative
	 * means the item falls from above.
	 *
	 * @param mixed $raw Raw tier value.
	 * @return string|null CSS length, or null for "not set".
	 */
	function sgs_nav_drawer_motion_distance( $raw ) {
		if ( ! is_numeric( $raw ) ) {
			return null;
		}
		return (string) max( -2000, min( 2000, (int) round( (float) $raw ) ) ) . 'px';
	}
}
