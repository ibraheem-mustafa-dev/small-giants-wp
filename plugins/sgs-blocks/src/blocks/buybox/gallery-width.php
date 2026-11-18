<?php
/**
 * Buy box gallery width: how wide the main photo's column is at each device, for the photo's `sizes`.
 *
 * The buy box is a two-column grid (gallery column, then configurator column) from the tablet width up, or from the
 * desktop width up when `stackBelow` is `tablet`; below that the gallery stacks above the configurator at the full width.
 * The gallery track is `minmax(0, {ratio}fr)` against the configurator's `minmax(0, 1fr)`, so it takes
 * `ratio / (ratio + 1)` of the row less the gap. `ratio` is `galleryColumnRatio`, or the stylesheet's 1.15 when that is 0.
 * `gap` is `galleryColumnGap` (a length, a spacing preset, or one per device), or the stylesheet's
 * `clamp(1.5rem, 4vw, 3rem)`.
 *
 * Every figure is an upper bound, as in `Sgs_Layout_Width`: the gap is taken at its smallest, so the column is never
 * narrower than the model says and the browser never picks a file too small.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_gallery_gap_px' ) ) {
	/**
	 * The smallest gap in px the gallery grid can have at one device.
	 *
	 * @param mixed $gap The stored `galleryColumnGap` value for the device ('' for the stylesheet's own).
	 * @return float Px, 0 when the value is not a readable length.
	 */
	function sgs_buybox_gallery_gap_px( $gap ): float {
		if ( is_numeric( $gap ) && (string) (int) $gap === (string) $gap && ! in_array( (string) $gap, sgs_css_length_value_preset_slugs(), true ) ) {
			// A bare number in the per-device object is px (the same unit the scoped rule is printed in).
			return (float) $gap;
		}
		$gap = is_string( $gap ) || is_numeric( $gap ) ? sgs_css_length_value( (string) $gap ) : '';
		if ( '' === $gap ) {
			// The stylesheet's `clamp(1.5rem, 4vw, 3rem)`: 1.5rem is the least.
			return 24.0;
		}
		return (float) Sgs_Layout_Width::length_bounds( $gap )[0];
	}
}

if ( ! function_exists( 'sgs_buybox_gallery_avail' ) ) {
	/**
	 * The width model of the buy box's gallery column per device, for the main photo's `sizes`.
	 *
	 * @param array      $attributes Buy box attributes.
	 * @param array|null $own        The buy box's own box per device (`Sgs_Layout_Width::own()`); null when the layout is unknown.
	 * @return array|null Device => `{vw, off, cap}`; null when the layout is unknown (the renderer keeps its own fallback).
	 */
	function sgs_buybox_gallery_avail( array $attributes, ?array $own ): ?array {
		if ( null === $own || ! class_exists( 'Sgs_Layout_Width' ) || ! function_exists( 'sgs_media_device_values' ) ) {
			return null;
		}
		$ratio   = (float) ( $attributes['galleryColumnRatio'] ?? 0 );
		$ratio   = $ratio > 0 ? $ratio : 1.15;
		$share   = $ratio / ( $ratio + 1 );
		$tablet  = 'tablet' === ( $attributes['stackBelow'] ?? 'mobile' );
		$gaps    = sgs_media_device_values( $attributes['galleryColumnGap'] ?? '' );
		$stacked = array(
			'desktop' => false,
			'tablet'  => $tablet,
			'mobile'  => true,
		);
		$out     = array();
		foreach ( sgs_media_devices() as $device ) {
			if ( ! isset( $own[ $device ] ) ) {
				return null;
			}
			$out[ $device ] = $stacked[ $device ]
				? $own[ $device ]
				: Sgs_Layout_Width::scaled( Sgs_Layout_Width::shifted( $own[ $device ], -sgs_buybox_gallery_gap_px( $gaps[ $device ] ?? '' ) ), $share );
		}
		return $out;
	}
}
