<?php
/**
 * Client font sizes that are already ranges keep their range on small screens.
 *
 * `assets/css/type-scale.css` steps the display presets down at the tablet and mobile tiers. A client preset
 * whose size is fluid (a viewport-unit length, or a `clamp()`, `min()`, `max()` or `calc()` that uses a viewport or
 * container unit) already scales with the screen, so its value is restored after that stylesheet.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Whether a preset size is fluid: a bare viewport-unit length, or a `clamp()`, `min()`, `max()` or `calc()` call with a
 * viewport or container unit in it. A value carrying a comment marker or unbalanced parentheses is never fluid.
 *
 * @param string $size Preset size.
 * @return bool True when the size scales with the viewport or container.
 */
function is_fluid_size( string $size ): bool {
	if ( str_contains( $size, '/*' ) || str_contains( $size, '*/' ) ) {
		return false;
	}
	$unit = '(?:vmin|vmax|svw|lvw|dvw|cqw|cqi|vw|vh|vi|vb)(?![a-z])';
	if ( 1 === preg_match( '/^-?[0-9]*\.?[0-9]+' . $unit . '$/i', $size ) ) {
		return true;
	}
	return 1 === preg_match( '/^(?:clamp|min|max|calc)(\((?:[0-9a-z.,+\-*\/% ]|(?1))*\))$/i', $size )
		&& 1 === preg_match( '/[0-9.]' . $unit . '/i', $size );
}

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
		if ( is_fluid_size( $size ) ) {
			$css .= \SGS_Breakpoints::media( 'tablet' ) . "{:root:root{--wp--preset--font-size--{$slug}:{$size};}}";
		}
	}
	return $css;
}
