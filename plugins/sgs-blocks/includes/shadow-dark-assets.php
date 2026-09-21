<?php
/**
 * Dark-background shadow presets: the stylesheet for a dark container's children.
 *
 * `helpers-shadow-dark.php` derives a dark variant of every theme shadow preset (a black shadow at
 * higher opacity plus a 1px light ring). This file registers that stylesheet for the `.sgs-on-dark`
 * scope, which `SGS_Container_Wrapper` adds to a container with a dark solid background. The
 * stylesheet is REGISTERED on every request but only ENQUEUED when a dark container renders
 * (`sgs_shadow_dark_enqueue()` is called from the wrapper), so a page with no dark container ships
 * none of it. In the block editor it is always enqueued. The editor canvas does not yet get the
 * `sgs-on-dark` class itself (the container's edit.js renders on the client), so a dark container's
 * children show the ordinary shadows there; the page shows the dark variants.
 *
 * A light container nested inside a dark one resets the presets with the `light` scope
 * (`.sgs-on-light>*`), which is emitted next to every dark scope.
 *
 * Site-wide dark mode (`[data-theme="dark"]` and the operating-system preference) is emitted by the
 * theme next to `dark-mode.css`, because only the theme knows whether dark mode is switched on.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-shadow-dark.php';

/**
 * Register the dark-scope stylesheet (and enqueue it in the editor).
 *
 * @return void
 */
function sgs_shadow_dark_register(): void {
	$css = sgs_shadow_dark_preset_css( 'section' ) . sgs_shadow_dark_preset_css( 'light' );
	if ( '' === $css ) {
		return;
	}
	wp_register_style( 'sgs-shadow-dark', false, array(), SGS_BLOCKS_VERSION );
	wp_add_inline_style( 'sgs-shadow-dark', $css );
	if ( is_admin() ) {
		wp_enqueue_style( 'sgs-shadow-dark' );
	}
}
add_action( 'enqueue_block_assets', 'sgs_shadow_dark_register' );

/**
 * Enqueue the dark-scope stylesheet. Called by the container wrapper when it adds `sgs-on-dark`.
 *
 * @return void
 */
function sgs_shadow_dark_enqueue(): void {
	if ( wp_style_is( 'sgs-shadow-dark', 'registered' ) ) {
		wp_enqueue_style( 'sgs-shadow-dark' );
	}
}
