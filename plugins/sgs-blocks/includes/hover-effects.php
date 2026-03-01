<?php
/**
 * Universal Hover Effects — server-side injection.
 *
 * Adds CSS custom properties and the `.sgs-has-hover` class to
 * dynamically rendered blocks that have hover attributes set.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_hover_effects', 10, 2 );

/**
 * Inject hover CSS custom properties and class into block output.
 *
 * @since 1.0.0
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_hover_effects( string $block_content, array $block ): string {
	if ( empty( $block['attrs'] ) ) {
		return $block_content;
	}

	$attrs = $block['attrs'];

	$hover_bg     = $attrs['sgsHoverBgColour'] ?? '';
	$hover_text   = $attrs['sgsHoverTextColour'] ?? '';
	$hover_border = $attrs['sgsHoverBorderColour'] ?? '';
	$hover_scale  = (int) ( $attrs['sgsHoverScale'] ?? 0 );
	$hover_shadow = $attrs['sgsHoverShadow'] ?? '';
	$hover_dur    = (int) ( $attrs['sgsHoverDuration'] ?? 300 );

	$has_hover = $hover_bg || $hover_text || $hover_border || $hover_scale || $hover_shadow;

	if ( ! $has_hover ) {
		return $block_content;
	}

	// Build CSS custom properties.
	require_once __DIR__ . '/render-helpers.php';

	$css_vars = [];
	if ( $hover_bg ) {
		$css_vars[] = '--sgs-hover-bg:' . \sgs_colour_value( $hover_bg );
	}
	if ( $hover_text ) {
		$css_vars[] = '--sgs-hover-text:' . \sgs_colour_value( $hover_text );
	}
	if ( $hover_border ) {
		$css_vars[] = '--sgs-hover-border:' . \sgs_colour_value( $hover_border );
	}
	if ( $hover_scale ) {
		$css_vars[] = '--sgs-hover-scale:' . ( $hover_scale / 100 );
	}
	if ( $hover_shadow ) {
		$css_vars[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
	}
	if ( $hover_dur !== 300 ) {
		$css_vars[] = '--sgs-hover-duration:' . $hover_dur . 'ms';
	}

	$css_str = implode( ';', $css_vars );

	// Add class.
	$block_content = preg_replace(
		'/^(<\w+\b[^>]*\bclass=["\'])/',
		'$1sgs-has-hover ',
		$block_content,
		1
	);

	// Append CSS vars to existing style attribute or add new one.
	if ( preg_match( '/^(<\w+\b[^>]*)\bstyle=["\']([^"\']*)["\']/', $block_content ) ) {
		$block_content = preg_replace(
			'/^(<\w+\b[^>]*)\bstyle=["\']([^"\']*)["\']/',
			'$1style="$2;' . esc_attr( $css_str ) . '"',
			$block_content,
			1
		);
	} else {
		$block_content = preg_replace(
			'/^(<\w+)(\b)/',
			'$1 style="' . esc_attr( $css_str ) . '"$2',
			$block_content,
			1
		);
	}

	return $block_content;
}
