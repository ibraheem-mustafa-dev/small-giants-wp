<?php
/**
 * Tick box look: a per-site token, loaded only when the site's snapshot asks for it.
 *
 * The snapshot's settings.custom.choiceControls is an object with optional keys `size`, `gap` and `accent`. A site
 * opts in by setting at least one of them to a non-empty string; an empty object, or one with no recognised key,
 * does not opt in. A site that wants the look with every default writes `"choiceControls": { "size": "22px" }`
 * (22px is the default size). WordPress prints the keys as --wp--custom--choice-controls--size, --gap and
 * --accent; assets/css/choice-controls.css reads them with 22px, 10px and the palette's accent colour as fallbacks.
 *
 * Opting in does two things: enqueues the stylesheet, and adds `sgs-choice-controls` to the body class. Block and
 * WooCommerce rules that drew a tick box before the look existed are wrapped so they stand down under that class
 * (plugins/sgs-blocks/src/blocks/{cart,form,gift-order}/style.css, assets/css/woocommerce.css). The block editor
 * canvas never loads the look, so it keeps drawing tick boxes as it did before.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * The keys of settings.custom.choiceControls that count as asking for the look.
 *
 * @return string[]
 */
function choice_controls_keys(): array {
	return array( 'size', 'gap', 'accent' );
}

/**
 * Whether the site's theme tokens ask for the tick box look.
 *
 * @return bool
 */
function choice_controls_enabled(): bool {
	$tokens = global_custom_setting( 'choiceControls' );
	if ( ! is_array( $tokens ) ) {
		return false;
	}
	foreach ( choice_controls_keys() as $key ) {
		if ( isset( $tokens[ $key ] ) && is_string( $tokens[ $key ] ) && '' !== trim( $tokens[ $key ] ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Enqueue the tick box stylesheet when the site opted in.
 */
function enqueue_choice_controls_styles(): void {
	if ( ! choice_controls_enabled() ) {
		return;
	}
	$theme_version = wp_get_theme()->get( 'Version' );
	// Synchronous, so no box repaints after first paint.
	wp_enqueue_style(
		'sgs-choice-controls',
		get_theme_file_uri( 'assets/css/choice-controls.css' ),
		array( 'sgs-core-blocks-critical' ),
		asset_version( 'assets/css/choice-controls.css', $theme_version )
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_choice_controls_styles' );

/**
 * Mark the body when the look is on, so the older per-block tick box rules stand down.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function add_choice_controls_body_class( array $classes ): array {
	if ( choice_controls_enabled() ) {
		$classes[] = 'sgs-choice-controls';
	}
	return $classes;
}
add_filter( 'body_class', __NAMESPACE__ . '\add_choice_controls_body_class' );
