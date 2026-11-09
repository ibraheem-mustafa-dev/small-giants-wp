<?php
/**
 * Client font sizes that are already ranges keep their range on small screens.
 *
 * `assets/css/type-scale.css` steps the display presets down at the tablet and mobile tiers. A client preset
 * whose size is a `clamp()` already scales with the screen, so its value is restored after that stylesheet.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * The CSS that restores each client range at the small tiers, or an empty string when no preset is a range.
 *
 * @return string CSS.
 */
function type_scale_ranges_css(): string {
	$origins = wp_get_global_settings( array( 'typography', 'fontSizes' ) );
	$sizes   = array();
	foreach ( array( 'default', 'theme', 'custom' ) as $origin ) {
		foreach ( (array) ( $origins[ $origin ] ?? array() ) as $preset ) {
			if ( isset( $preset['slug'], $preset['size'] ) ) {
				$sizes[ $preset['slug'] ] = (string) $preset['size'];
			}
		}
	}

	if ( ! class_exists( '\SGS_Breakpoints' ) ) {
		return '';
	}

	$css = '';
	foreach ( array( 'x-large', 'xx-large', 'hero' ) as $slug ) {
		$size = $sizes[ $slug ] ?? '';
		if ( preg_match( '/^clamp\([0-9a-z.,+\-*\/%() ]+\)$/i', $size ) ) {
			$css .= \SGS_Breakpoints::media( 'tablet' ) . "{:root:root{--wp--preset--font-size--{$slug}:{$size};}}";
		}
	}
	return $css;
}
