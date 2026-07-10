<?php
/**
 * Server-side render for the SGS Form Step block.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The step wrapper carries:
 *   - .sgs-form-step class (queried by the parent sgs/form view.js to
 *     enumerate steps and drive the multi-step progress bar)
 *   - data-step-label  (step title in the progress bar)
 *   - aria-label       (screen-reader description of the step)
 *
 * All three are carried via extra_attrs so the parent form's Interactivity
 * API store can find and show/hide steps by class query.
 *
 * R-22-14: explicit discriminators, never empty($content).
 *
 * NO-INLINE (contract §A, 2026-07-09): color + __experimentalBorder declare
 * __experimentalSkipSerialization in block.json (spacing already did). The
 * wrapper handles base padding scoped internally; color/border are block-
 * private here (mirrors sgs/container's render.php pattern exactly) — the
 * values are extracted from $attributes['style'], emitted into a scoped
 * `<style>` keyed to a content-hash uid CLASS, and the uid + re-added preset
 * has-* classes ride into the wrapper via the existing `extra_classes` opt.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$label = $attributes['label'] ?? __( 'Step', 'sgs-blocks' );

// CSS-keyword sanitiser — letters + hyphen only (border-style).
$sgs_fs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// Block-private scoped color/border supports (no-inline contract §A) — mirrors
// sgs/container's render.php pattern.
// ---------------------------------------------------------------------------
$sgs_fs_style_group = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$sgs_fs_supports_css     = '';
$sgs_fs_supports_classes = array( 'sgs-form-step' );

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sgs_fs_style_engine_input = array();

	if ( ! empty( $sgs_fs_style_group['color'] ) && is_array( $sgs_fs_style_group['color'] ) ) {
		$sgs_fs_style_engine_input['color'] = $sgs_fs_style_group['color'];
	}
	if ( ! empty( $sgs_fs_style_group['border'] ) && is_array( $sgs_fs_style_group['border'] ) ) {
		$sgs_fs_border_raw = $sgs_fs_style_group['border'];
		$sgs_fs_border     = array();
		if ( isset( $sgs_fs_border_raw['color'] ) && '' !== $sgs_fs_border_raw['color'] ) {
			$sgs_fs_border['color'] = (string) $sgs_fs_border_raw['color'];
		}
		if ( isset( $sgs_fs_border_raw['style'] ) && '' !== $sgs_fs_border_raw['style'] ) {
			$sgs_fs_border['style'] = $sgs_fs_css_keyword( $sgs_fs_border_raw['style'] );
		}
		if ( isset( $sgs_fs_border_raw['width'] ) && '' !== $sgs_fs_border_raw['width'] ) {
			$sgs_fs_border['width'] = $sgs_fs_border_raw['width'];
		}
		if ( isset( $sgs_fs_border_raw['radius'] ) && '' !== $sgs_fs_border_raw['radius'] ) {
			$sgs_fs_border['radius'] = $sgs_fs_border_raw['radius'];
		}
		if ( ! empty( $sgs_fs_border ) ) {
			$sgs_fs_style_engine_input['border'] = $sgs_fs_border;
		}
	}

	if ( ! empty( $sgs_fs_style_engine_input ) ) {
		$sgs_fs_uid = 'sgs-fs-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_fs_sel = '.' . $sgs_fs_uid . '.sgs-form-step';

		$sgs_fs_engine_styles = wp_style_engine_get_styles(
			$sgs_fs_style_engine_input,
			array( 'selector' => $sgs_fs_sel )
		);
		if ( ! empty( $sgs_fs_engine_styles['css'] ) ) {
			$sgs_fs_supports_css       = $sgs_fs_engine_styles['css'];
			$sgs_fs_supports_classes[] = $sgs_fs_uid;
		}
	}
}

$sgs_fs_preset_text = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sgs_fs_preset_bg   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sgs_fs_preset_text ) {
	$sgs_fs_supports_classes[] = 'has-text-color';
	$sgs_fs_supports_classes[] = 'has-' . $sgs_fs_preset_text . '-color';
}
if ( '' !== $sgs_fs_preset_bg ) {
	$sgs_fs_supports_classes[] = 'has-background';
	$sgs_fs_supports_classes[] = 'has-' . $sgs_fs_preset_bg . '-background-color';
}

$sgs_fs_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => $sgs_fs_supports_classes,
		'extra_attrs'   => array(
			'data-step-label' => esc_attr( $label ),
			'aria-label'      => esc_attr( $label ),
		),
	)
);

if ( '' !== $sgs_fs_supports_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators intact — $sgs_fs_supports_css is entirely style-engine-
	// generated, so nothing un-sanitised survives here.
	$sgs_fs_output = '<style>' . wp_strip_all_tags( $sgs_fs_supports_css ) . '</style>' . $sgs_fs_output;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; the prepended <style> is pre-sanitised above.
echo $sgs_fs_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
