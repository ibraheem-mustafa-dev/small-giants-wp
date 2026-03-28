<?php
/**
 * Universal Hover Effects -- server-side injection.
 *
 * Adds CSS custom properties and utility classes to dynamically rendered
 * blocks that have hover attributes set.
 *
 * Handles:
 * - sgsHoverBgColour / sgsHoverTextColour / sgsHoverBorderColour
 * - sgsHoverScale (fine-grained %) + sgsHoverScalePreset (named)
 * - sgsHoverShadow (sm/md/lg/glow)
 * - sgsHoverDuration (ms)
 * - sgsHoverImageZoom (boolean)
 * - sgsStaggerDelay (ms per child)
 * - sgsHoverGrayscale (boolean)
 * - sgsBlockLink + sgsBlockLinkTarget (wraps output in <a>)
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_hover_effects', 10, 2 );

/**
 * Inject hover CSS custom properties and classes into block output.
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

	$hover_bg           = $attrs['sgsHoverBgColour']     ?? '';
	$hover_text         = $attrs['sgsHoverTextColour']   ?? '';
	$hover_border       = $attrs['sgsHoverBorderColour'] ?? '';
	$hover_scale        = (int) ( $attrs['sgsHoverScale'] ?? 0 );
	$hover_scale_preset = $attrs['sgsHoverScalePreset']  ?? '';
	$hover_shadow       = $attrs['sgsHoverShadow']       ?? '';
	$hover_dur          = (int) ( $attrs['sgsHoverDuration'] ?? 300 );
	$hover_img_zoom     = (bool) ( $attrs['sgsHoverImageZoom'] ?? false );
	$stagger_delay      = (int) ( $attrs['sgsStaggerDelay'] ?? 0 );
	$hover_grayscale    = (bool) ( $attrs['sgsHoverGrayscale'] ?? false );
	$block_link         = $attrs['sgsBlockLink']         ?? '';
	$block_link_target  = (bool) ( $attrs['sgsBlockLinkTarget'] ?? false );

	$has_colour_hover   = $hover_bg || $hover_text || $hover_border;
	$has_scale_hover    = $hover_scale || $hover_scale_preset;
	$has_hover          = $has_colour_hover || $has_scale_hover || $hover_shadow;

	// Bail early if nothing is set.
	if (
		! $has_hover &&
		! $hover_img_zoom &&
		! $stagger_delay &&
		! $hover_grayscale &&
		! $block_link
	) {
		return $block_content;
	}

	require_once __DIR__ . '/render-helpers.php';

	// --- Build CSS custom properties. ---
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

	// Fine-grained scale takes priority over named preset.
	if ( $hover_scale ) {
		$css_vars[] = '--sgs-hover-scale:' . number_format( $hover_scale / 100, 4 );
	} elseif ( $hover_scale_preset ) {
		$allowed_presets = [ '1.02', '1.05', '1.1' ];
		if ( in_array( $hover_scale_preset, $allowed_presets, true ) ) {
			$css_vars[] = '--sgs-hover-scale:' . esc_attr( $hover_scale_preset );
		}
	}

	if ( $hover_shadow ) {
		$allowed_shadows = [ 'sm', 'md', 'lg', 'glow' ];
		if ( in_array( $hover_shadow, $allowed_shadows, true ) ) {
			$css_vars[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
		}
	}

	if ( $hover_dur !== 300 ) {
		$css_vars[] = '--sgs-hover-duration:' . absint( $hover_dur ) . 'ms';
	}

	if ( $stagger_delay > 0 ) {
		$css_vars[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
	}

	// --- Build extra classes. ---
	$add_classes = [];
	if ( $has_hover ) {
		$add_classes[] = 'sgs-has-hover';
	}
	if ( $hover_scale || $hover_scale_preset ) {
		$add_classes[] = 'sgs-has-hover-scale';
	}
	if ( $hover_img_zoom ) {
		$add_classes[] = 'sgs-has-img-zoom';
	}
	if ( $hover_grayscale ) {
		$add_classes[] = 'sgs-has-grayscale';
	}
	if ( $stagger_delay > 0 ) {
		$add_classes[] = 'sgs-has-stagger';
	}
	if ( $block_link ) {
		$add_classes[] = 'sgs-has-block-link';
	}

	// --- Inject classes into the first tag. ---
	if ( $add_classes ) {
		$classes_str = implode( ' ', $add_classes );
		// Append to existing class="..." attribute.
		if ( preg_match( '/^(<\w+\b[^>]*\bclass=["\'])/', $block_content ) ) {
			$block_content = preg_replace(
				'/^(<\w+\b[^>]*\bclass=["\'])/',
				'$1' . $classes_str . ' ',
				$block_content,
				1
			);
		} else {
			// No class attribute yet; add one.
			$block_content = preg_replace(
				'/^(<\w+)(\b)/',
				'$1 class="' . $classes_str . '"$2',
				$block_content,
				1
			);
		}
	}

	// --- Inject CSS custom properties into inline style. ---
	if ( $css_vars ) {
		$css_str = implode( ';', $css_vars );
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

	// --- Wrap in block link if set. ---
	if ( $block_link ) {
		$target_attr = $block_link_target
			? ' target="_blank" rel="noopener noreferrer"'
			: '';
		$block_content = sprintf(
			'<a href="%s" class="sgs-block-link-wrapper"%s>%s</a>',
			esc_url( $block_link ),
			$target_attr,
			$block_content
		);
	}

	return $block_content;
}
