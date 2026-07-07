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

	// APPEND (not prepend) so the block's Additional-CSS wins over the block's own
	// render-time styles at equal specificity (later source order wins). This is
	// what makes "Additional CSS" behave as an override — matching WordPress core's
	// site-wide Additional CSS, which is emitted last. It also lets the cloning
	// pipeline's non-device-breakpoint residual CSS (FR-31-5.2, e.g. an @media
	// (min-width:1280px) padding band) override the block's base tier attr rule at
	// that breakpoint. (Prepending let the block's own later <style> beat it.)
	return $block_content . $style;
}
add_filter( 'render_block', __NAMESPACE__ . '\render_custom_css', 10, 2 );
