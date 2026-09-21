<?php
/**
 * Shadow to `filter: drop-shadow()` converter.
 *
 * Some surfaces cannot use `box-shadow` because the element clips its own box-shadow with
 * `overflow` (the nav submenu panel scrolls, so it needs `overflow-y:auto`). A `filter` is not
 * clipped by the element's own overflow, so those surfaces draw the shadow with
 * `filter: drop-shadow()` instead.
 *
 * `drop-shadow()` takes `<length>{2,3} <colour>?`: offset X, offset Y, an optional blur and a
 * colour. It has no spread and no inset. A stored shadow can have several layers, so this
 * chains one `drop-shadow()` per layer, drops each layer's spread, and skips inset layers (an
 * inner effect has no filter equivalent). A theme preset is a CSS custom property that a filter
 * cannot split into layers, so it is read back from the theme's own settings and converted the
 * same way; a preset that cannot be read draws nothing rather than emitting invalid CSS.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-shadow-layers.php';

/**
 * The literal shadow value of a theme preset, from the theme's settings.
 *
 * @param string $slug Preset slug.
 * @return string Literal shadow, or '' when the preset is not found.
 */
function sgs_shadow_preset_literal( string $slug ): string {
	if ( ! function_exists( 'wp_get_global_settings' ) ) {
		return '';
	}
	$presets = wp_get_global_settings( array( 'shadow', 'presets' ) );
	foreach ( is_array( $presets ) ? $presets : array() as $origin ) {
		foreach ( is_array( $origin ) ? $origin : array() as $preset ) {
			if ( is_array( $preset ) && ( $preset['slug'] ?? '' ) === $slug && is_string( $preset['shadow'] ?? null ) ) {
				return $preset['shadow'];
			}
		}
	}
	return '';
}

/**
 * Convert a composed `box-shadow` value into a `filter` value: one `drop-shadow()` per layer.
 *
 * @param string $composed Value from sgs_shadow_layers() (or a preset reference).
 * @return string Filter value such as `drop-shadow(0px 4px 12px #000) drop-shadow(...)`, or ''
 *                when there is nothing a filter can draw.
 */
function sgs_shadow_value_to_drop_shadow( string $composed ): string {
	$composed = trim( $composed );
	if ( '' === $composed || 'none' === $composed ) {
		return '';
	}
	if ( 1 === preg_match( '/^var\(--wp--preset--shadow--([a-z0-9-]+)\)$/', $composed, $match ) ) {
		$literal = sgs_shadow_preset_literal( $match[1] );
		if ( '' === $literal ) {
			return '';
		}
		$composed = sgs_shadow_layers( $literal, null );
	}
	$filters = array();
	foreach ( sgs_shadow_split_top( $composed, ',' ) as $layer ) {
		$fields = sgs_shadow_parse_layer( $layer );
		if ( null === $fields || $fields['inset'] || null === $fields['colour'] ) {
			continue;
		}
		$filters[] = 'drop-shadow('
			. sgs_shadow_format_length( $fields['x'] ) . ' '
			. sgs_shadow_format_length( $fields['y'] ) . ' '
			. sgs_shadow_format_length( $fields['blur'] ) . ' '
			. $fields['colour'] . ')';
	}
	return implode( ' ', $filters );
}
