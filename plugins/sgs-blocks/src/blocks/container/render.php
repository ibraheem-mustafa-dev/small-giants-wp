<?php
/**
 * Server-side render for the SGS Container block.
 *
 * Delegates all wrapper-assembly to SGS_Container_Wrapper::render() so the
 * sgs/container output is byte-identical to before while composite blocks can
 * share the same logic without re-implementing it.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/shape-dividers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// sgs_sanitize_grid_template() and sgs_container_gap_value() live in render-helpers.php.
// SGS_Container_Wrapper::render() handles the full wrapper + responsive-CSS assembly.
// $attributes passed VERBATIM to the wrapper — uid is md5(wp_json_encode($attributes).anchor);
// any mutation would change the uid → different scoped <style> selector → pixel drift.
// Reading $attributes below for the color/border/typography supports is READ-ONLY —
// the array handed to SGS_Container_Wrapper::render() further down is untouched.

// User-facing HTML-tag chooser removed (D-scope, 2026-07-05) — the converter
// never emitted this attr; the wrapper always renders 'section' for sgs/container.
$html_tag = 'section';

// ---------------------------------------------------------------------------
// No-inline residual (Spec 32) — WP-native color/__experimentalBorder/typography
// supports. block.json declares __experimentalSkipSerialization on all three
// (mirrors the existing spacing pattern, D292) so WordPress never auto-inlines
// them via get_block_wrapper_attributes() — which is called INSIDE the shared
// SGS_Container_Wrapper (a shared file this block must not modify). Extract the
// values here, emit them as a scoped rule via the stable core style engine
// (same approach as sgs/label render.php), and hand the wrapper ONLY a class
// name via its existing 'extra_classes' opt — a public composite-integration
// hook the shared wrapper already supports, so this needs no shared-file edit.
// Skip-serialisation also suppresses WP's automatic has-*-color /
// has-*-background-color / has-*-gradient-background / has-*-font-size preset
// classes, so those are re-added manually below.
// ---------------------------------------------------------------------------

$sgs_container_style_group = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$sgs_container_supports_css     = '';
$sgs_container_supports_classes = array();

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sgs_container_style_engine_input = array();

	if ( ! empty( $sgs_container_style_group['color'] ) && is_array( $sgs_container_style_group['color'] ) ) {
		$sgs_container_style_engine_input['color'] = $sgs_container_style_group['color'];
	}
	if ( ! empty( $sgs_container_style_group['border'] ) && is_array( $sgs_container_style_group['border'] ) ) {
		$sgs_container_style_engine_input['border'] = $sgs_container_style_group['border'];
	}
	if ( ! empty( $sgs_container_style_group['typography'] ) && is_array( $sgs_container_style_group['typography'] ) ) {
		$sgs_container_style_engine_input['typography'] = $sgs_container_style_group['typography'];
	}

	if ( ! empty( $sgs_container_style_engine_input ) ) {
		$sgs_container_supports_uid = 'sgs-cst-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_container_supports_sel = '.' . $sgs_container_supports_uid . '.wp-block-sgs-container';

		$sgs_container_engine_styles = wp_style_engine_get_styles(
			$sgs_container_style_engine_input,
			array( 'selector' => $sgs_container_supports_sel )
		);
		if ( ! empty( $sgs_container_engine_styles['css'] ) ) {
			$sgs_container_supports_css       = $sgs_container_engine_styles['css'];
			$sgs_container_supports_classes[] = $sgs_container_supports_uid;
		}
	}
}

// Preset colour/gradient/font-size slugs — skip-serialisation drops WP's
// automatic has-* classes, so re-add them manually (mirrors sgs/label).
$sgs_container_preset_text     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sgs_container_preset_bg       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
$sgs_container_preset_gradient = isset( $attributes['gradient'] ) ? sanitize_html_class( $attributes['gradient'] ) : '';
$sgs_container_preset_fontsize = isset( $attributes['fontSize'] ) ? sanitize_html_class( $attributes['fontSize'] ) : '';

if ( '' !== $sgs_container_preset_text ) {
	$sgs_container_supports_classes[] = 'has-text-color';
	$sgs_container_supports_classes[] = 'has-' . $sgs_container_preset_text . '-color';
}
if ( '' !== $sgs_container_preset_bg ) {
	$sgs_container_supports_classes[] = 'has-background';
	$sgs_container_supports_classes[] = 'has-' . $sgs_container_preset_bg . '-background-color';
}
if ( '' !== $sgs_container_preset_gradient ) {
	$sgs_container_supports_classes[] = 'has-background';
	$sgs_container_supports_classes[] = 'has-' . $sgs_container_preset_gradient . '-gradient-background';
}
if ( '' !== $sgs_container_preset_fontsize ) {
	$sgs_container_supports_classes[] = 'has-' . $sgs_container_preset_fontsize . '-font-size';
}

$sgs_container_wrapper_opts = array( 'tag' => $html_tag );
if ( ! empty( $sgs_container_supports_classes ) ) {
	$sgs_container_wrapper_opts['extra_classes'] = $sgs_container_supports_classes;
}

$sgs_container_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'section',
	$sgs_container_wrapper_opts
);

if ( '' !== $sgs_container_supports_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators intact — the CSS is entirely style-engine-generated or
	// slug-derived (sanitize_html_class), so nothing un-sanitised survives here.
	$sgs_container_output = '<style>' . wp_strip_all_tags( $sgs_container_supports_css ) . '</style>' . $sgs_container_output;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-sanitised HTML; all variables sanitised internally via esc_*/wp_kses()/get_block_wrapper_attributes(); the prepended <style> is pre-sanitised above.
echo $sgs_container_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
