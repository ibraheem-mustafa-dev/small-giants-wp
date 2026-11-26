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
	$presets = is_array( $presets ) ? $presets : array();
	// WordPress returns the origins as default, theme, custom, but the CSS variable follows custom, then theme, then
	// default, and so does the editor (`src/utils/shadow-presets.js`), so a shadow edited in Global Styles wins here too.
	$origins = array();
	foreach ( array( 'custom', 'theme', 'default' ) as $origin_name ) {
		if ( isset( $presets[ $origin_name ] ) ) {
			$origins[] = $presets[ $origin_name ];
		}
	}
	// A flat list (no origin keys) is one origin.
	if ( array() === $origins && array() !== $presets && isset( $presets[0] ) ) {
		$origins[] = $presets;
	}
	foreach ( $origins as $origin ) {
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

/**
 * The declarations one composed shadow prints, in either of the two modes every SGS shadow can draw in.
 *
 * - Box mode (the default): `box-shadow`, plus the nested forced-colours outline fallback under `@forced-colors`
 *   (no fallback for `none`).
 * - Follow-the-shape mode (`$follow_shape`): `filter:drop-shadow()`, one per layer, for a surface a mask or clip cuts
 *   into a shape. A box-shadow would be clipped with the box, so the filter follows the cut-out outline instead. The
 *   caller prints it on a node OUTSIDE the clipped one (the mask node's parent), because a filter on the clipped node
 *   is clipped too. A filter has no spread and no inset, and chains its layers one after another, so a layered shadow
 *   looks a little different from the same layers as a box-shadow; forced colours does not recolour a filter, so no
 *   outline fallback is printed in this mode.
 *
 * JS twin: `src/utils/shadow-output.js::shadowDeclMap()`. Both are pinned to
 * `tests/shared/shadow-output-cases.json`.
 *
 * @param string $composed     Value from sgs_shadow_layers() (a bare preset reference is resolved in follow mode).
 * @param bool   $follow_shape Print `filter:drop-shadow()` instead of `box-shadow`.
 * @return array<string,string> Property => value (`box-shadow`, `@forced-colors`, `filter`), empty when nothing draws.
 */
function sgs_shadow_decl_map( string $composed, bool $follow_shape = false ): array {
	if ( '' === $composed ) {
		return array();
	}
	if ( $follow_shape ) {
		$filter = 'none' === $composed ? 'none' : sgs_shadow_value_to_drop_shadow( $composed );
		return '' === $filter ? array() : array( 'filter' => $filter );
	}
	$out = array( 'box-shadow' => $composed );
	if ( 'none' !== $composed ) {
		$out['@forced-colors'] = sgs_shadow_forced_colours_decl();
	}
	return $out;
}

/**
 * The follow-the-shape declarations of one composed shadow as a list ready to implode with ';', the shape
 * `sgs_shadow_box_decls()` returns for box mode.
 *
 * @param string $composed Value from sgs_shadow_layers().
 * @return string[] `filter:drop-shadow(...)`, or none when a filter can draw nothing.
 */
function sgs_shadow_follow_decls( string $composed ): array {
	$props = sgs_shadow_decl_map( $composed, true );
	return isset( $props['filter'] ) ? array( 'filter:' . $props['filter'] ) : array();
}
