<?php
/**
 * Nav drawer on the Entrance model (Spec 38A FR-38A-51, unit M4.5): what the drawer reads from its motion layers.
 *
 * During the overlap (build plan, "One model per block during the overlap") a drawer whose `sgsMotion` holds elements
 * or stagger settings is on the new model: the panel and its items move on the Entrance and reveal panel, played by
 * `assets/css/motion-triggers.css` on the root's `data-sgs-motion-state`, and the old U-5 motion
 * (`helpers-nav-drawer-motion.php::sgs_nav_drawer_motion`, the panel keyframe rules and the item ladders) is skipped
 * for it. A drawer with no `sgsMotion` keeps the old motion until the M6.5 sweep. On the new model the panel layer's
 * timing still feeds two things:
 *
 * - the scrim, which fades with the panel unless `scrimFadeDuration` sets its own time;
 * - the store's focus deferral: a panel entrance over 500ms moves focus in when it ends (`data-sgs-nd-focus-after-entry`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_drawer_uses_motion_model' ) ) {
	/**
	 * Whether the drawer is on the Entrance model: its `sgsMotion` holds elements or stagger settings.
	 *
	 * @param array $attributes Block attributes.
	 * @return bool
	 */
	function sgs_nav_drawer_uses_motion_model( array $attributes ): bool {
		$motion = $attributes['sgsMotion'] ?? null;
		return is_array( $motion ) && ( ! empty( $motion['elements'] ) || ! empty( $motion['stagger'] ) );
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
		} elseif ( 0 === strpos( $easing, 'token:' ) ) {
			$easing = '';
		}
		$out['easing'] = $easing;

		if ( null !== $out['enter_ms'] && $out['enter_ms'] > 500 ) {
			$out['data']['sgs-nd-focus-after-entry'] = '';
		}
		return $out;
	}
}
