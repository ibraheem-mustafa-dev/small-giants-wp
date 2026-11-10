<?php
/**
 * Tier media: the image branch of `sgs_tier_media_render()`.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_tier_media_image_html' ) ) {
	/**
	 * One tier's `<img>`: a sized, attachment-backed image when an id exists, a plain tag otherwise.
	 *
	 * @param array  $spec          The tier spec ( `media`: id, url, width, height ).
	 * @param string $class_attr    Space-separated classes.
	 * @param string $alt           Alt text for this tier.
	 * @param string $loading       `eager` or `lazy`.
	 * @param string $fetchpriority `high`, `low` or `auto`.
	 * @return string The image markup.
	 */
	function sgs_tier_media_image_html( array $spec, string $class_attr, string $alt, string $loading, string $fetchpriority ): string {
		$media = is_array( $spec['media'] ?? null ) ? $spec['media'] : array();
		$attrs = array(
			'class'         => $class_attr,
			'loading'       => $loading,
			'decoding'      => 'async',
			'fetchpriority' => $fetchpriority,
		);
		if ( ! empty( $media['width'] ) ) {
			$attrs['width'] = absint( $media['width'] );
		}
		if ( ! empty( $media['height'] ) ) {
			$attrs['height'] = absint( $media['height'] );
		}
		return sgs_responsive_image(
			! empty( $media['id'] ) ? absint( $media['id'] ) : 0,
			(string) ( $media['url'] ?? '' ),
			$alt,
			'large',
			$attrs
		);
	}
}
