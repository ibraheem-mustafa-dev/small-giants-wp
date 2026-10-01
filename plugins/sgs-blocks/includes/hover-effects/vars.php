<?php
/**
 * Hover Effects — CSS custom-property declarations.
 *
 * Split out of the former includes/hover-effects.php (the orchestrator now
 * lives in hover-effects.php in this same folder). Verbatim move of the
 * "Build CSS custom properties" stage; no behaviour change.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Build the `--sgs-hover-*` / `--sgs-ripple-*` CSS custom-property
 * declarations for one block instance.
 *
 * @param int    $hover_scale           Fine-grained scale (0-120, already cast to int).
 * @param string $hover_scale_preset    Named scale preset ('', '1.02', '1.05', '1.1').
 * @param string $hover_shadow          Hover shadow slug, or ''.
 * @param int    $hover_lift            Lift in px (0 = off).
 * @param int    $hover_zoom            Photo zoom in % (0 = the block's own default; passed only with zoom on).
 * @param int    $hover_zoom_duration   Photo zoom duration in ms (0 = the block's own default).
 * @param string $hover_dur_slug        Duration slug as stored (validated against the allow-list here).
 * @param int    $hover_dur_ms          Exact duration in ms; 0 = use the slug's token.
 * @param string $hover_easing_slug     Easing slug as stored (validated against the allow-list here).
 * @param int    $stagger_delay         Stagger delay in ms (0 = off).
 * @param bool   $has_ripple            Whether the click-ripple effect is active.
 * @param string $click_ripple_colour   Ripple colour token, or '' for the currentColour fallback.
 * @param int    $click_ripple_duration Ripple duration in ms.
 * @param float  $hover_opacity         Fade-to opacity on hover (0-1; 0 = off).
 * @param string $hover_easing_custom   Hand-typed curve, read only when $hover_easing_slug is 'custom'.
 * @param string $hover_indent          Additive hover-only inline-start padding growth (a CSS length), or '' = off.
 *                                      The resting base it adds to is emitted per device by
 *                                      build_hover_indent_base_css().
 * @param string $hover_shadow_custom   Pre-sanitised (sgs_shadow_value()) raw box-shadow string, read only when
 *                                      $hover_shadow is the literal 'custom'; '' otherwise.
 * @return string[] CSS custom-property declarations, e.g. [ '--sgs-hover-scale:1.05', … ].
 */
