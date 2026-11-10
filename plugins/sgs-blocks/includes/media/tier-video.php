<?php
/**
 * Tier media: the video branch of `sgs_tier_media_render()`.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_tier_media_video_html' ) ) {
	/**
	 * One tier's `<video>`. Only the base tier preloads: a hidden video does not autoplay and, with
	 * `preload="none"`, does not fetch.
	 *
	 * @param array  $spec       The tier spec ( `media`: url ).
	 * @param string $tier       `desktop`, `tablet` or `mobile`.
	 * @param string $class_attr Space-separated classes.
	 * @param bool   $autoplay   True to autoplay, false to show controls instead.
	 * @return string The video markup.
	 */
	function sgs_tier_media_video_html( array $spec, string $tier, string $class_attr, bool $autoplay ): string {
		$media = is_array( $spec['media'] ?? null ) ? $spec['media'] : array();
		return sprintf(
			'<video class="%s"%s loop muted playsinline preload="%s"><source src="%s" type="video/mp4"></video>',
			esc_attr( $class_attr ),
			$autoplay ? ' autoplay' : ' controls',
			'desktop' === $tier ? 'metadata' : 'none',
			esc_url( (string) ( $media['url'] ?? '' ) )
		);
	}
}
