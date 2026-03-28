<?php
/**
 * Universal Hover Effects — server-side injection.
 *
 * Adds CSS custom properties and the `.sgs-has-hover` class to
 * dynamically rendered blocks that have hover attributes set.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_hover_effects', 10, 2 );
add_filter( 'render_block', __NAMESPACE__ . '\\inject_block_link', 20, 2 );

/**
 * Inject hover CSS custom properties and class into block output.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_hover_effects( string $block_content, array $block ): string {
	if ( empty( $block['attrs'] ) ) {
		return $block_content;
	}

	$attrs = $block['attrs'];

	$hover_bg          = $attrs['sgsHoverBgColour'] ?? '';
	$hover_text        = $attrs['sgsHoverTextColour'] ?? '';
	$hover_border      = $attrs['sgsHoverBorderColour'] ?? '';
	$hover_scale       = (int) ( $attrs['sgsHoverScale'] ?? 0 );
	$hover_shadow      = $attrs['sgsHoverShadow'] ?? '';
	$hover_dur         = (int) ( $attrs['sgsHoverDuration'] ?? 300 );
	$hover_image_zoom  = ! empty( $attrs['sgsHoverImageZoom'] );
	$hover_grayscale   = ! empty( $attrs['sgsHoverGrayscale'] );

	$has_hover = $hover_bg || $hover_text || $hover_border || $hover_scale || $hover_shadow || $hover_image_zoom || $hover_grayscale;

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

	// Build class list.
	$extra_classes = [];
	if ( $hover_bg || $hover_text || $hover_border || $hover_scale || $hover_shadow ) {
		$extra_classes[] = 'sgs-has-hover';
	}
	if ( $hover_image_zoom ) {
		$extra_classes[] = 'sgs-hover-image-zoom';
	}
	if ( $hover_grayscale ) {
		$extra_classes[] = 'sgs-hover-grayscale';
	}

	if ( ! empty( $extra_classes ) ) {
		$classes_str = implode( ' ', $extra_classes ) . ' ';
		$block_content = preg_replace(
			'/^(<\w+\b[^>]*\bclass=["\'])/',
			'$1' . $classes_str,
			$block_content,
			1
		);
	}

	// Only inject CSS vars when there is something to inject.
	if ( $css_str ) {
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
	}

	return $block_content;
}

/**
 * Wrap a block in an anchor tag when sgsBlockLink is set.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_block_link( string $block_content, array $block ): string {
	if ( empty( $block['attrs']['sgsBlockLink'] ) ) {
		return $block_content;
	}

	$url    = esc_url( $block['attrs']['sgsBlockLink'] );
	$target = ! empty( $block['attrs']['sgsBlockLinkTarget'] ) ? '_blank' : '_self';
	$rel    = '_blank' === $target ? ' rel="noopener noreferrer"' : '';

	if ( ! $url ) {
		return $block_content;
	}

	return sprintf(
		'<a href="%s" target="%s"%s class="sgs-block-link-wrapper" style="display:contents;text-decoration:none;color:inherit;">%s</a>',
		$url,
		esc_attr( $target ),
		$rel,
		$block_content
	);
}
