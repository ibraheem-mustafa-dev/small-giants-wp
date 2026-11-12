<?php
/**
 * How a small fixed thumbnail fills its box: one Fit per device, printed as `object-fit` (Spec 49 §10.4, §8.2).
 *
 * The cart, product search, mega panel and Google reviews blocks keep their own thumbnail attributes
 * (`objectFit`, `objectFitTablet`, `objectFitMobile`): the picture is built by the block's own script or by a child
 * block, so it is not a media slot. This prints those attributes as scoped rules with `sgs_emit_responsive_css`, on
 * the thumbnail's own selector, and prints nothing when no Fit is set (the block's stylesheet crops to fill).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/helpers-responsive.php';
require_once dirname( __DIR__ ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_fixed_thumb_fit_css' ) ) {
	/**
	 * Scoped `object-fit` rules for a block's fixed thumbnail.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $block_slug Block name, e.g. `sgs/cart`.
	 * @param string $selector   Fully-formed, already-safe selector of the thumbnail.
	 * @return string CSS, '' when no Fit is set.
	 */
	function sgs_fixed_thumb_fit_css( array $attributes, string $block_slug, string $selector ): string {
		$allowed = array( 'cover', 'contain', 'fill', 'none', 'scale-down' );
		$value   = array();
		foreach ( array(
			'desktop' => 'ObjectFit',
			'tablet'  => 'ObjectFitTablet',
			'mobile'  => 'ObjectFitMobile',
		) as $device => $base ) {
			$raw = $attributes[ sgs_media_element_stored_attr( $block_slug, '', $base ) ] ?? null;
			if ( is_string( $raw ) && in_array( $raw, $allowed, true ) ) {
				$value[ $device ] = $raw;
			}
		}
		if ( array() === $value ) {
			return '';
		}
		return sgs_emit_responsive_css(
			$selector,
			array(
				array(
					'value'     => $value,
					'css'       => 'object-fit',
					'transform' => static fn( $raw ) => is_string( $raw ) ? $raw : null,
				),
			)
		);
	}
}
