<?php
/**
 * One border per device as responsive property specs. The stored shape is `{desktop|tablet|mobile: {width, style,
 * colour}}`, edited by src/components/TierBorderControl.js and emitted through sgs_emit_responsive_css().
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-tokens.php';

if ( ! function_exists( 'sgs_tiered_border_specs' ) ) {
	/**
	 * Responsive property specs for sgs_emit_responsive_css(): width a CSS length, style `none|solid|dashed|dotted`,
	 * colour a palette slug or any colour. A member a device leaves empty inherits the device above's, so each member
	 * is its own spec; a value that fails its check contributes nothing.
	 *
	 * @param mixed  $raw    The stored tier object.
	 * @param string $prefix CSS property prefix: 'border' (all sides) or 'border-bottom'.
	 * @return array<int, array<string, mixed>> Specs; empty when nothing is set.
	 */
	function sgs_tiered_border_specs( $raw, string $prefix = 'border' ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$prefix  = (string) preg_replace( '/[^a-z-]/', '', strtolower( $prefix ) );
		$members = array(
			'width'  => array(
				'css'          => $prefix . '-width',
				'unit_default' => 'px',
			),
			'style'  => array(
				'css'       => $prefix . '-style',
				'transform' => static function ( $value ) {
					$style = is_string( $value ) ? strtolower( trim( $value ) ) : '';
					return in_array( $style, array( 'none', 'solid', 'dashed', 'dotted' ), true ) ? $style : null;
				},
			),
			'colour' => array(
				'css'       => $prefix . '-color',
				'transform' => static function ( $value ) {
					return sgs_colour_value( is_string( $value ) ? $value : '' );
				},
			),
		);
		$specs   = array();
		foreach ( $members as $member => $spec ) {
			$tiers = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$value = is_array( $raw[ $tier ] ?? null ) ? ( $raw[ $tier ][ $member ] ?? null ) : null;
				if ( null !== $value && '' !== $value ) {
					$tiers[ $tier ] = $value;
				}
			}
			if ( $tiers ) {
				$specs[] = array( 'value' => $tiers ) + $spec;
			}
		}
		return $specs;
	}
}
