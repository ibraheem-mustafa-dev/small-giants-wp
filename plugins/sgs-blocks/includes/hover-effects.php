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
 * Default values (must mirror hover-effects.js HOVER_ATTRS + SCALE_SHADOW_SKIP_BLOCKS):
 * - sgsHoverScalePreset : '1.02' ('' for skip-list blocks)
 * - sgsHoverShadow      : 'md'   ('' for skip-list blocks)
 * - sgsHoverImageZoom   : true   (false for skip-list blocks)
 * - sgsHoverDuration    : 250 ms
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
	// Blocks that should not receive the default scale/shadow/image-zoom lift.
	// Must mirror SCALE_SHADOW_SKIP_BLOCKS in hover-effects.js.
	static $scale_shadow_skip = array(
		'sgs/announcement-bar',
		'sgs/back-to-top',
		'sgs/breadcrumbs',
		'sgs/container',
		'sgs/countdown-timer',
		'sgs/counter',
		'sgs/form',
		'sgs/form-step',
		'sgs/form-field-address',
		'sgs/form-field-checkbox',
		'sgs/form-field-consent',
		'sgs/form-field-date',
		'sgs/form-field-email',
		'sgs/form-field-file',
		'sgs/form-field-hidden',
		'sgs/form-field-number',
		'sgs/form-field-phone',
		'sgs/form-field-radio',
		'sgs/form-field-select',
		'sgs/form-field-text',
		'sgs/form-field-textarea',
		'sgs/form-field-tiles',
		'sgs/hero',
		'sgs/mega-menu',
		'sgs/tabs',
		'sgs/tab',
	);

	$block_name = $block['blockName'] ?? '';
	$is_skip    = in_array( $block_name, $scale_shadow_skip, true );

	// Resolve per-block defaults — mirrors HOVER_ATTRS in hover-effects.js.
	$default_scale_preset = $is_skip ? '' : '1.02';
	$default_shadow       = $is_skip ? '' : 'md';
	$default_img_zoom     = ! $is_skip;

	$attrs = $block['attrs'] ?? array();

	$hover_bg           = $attrs['sgsHoverBgColour'] ?? '';
	$hover_text         = $attrs['sgsHoverTextColour'] ?? '';
	$hover_border       = $attrs['sgsHoverBorderColour'] ?? '';
	$hover_scale        = (int) ( $attrs['sgsHoverScale'] ?? 0 );
	$hover_scale_preset = $attrs['sgsHoverScalePreset'] ?? $default_scale_preset;
	$hover_shadow       = $attrs['sgsHoverShadow'] ?? $default_shadow;
	$hover_dur          = (int) ( $attrs['sgsHoverDuration'] ?? 250 );
	$hover_img_zoom     = (bool) ( $attrs['sgsHoverImageZoom'] ?? $default_img_zoom );
	$stagger_delay      = (int) ( $attrs['sgsStaggerDelay'] ?? 0 );
	$hover_grayscale    = (bool) ( $attrs['sgsHoverGrayscale'] ?? false );
	$hover_border_acc   = (bool) ( $attrs['sgsHoverBorderAccent'] ?? false );
	$hover_tilt_3d      = (bool) ( $attrs['sgsHoverTilt3D'] ?? false );
	$block_link         = $attrs['sgsBlockLink'] ?? '';
	$block_link_target  = (bool) ( $attrs['sgsBlockLinkTarget'] ?? false );

	$has_colour_hover = $hover_bg || $hover_text || $hover_border;
	$has_scale_hover  = $hover_scale || $hover_scale_preset;
	$has_hover        = $has_colour_hover || $has_scale_hover || $hover_shadow;

	// Bail early if nothing is active (respects defaults above).
	if (
		! $has_hover &&
		! $hover_img_zoom &&
		! $stagger_delay &&
		! $hover_grayscale &&
		! $hover_border_acc &&
		! $hover_tilt_3d &&
		! $block_link
	) {
		return $block_content;
	}

	require_once __DIR__ . '/render-helpers.php';

	// --- Build CSS custom properties. ---
	$css_vars = array();
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
		$allowed_presets = array( '1.02', '1.05', '1.1' );
		if ( in_array( $hover_scale_preset, $allowed_presets, true ) ) {
			$css_vars[] = '--sgs-hover-scale:' . esc_attr( $hover_scale_preset );
		}
	}

	if ( $hover_shadow ) {
		$allowed_shadows = array( 'sm', 'md', 'lg', 'glow' );
		if ( in_array( $hover_shadow, $allowed_shadows, true ) ) {
			$css_vars[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
		}
	}

	// Always write duration — CSS fallback in .sgs-has-hover is 300ms,
	// so our 250 ms default must be emitted to take effect.
	$css_vars[] = '--sgs-hover-duration:' . absint( $hover_dur ) . 'ms';

	if ( $stagger_delay > 0 ) {
		$css_vars[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
	}

	// --- Build extra classes. ---
	$add_classes = array();
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
	if ( $hover_border_acc ) {
		$add_classes[] = 'sgs-has-border-accent';
	}
	if ( $hover_tilt_3d ) {
		$add_classes[] = 'sgs-has-tilt-3d';
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
		$target_attr   = $block_link_target
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
