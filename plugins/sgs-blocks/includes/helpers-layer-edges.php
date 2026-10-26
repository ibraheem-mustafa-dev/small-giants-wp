<?php
/**
 * The Floating layer's edge offsets (sgs/decorative-image, Spec 02 FR-2-6).
 *
 * A layer is placed by its centre (`positionX`/`positionY`, a percentage of the section, with a
 * translate(-50%, -50%)) or by its edges: `positionTop`, `positionRight`, `positionBottom` and
 * `positionLeft`, each a per-device length object ({desktop, tablet, mobile}, any length the shared
 * length control stores, negative values included). Each axis is decided on its own: an axis whose
 * edge holds a value at any tier is anchored to its edges at every tier, so it prints its edge
 * offsets and neither its centre percentage nor its half of the centring translate. An axis with no
 * edge value keeps the centre model.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_layer_edges' ) ) {
	/**
	 * The layer's edge anchoring and its declarations per tier.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{x: bool, y: bool, tiers: array{desktop: string[], tablet: string[], mobile: string[]}}
	 *               `x` / `y`: whether that axis is anchored to its edges; `tiers`: the `top:…`, `right:…`,
	 *               `bottom:…` and `left:…` declarations each tier sets.
	 */
	function sgs_layer_edges( array $attributes ): array {
		$edges = array(
			'top'    => 'positionTop',
			'right'  => 'positionRight',
			'bottom' => 'positionBottom',
			'left'   => 'positionLeft',
		);
		$out   = array(
			'x'     => false,
			'y'     => false,
			'tiers' => array(
				'desktop' => array(),
				'tablet'  => array(),
				'mobile'  => array(),
			),
		);
		foreach ( $edges as $property => $attr ) {
			$tiers = sgs_responsive_normalise_object( $attributes[ $attr ] ?? null );
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$value = sgs_css_length_value( $tiers[ $tier ] ?? '' );
				if ( '' === $value ) {
					continue;
				}
				$out['tiers'][ $tier ][] = $property . ':' . $value;
				$out[ in_array( $property, array( 'left', 'right' ), true ) ? 'x' : 'y' ] = true;
			}
		}
		return $out;
	}
}
