<?php
/**
 * Text selection colour: loads selection.css only when the site's snapshot sets the pair.
 *
 * The snapshot's settings.custom.selection holds `background` and `colour`. With either unset the stylesheet is
 * not enqueued and the browser keeps its own selection colour; the push script refuses a snapshot that sets one
 * without the other (plugins/sgs-blocks/scripts/snapshot_selection_tokens.py).
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Whether the snapshot sets both selection colours.
 *
 * @return bool
 */
function selection_colours_set(): bool {
	$selection = global_custom_setting( 'selection' );
	if ( ! is_array( $selection ) ) {
		return false;
	}
	foreach ( array( 'background', 'colour' ) as $key ) {
		if ( ! isset( $selection[ $key ] ) || ! is_string( $selection[ $key ] ) || '' === trim( $selection[ $key ] ) ) {
			return false;
		}
	}
	return true;
}

/**
 * Enqueue the selection rule when the pair is set.
 */
function enqueue_selection_styles(): void {
	if ( ! selection_colours_set() ) {
		return;
	}
	$theme_version = wp_get_theme()->get( 'Version' );
	wp_enqueue_style(
		'sgs-selection',
		get_theme_file_uri( 'assets/css/selection.css' ),
		array( 'sgs-core-blocks-critical' ),
		asset_version( 'assets/css/selection.css', $theme_version )
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_selection_styles' );
