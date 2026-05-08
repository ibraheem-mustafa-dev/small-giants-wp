<?php
/**
 * Universal Hover Effects — server-side injection.
 *
 * Adds CSS custom properties and utility classes to rendered blocks that
 * have hover attributes set.
 *
 * Default model: ALL blocks start with empty/false hover defaults.
 * A small opt-in list of card-like blocks receives subtle-lift defaults.
 * This mirrors the SCALE_SHADOW_DEFAULT_BLOCKS logic in hover-effects.js.
 *
 * Handles:
 * - sgsHoverBgColour / sgsHoverTextColour / sgsHoverBorderColour
 * - sgsHoverScale (fine-grained %) + sgsHoverScalePreset (named preset)
 * - sgsHoverShadow (sm/md/lg/glow)
 * - sgsHoverDuration (string slug — instant/fast/medium/slow/extra-slow)
 * - sgsHoverEasing (string slug — default/ease-out/ease-in/spring/linear)
 * - sgsHoverImageZoom (boolean)
 * - sgsStaggerDelay (ms per child)
 * - sgsHoverGrayscale (boolean)
 * - sgsHoverBorderAccent (boolean)
 * - sgsHoverTilt3D (boolean)
 * - sgsFocusRing (boolean) — emits class sgs-has-focus-ring
 * - sgsBlockLink + sgsBlockLinkTarget (wraps output in <a>)
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_hover_effects', 10, 2 );

/**
 * Resolve per-block hover defaults.
 *
 * Mirrors the resolveBlockDefaults() function in hover-effects.js.
 *
 * @param string $block_name Block name (e.g. 'sgs/card-grid').
 * @return array { scale_preset: string, shadow: string, image_zoom: bool, focus_ring: bool }
 */
function resolve_hover_defaults( string $block_name ): array {
	// Blocks that get scale + shadow + image zoom.
	static $opt_in = array(
		'sgs/card-grid',
		'sgs/info-box',
		'sgs/cta-section',
		'sgs/team-member',
		'sgs/pricing-table',
		'sgs/post-grid',
		'sgs/google-reviews',
		'sgs/process-steps',
		'sgs/icon-block',
	);

	// Scale + shadow only (no image zoom — no image in block).
	static $no_zoom = array(
		'sgs/whatsapp-cta',
	);

	// Image zoom only (no scale, no shadow — e.g. gallery tiles handle their own interaction).
	static $image_zoom_only = array(
		'sgs/gallery',
	);

	if ( in_array( $block_name, $image_zoom_only, true ) ) {
		return array(
			'scale_preset' => '',
			'shadow'       => '',
			'image_zoom'   => true,
			'focus_ring'   => true,
		);
	}

	if ( in_array( $block_name, $no_zoom, true ) ) {
		return array(
			'scale_preset' => '1.02',
			'shadow'       => 'md',
			'image_zoom'   => false,
			'focus_ring'   => true,
		);
	}

	if ( in_array( $block_name, $opt_in, true ) ) {
		return array(
			'scale_preset' => '1.02',
			'shadow'       => 'md',
			'image_zoom'   => true,
			'focus_ring'   => true,
		);
	}

	// All other blocks — default off.
	return array(
		'scale_preset' => '',
		'shadow'       => '',
		'image_zoom'   => false,
		'focus_ring'   => false,
	);
}

