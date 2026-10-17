<?php
/**
 * State-change motion on the Entrance model (Spec 38A FR-38A-53, unit M5.17): what `sgs/cart`, `sgs/nav-bar-menu` and
 * `sgs/accordion` read from their `sgsMotion` layers.
 *
 * - `sgs/cart`, the count pop: a layer on the `badge` part decides it. With a layer whose trigger is `state` and whose
 *   state is `count-changed` (pop when an item is added) or `count-loaded` (also once when the page loads), the cart
 *   publishes that state through `@sgs/motion-state` and the layer plays the pop. A layer with any other trigger plays by
 *   its own trigger and the count does not pop; a badge with no layer does not pop either.
 * - `sgs/nav-bar-menu`, the burger morph: the pose stays the `burgerMorph` attribute (the bars' geometry is derived
 *   from the icon box, which a layer cannot express); the speed and easing of the pose change come from the entrance
 *   layer on the `burger` part, whatever its trigger. The burger also publishes the state `menu-open` while its menu is
 *   open, so the layer's own from and to values can play too.
 * - `sgs/accordion`, the icon turn: a layer on the `turning-icon` part (the single turning icon, `.sgs-accordion-item__icon-open--rotates`)
 *   with trigger `state` and state `expanded` turns the icon; the accordion item prints that single icon whenever the
 *   layer exists, and `iconRotation` is ignored.
 *
 * Nothing here writes markup or an inline style.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_state_motion_layer' ) ) {
	/**
	 * One part's entrance layer (`elements.<part>.entrance.base`) from a block's `sgsMotion` attribute.
	 *
	 * @param mixed  $motion The block's `sgsMotion` attribute.
	 * @param string $part   Part key.
	 * @return array|null The layer, or null when the part has none.
	 */
	function sgs_state_motion_layer( $motion, string $part ): ?array {
		$base = is_array( $motion ) ? ( $motion['elements'][ $part ]['entrance']['base'] ?? null ) : null;
		return is_array( $base ) && array() !== $base ? $base : null;
	}
}

if ( ! function_exists( 'sgs_state_motion_state_of' ) ) {
	/**
	 * The state a layer plays on: its `state` when the trigger is `state`, else ''.
	 *
	 * @param array|null $layer An entrance base layer.
	 * @return string
	 */
	function sgs_state_motion_state_of( ?array $layer ): string {
		if ( null === $layer || 'state' !== ( $layer['trigger'] ?? '' ) ) {
			return '';
		}
		return is_string( $layer['state'] ?? null ) ? $layer['state'] : '';
	}
}

if ( ! function_exists( 'sgs_cart_count_pop_mode' ) ) {
	/**
	 * The cart count pop's mode when the badge part holds an Entrance layer.
	 *
	 * @param array $attributes Block attributes.
	 * @return string|null Null when the badge has no layer; otherwise `change`, `load-and-change` or `off` (the layer plays
	 *                     by a trigger other than the count states).
	 */
	function sgs_cart_count_pop_mode( array $attributes ): ?string {
		$layer = sgs_state_motion_layer( $attributes['sgsMotion'] ?? null, 'badge' );
		if ( null === $layer ) {
			return null;
		}
		switch ( sgs_state_motion_state_of( $layer ) ) {
			case 'count-changed':
				return 'change';
			case 'count-loaded':
				return 'load-and-change';
		}
		return 'off';
	}
}

if ( ! function_exists( 'sgs_nav_bar_burger_morph_timing' ) ) {
	/**
	 * The burger morph's speed and easing from the layer on the `burger` part.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{duration:string,easing:string} The CSS time and CSS easing the layer stores, each '' when the burger
	 *         has no layer or the layer stores none (the stylesheet's own fallback then applies); a token reference
	 *         prints as its theme custom property.
	 */
	function sgs_nav_bar_burger_morph_timing( array $attributes ): array {
		$out   = array(
			'duration' => '',
			'easing'   => '',
		);
		$layer = sgs_state_motion_layer( $attributes['sgsMotion'] ?? null, 'burger' );
		if ( null === $layer ) {
			return $out;
		}
		$values = is_array( $layer['values'] ?? null ) ? $layer['values'] : array();
		if ( class_exists( '\SGS\Blocks\Motion\Sgs_Motion_Field_Types' ) ) {
			foreach ( array(
				'duration' => 'duration',
				'easing'   => 'easing',
			) as $key => $type ) {
				if ( ! array_key_exists( $key, $values ) ) {
					continue;
				}
				$css = \SGS\Blocks\Motion\Sgs_Motion_Field_Types::css( $type, $values[ $key ] );
				if ( $css['ok'] && is_string( $css['css'] ?? null ) ) {
					$out[ $key ] = $css['css'];
				}
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_nav_bar_burger_morph_vars' ) ) {
	/**
	 * The burger morph's custom-property declarations from the burger layer's timing.
	 *
	 * @param array $attributes Block attributes.
	 * @return string `--sgs-nbm-burger-morph-duration:...;--sgs-nbm-burger-morph-easing:...;`, either part left out when empty.
	 */
	function sgs_nav_bar_burger_morph_vars( array $attributes ): string {
		$timing = sgs_nav_bar_burger_morph_timing( $attributes );
		return ( '' !== $timing['duration'] ? '--sgs-nbm-burger-morph-duration:' . $timing['duration'] . ';' : '' )
			. ( '' !== $timing['easing'] ? '--sgs-nbm-burger-morph-easing:' . $timing['easing'] . ';' : '' );
	}
}

if ( ! function_exists( 'sgs_accordion_icon_turn_on_model' ) ) {
	/**
	 * Whether the accordion's turning-icon part holds a `state` entrance on `expanded` (the icon turn is on the model).
	 *
	 * @param mixed $motion The accordion's `sgsMotion` attribute (the item reads it from block context).
	 * @return bool
	 */
	function sgs_accordion_icon_turn_on_model( $motion ): bool {
		return 'expanded' === sgs_state_motion_state_of( sgs_state_motion_layer( $motion, 'turning-icon' ) );
	}
}
