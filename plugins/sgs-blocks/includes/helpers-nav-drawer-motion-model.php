<?php
/**
 * Nav drawer on the Entrance model (Spec 38A FR-38A-51, unit M4.5): what the drawer reads from its motion layers.
 *
 * The panel and its items move on the Entrance and reveal panel, played by `assets/css/motion-triggers.css` on the
 * root's `data-sgs-motion-state`. The panel layer's timing feeds two things:
 *
 * - the scrim, which fades with the panel unless `scrimFadeDuration` sets its own time;
 * - the store's focus deferral: a panel entrance over 500ms moves focus in when it ends (`data-sgs-nd-focus-after-entry`).
 *
 * The panel's transform origin is anchor geometry, not a motion value: a header or container drawer grows from its top
 * edge and a trigger drawer from its corner. `sgs_nav_drawer_motion_origin_css()` writes it per tier as
 * `--sgs-nd-anim-origin`, and `nav-drawer/style.css` applies it to the root's `data-sgs-motion-state`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/class-sgs-breakpoints.php';

if ( ! function_exists( 'sgs_nav_drawer_anchor_origin' ) ) {
	/**
	 * The transform origin the panel's entrance scales and rotates around: `header` and `container` expand down from
	 * the header edge, a `trigger` drawer scales from its corner, and every other anchor is centred.
	 *
	 * @param string $anchor The drawer's anchor at one tier.
	 * @return string A CSS `transform-origin` value.
	 */
	function sgs_nav_drawer_anchor_origin( string $anchor ): string {
		$origins = array(
			'header'    => 'top center',
			'container' => 'top center',
			'trigger'   => 'top right',
		);
		return $origins[ $anchor ] ?? 'center';
	}
}

if ( ! function_exists( 'sgs_nav_drawer_open_layer' ) ) {
	/**
	 * The drawer panel's entrance: the root's `entrance.base` layer when its trigger is `open`.
	 *
	 * @param array $attributes Block attributes.
	 * @return array|null The layer, or null when the panel has no open entrance.
	 */
	function sgs_nav_drawer_open_layer( array $attributes ): ?array {
		$base = $attributes['sgsMotion']['elements']['root']['entrance']['base'] ?? null;
		if ( ! is_array( $base ) || 'open' !== ( $base['trigger'] ?? '' ) ) {
			return null;
		}
		return $base;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_motion_ms' ) ) {
	/**
	 * A stored duration as whole milliseconds; a token reference or junk gives null (the caller keeps its default).
	 *
	 * @param mixed $raw Stored duration.
	 * @return int|null
	 */
	function sgs_nav_drawer_motion_ms( $raw ): ?int {
		if ( ! is_int( $raw ) && ! is_float( $raw ) ) {
			return null;
		}
		return max( 0, min( 3000, (int) round( (float) $raw ) ) );
	}
}

if ( ! function_exists( 'sgs_nav_drawer_motion_timing' ) ) {
	/**
	 * The panel entrance's timing, for the scrim and the focus deferral.
	 *
	 * `enter_ms` is the open duration and `exit_ms` the close duration (falling back to the open duration, as the close
	 * rule in `motion-triggers.css` does), both null when the panel has no open entrance or stores a token. `easing` is
	 * the panel's easing as CSS (a token reference resolves to its custom property), '' when none is stored. `data`
	 * carries `sgs-nd-focus-after-entry` when the open duration is over 500ms.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{enter_ms:?int,exit_ms:?int,easing:string,data:array<string,string>}
	 */
	function sgs_nav_drawer_motion_timing( array $attributes ): array {
		$out   = array(
			'enter_ms' => null,
			'exit_ms'  => null,
			'easing'   => '',
			'data'     => array(),
		);
		$layer = sgs_nav_drawer_open_layer( $attributes );
		if ( null === $layer ) {
			return $out;
		}
		$values          = is_array( $layer['values'] ?? null ) ? $layer['values'] : array();
		$close           = is_array( $layer['close'] ?? null ) ? $layer['close'] : array();
		$out['enter_ms'] = sgs_nav_drawer_motion_ms( $values['duration'] ?? null );
		$out['exit_ms']  = array_key_exists( 'closeDuration', $close ) ? sgs_nav_drawer_motion_ms( $close['closeDuration'] ) : $out['enter_ms'];

		$easing = is_string( $values['easing'] ?? null ) ? $values['easing'] : '';
		if ( '' !== $easing && class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Field_Types' ) ) {
			$easing = \SGS\Blocks\Motion\Sgs_Motion_Field_Types::css( 'easing', $easing );
			$easing = $easing['ok'] && is_string( $easing['css'] ?? null ) ? $easing['css'] : '';
		} else {
			// No field-type validator to vet the stored string: fail closed rather than pass it to CSS.
			$easing = '';
		}
		$out['easing'] = $easing;

		if ( null !== $out['enter_ms'] && $out['enter_ms'] > 500 ) {
			$out['data']['sgs-nd-focus-after-entry'] = '';
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_nav_drawer_motion_origin_css' ) ) {
	/**
	 * The panel's anchor-derived transform origin: `--sgs-nd-anim-origin` per tier (`sgs_nav_drawer_anchor_origin()`).
	 * A tier follows the tier above it when its origin is the same; a drawer whose every
	 * tier is centred emits nothing, since the stylesheet's fallback is `center`.
	 *
	 * @param string $root_sel        The drawer's scoped root selector.
	 * @param mixed  $anchor_raw      The raw `anchor` tier object.
	 * @param array  $allowed_anchors The anchor allow-list.
	 * @return string Rules (the base declaration and any tier media queries), '' when every tier is centred.
	 */
	function sgs_nav_drawer_motion_origin_css( string $root_sel, $anchor_raw, array $allowed_anchors ): string {
		$origins = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$anchor = (string) sgs_resolve_tier( is_array( $anchor_raw ) ? $anchor_raw : array(), $tier, 'full-screen' )['value'];
			$anchor = in_array( $anchor, $allowed_anchors, true ) ? $anchor : 'full-screen';

			$origins[ $tier ] = sgs_nav_drawer_anchor_origin( $anchor );
		}
		if ( array( 'center' ) === array_values( array_unique( $origins ) ) ) {
			return '';
		}
		$css = $root_sel . '{--sgs-nd-anim-origin:' . $origins['desktop'] . ';}';
		if ( $origins['tablet'] !== $origins['desktop'] ) {
			$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $root_sel . '{--sgs-nd-anim-origin:' . $origins['tablet'] . ';}}';
		}
		if ( $origins['mobile'] !== $origins['tablet'] ) {
			$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $root_sel . '{--sgs-nd-anim-origin:' . $origins['mobile'] . ';}}';
		}
		return $css;
	}
}