function build_hover_vars(
	int $hover_scale,
	string $hover_scale_preset,
	string $hover_shadow,
	int $hover_lift,
	int $hover_zoom,
	int $hover_zoom_duration,
	string $hover_dur_slug,
	int $hover_dur_ms,
	string $hover_easing_slug,
	int $stagger_delay,
	bool $has_ripple,
	string $click_ripple_colour,
	int $click_ripple_duration,
	float $hover_opacity = 0.0,
	string $hover_easing_custom = '',
	string $hover_indent = '',
	string $hover_shadow_custom = ''
): array {
	$css_vars = array();

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
		if ( 'custom' === $hover_shadow ) {
			// $hover_shadow_custom already carries the sgs_shadow_value()
			// sanitised result (breakout-checked) — emitted verbatim.
			if ( '' !== $hover_shadow_custom ) {
				$css_vars[] = '--sgs-hover-shadow:' . $hover_shadow_custom;
			}
		} elseif ( is_hover_shadow_slug( $hover_shadow ) ) {
			$css_vars[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
		}
	}

	if ( $hover_lift > 0 ) {
		$css_vars[] = '--sgs-hover-lift:' . $hover_lift . 'px';
	}

	// Photo zoom: read by each block's own image rule as scale(var(--sgs-hover-zoom, 1.1)).
	if ( $hover_zoom > 100 ) {
		$css_vars[] = '--sgs-hover-zoom:' . number_format( $hover_zoom / 100, 2 );
	}
	if ( $hover_zoom_duration > 0 ) {
		$css_vars[] = '--sgs-hover-zoom-duration:' . $hover_zoom_duration . 'ms';
	}

	// Duration: emit as a reference to the theme.json motion token.
	// Slug maps to var(--wp--custom--duration--{slug}) e.g. 'medium' → 300ms.
	$allowed_durations = array( 'instant', 'fast', 'medium', 'slow', 'extra-slow' );
	$dur_slug          = in_array( $hover_dur_slug, $allowed_durations, true )
		? $hover_dur_slug
		: 'medium';
	$css_vars[]        = $hover_dur_ms > 0
		? '--sgs-hover-duration:' . $hover_dur_ms . 'ms'
		: '--sgs-hover-duration:var(--wp--custom--duration--' . esc_attr( $dur_slug ) . ')';

	// Easing: emit as a reference to the theme.json motion token.
	// Slug maps to var(--wp--custom--easing--{slug}). 'custom' is the one
	// exception — a hand-typed cubic-bezier()/steps()/linear() curve, resolved
	// (and validated) by the SAME shared helper the nav motion controls use
	// (sgs_motion_easing_css() / sgs_motion_valid_cubic_bezier(),
	// includes/helpers-motion-easing.php) rather than a second validator.
	$allowed_easings = array( 'default', 'ease-out', 'ease-in', 'spring', 'linear' );
	if ( 'custom' === $hover_easing_slug ) {
		$css_vars[] = '--sgs-hover-easing:' . sgs_motion_easing_css( 'custom', $hover_easing_custom, 'var(--wp--custom--easing--default)' );
	} else {
		$easing_slug = in_array( $hover_easing_slug, $allowed_easings, true )
			? $hover_easing_slug
			: 'default';
		$css_vars[]  = '--sgs-hover-easing:var(--wp--custom--easing--' . esc_attr( $easing_slug ) . ')';
	}

	if ( $stagger_delay > 0 ) {
		$css_vars[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
	}

	// Hover opacity: 0 is the off-sentinel (mirrors scale/zoom above); 1 is a
	// legal but no-op value (fully opaque = no visible change on hover).
	if ( $hover_opacity > 0 ) {
		$css_vars[] = '--sgs-hover-opacity:' . number_format( min( 1.0, $hover_opacity ), 2 );
	}

	// Padding indent — additive hover-only inline-start growth, mirroring the
	// nav blocks' itemPaddingShiftHover shape (Spec 36 "Item hover paint")
	// generalised to any block. Both values are custom-property VALUES only
	// — the actual `:hover`/`:focus-within` rule consuming them lives in
	// extensions.css's `.sgs-has-hover-indent` selector, same split as every
	// other hover property here.
	if ( '' !== $hover_indent ) {
		$css_vars[] = '--sgs-hover-indent:' . $hover_indent;
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

	return $css_vars;
}

/**
 * The resting inline-start padding a hover indent grows from, per device.
 *
 * Read from the block's own `padding` tier object ({desktop,tablet,mobile}.left),
 * the canonical box shape every SGS block with padding controls stores, and
 * emitted as `--sgs-hover-indent-base` through the same media-query emitter the
 * block's own padding uses, so the base changes at the same widths the padding
 * does and the hover shift stays additive on every device. A tier with no left
 * padding inherits the wider tier's value; a block with none emits nothing and
 * the consuming calc() in extensions.css grows from 0.
 *
 * @param string     $scope_class The instance scope class the hover vars are keyed to.
 * @param array|null $padding     The block's `padding` attribute.
 * @return string CSS text (no <style> wrapper), or ''.
 */
function build_hover_indent_base_css( string $scope_class, $padding ): string {
	if ( '' === $scope_class || ! is_array( $padding ) ) {
		return '';
	}
	require_once dirname( __DIR__ ) . '/helpers-responsive.php';
	$base = array();
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
		$raw   = $padding[ $tier ]['left'] ?? '';
		$value = \sgs_css_single_length_value( is_string( $raw ) ? $raw : '' );
		if ( '' !== $value ) {
			$base[ $tier ] = $value;
		}
	}
	if ( array() === $base ) {
		return '';
	}
	return \sgs_emit_responsive_css(
		'.' . $scope_class,
		array(
			array(
				'value' => $base,
				'css'   => '--sgs-hover-indent-base',
			),
		)
	);
}