/**
 * Inject hover CSS custom properties and classes into block output.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_hover_effects( string $block_content, array $block ): string {
	$block_name = $block['blockName'] ?? '';

	// Resolve per-block defaults for this block type.
	$defaults = resolve_hover_defaults( $block_name );

	$attrs = $block['attrs'] ?? array();

	$hover_bg           = $attrs['sgsHoverBgColour'] ?? '';
	$hover_text         = $attrs['sgsHoverTextColour'] ?? '';
	$hover_border       = $attrs['sgsHoverBorderColour'] ?? '';
	$hover_scale        = (int) ( $attrs['sgsHoverScale'] ?? 0 );
	$hover_scale_preset = $attrs['sgsHoverScalePreset'] ?? $defaults['scale_preset'];
	$hover_shadow       = $attrs['sgsHoverShadow'] ?? $defaults['shadow'];
	$hover_dur_slug     = $attrs['sgsHoverDuration'] ?? 'medium';
	$hover_easing_slug  = $attrs['sgsHoverEasing'] ?? 'default';
	$hover_img_zoom     = (bool) ( $attrs['sgsHoverImageZoom'] ?? $defaults['image_zoom'] );
	$stagger_delay      = (int) ( $attrs['sgsStaggerDelay'] ?? 0 );
	$hover_grayscale    = (bool) ( $attrs['sgsHoverGrayscale'] ?? false );
	$hover_border_acc   = (bool) ( $attrs['sgsHoverBorderAccent'] ?? false );
	$hover_tilt_3d      = (bool) ( $attrs['sgsHoverTilt3D'] ?? false );
	$focus_ring            = (bool) ( $attrs['sgsFocusRing'] ?? $defaults['focus_ring'] );
	$block_link            = $attrs['sgsBlockLink'] ?? '';
	$block_link_target     = (bool) ( $attrs['sgsBlockLinkTarget'] ?? false );
	$click_effect          = $attrs['sgsClickEffect'] ?? 'none';
	$click_ripple_colour   = $attrs['sgsClickRippleColour'] ?? '';
	$click_ripple_duration = absint( $attrs['sgsClickRippleDuration'] ?? 600 );

	$has_ripple       = 'ripple' === $click_effect;
	$has_colour_hover = $hover_bg || $hover_text || $hover_border;
	$has_scale_hover  = $hover_scale || $hover_scale_preset;
	$has_hover        = $has_colour_hover || $has_scale_hover || $hover_shadow;

	// Bail early if nothing is active (respects per-block defaults above).
	if (
		! $has_hover &&
		! $hover_img_zoom &&
		! $stagger_delay &&
		! $hover_grayscale &&
		! $hover_border_acc &&
		! $hover_tilt_3d &&
		! $focus_ring &&
		! $block_link &&
		! $has_ripple
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

	// Duration: emit as a reference to the theme.json motion token.
	// Slug maps to var(--wp--custom--duration--{slug}) e.g. 'medium' → 300ms.
	$allowed_durations = array( 'instant', 'fast', 'medium', 'slow', 'extra-slow' );
	$dur_slug          = in_array( $hover_dur_slug, $allowed_durations, true )
		? $hover_dur_slug
		: 'medium';
	$css_vars[]        = '--sgs-hover-duration:var(--wp--custom--duration--' . esc_attr( $dur_slug ) . ')';

	// Easing: emit as a reference to the theme.json motion token.
	// Slug maps to var(--wp--custom--easing--{slug}).
	$allowed_easings = array( 'default', 'ease-out', 'ease-in', 'spring', 'linear' );
	$easing_slug     = in_array( $hover_easing_slug, $allowed_easings, true )
		? $hover_easing_slug
		: 'default';
	$css_vars[]      = '--sgs-hover-easing:var(--wp--custom--easing--' . esc_attr( $easing_slug ) . ')';

	if ( $stagger_delay > 0 ) {
		$css_vars[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
	}

	if ( $has_ripple ) {
		// Ripple colour: editor token if set, otherwise currentColour at 30% alpha via color-mix().
		// color-mix() is a safe CSS literal; sgs_colour_value() sanitises the token branch.
		if ( $click_ripple_colour ) {
			$css_vars[] = '--sgs-ripple-colour:' . \sgs_colour_value( $click_ripple_colour );
		} else {
			$css_vars[] = '--sgs-ripple-colour:color-mix(in srgb, currentColor 30%, transparent)';
		}
		$css_vars[] = '--sgs-ripple-duration:' . absint( $click_ripple_duration ) . 'ms';
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
	if ( $focus_ring ) {
		$add_classes[] = 'sgs-has-focus-ring';
	}
	if ( $block_link ) {
		$add_classes[] = 'sgs-has-block-link';
	}
	if ( $has_ripple ) {
		$add_classes[] = 'sgs-has-click-ripple';
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
