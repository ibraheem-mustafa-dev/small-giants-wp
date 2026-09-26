<?php
/**
 * Safe reads of theme.json `settings.custom.<key>`.
 *
 * Asking core for a path under `custom` returns the WHOLE settings array
 * when that path is missing (core passes the full array as
 * `_wp_array_get()`'s default), so a missing key reads as a large, truthy,
 * wrong value. Read the whole tree once and index it instead.
 * `scripts/check-nested-global-settings.py` rejects the nested-path form.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_global_custom_setting' ) ) {
	/**
	 * The value at `settings.custom.<key>`, or null when it is not set.
	 *
	 * @param string $key Key under settings.custom.
	 * @return mixed|null
	 */
	function sgs_global_custom_setting( string $key ) {
		if ( ! function_exists( 'wp_get_global_settings' ) ) {
			return null;
		}
		$settings = wp_get_global_settings();
		if ( ! is_array( $settings ) || ! isset( $settings['custom'] ) || ! is_array( $settings['custom'] ) ) {
			return null;
		}
		return array_key_exists( $key, $settings['custom'] ) ? $settings['custom'][ $key ] : null;
	}
}
