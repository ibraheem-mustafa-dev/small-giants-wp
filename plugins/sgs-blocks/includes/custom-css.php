<?php
/**
 * Custom CSS Per Block - server-side output.
 *
 * Hooks into render_block to inject scoped <style> tags when
 * a block has a non-empty sgsCustomCss attribute.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Add scoped custom CSS to the block's rendered HTML.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string
 */
function render_custom_css( string $block_content, array $block ): string {
	$custom_css = $block['attrs']['sgsCustomCss'] ?? '';
	if ( ! $custom_css ) {
		return $block_content;
	}

	// Generate a unique scope class.
	$uid      = 'sgs-c-' . substr( md5( $custom_css . ( $block['blockName'] ?? '' ) ), 0, 8 );
	$safe_css = wp_strip_all_tags( $custom_css );

	// Scope all rules: replace `&selector` with the uid class.
	$scoped_css = str_replace( '&selector', '.' . $uid, $safe_css );

	// Prepend the uid class to the block wrapper.
	$block_content = preg_replace(
		'/class="/',
		'class="' . esc_attr( $uid ) . ' ',
		$block_content,
		1
	);

	$style = '<style id="sgs-custom-css-' . esc_attr( $uid ) . '">'
		. $scoped_css
		. '</style>';

	return $style . $block_content;
}
add_filter( 'render_block', __NAMESPACE__ . '\render_custom_css', 10, 2 );
