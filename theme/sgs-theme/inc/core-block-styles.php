<?php
/**
 * Block style variations for core blocks, chosen in the editor's Styles panel.
 *
 * "Plain lists" on Post Content (and the product description it shows) draws the
 * lists inside it as plain lines: no markers, no indent, lines spaced by
 * --sgs-plain-list-gap (0.7em unless a site sets it).
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the core block style variations.
 *
 * @return void
 */
function register_core_block_styles(): void {
	register_block_style(
		'core/post-content',
		array(
			'name'         => 'sgs-plain-lists',
			'label'        => __( 'Plain lists', 'sgs-theme' ),
			'inline_style' => '.wp-block-post-content.is-style-sgs-plain-lists :where(ul,ol){list-style:none;margin-left:0;padding-left:0;display:flex;flex-direction:column;gap:var(--sgs-plain-list-gap,0.7em)}'
				. '.wp-block-post-content.is-style-sgs-plain-lists :where(ul,ol) > li{margin:0}',
		)
	);
}
add_action( 'init', __NAMESPACE__ . '\register_core_block_styles' );
