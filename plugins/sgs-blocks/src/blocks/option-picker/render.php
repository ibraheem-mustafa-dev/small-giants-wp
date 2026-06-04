<?php
/**
 * Server-side render for the SGS Option Picker block.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The outer <fieldset> wrapper carries
 * block-wrapper attributes; the radio pills + legend stay in $inner_html.
 *
 * view.js reads data attributes from .sgs-option-picker__options (inside
 * $inner_html) — these do NOT need to be on the outer wrapper.
 *
 * R-22-14: explicit discriminators, never empty($content).
 * No WP Interactivity API store — plain DOM events via view.js.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

/* ── Attribute extraction ────────────────────────────────────────────────── */

$label                = $attributes['label'] ?? __( 'Choose an option', 'sgs-blocks' );
$show_label           = $attributes['showLabel'] ?? true;
$option_items         = $attributes['optionItems'] ?? array();
$default_selected     = $attributes['defaultSelected'] ?? '';
$content_impact       = $attributes['contentImpact'] ?? array();
$type_key             = $attributes['typeKey'] ?? '';
$pill_style           = $attributes['pillStyle'] ?? 'outlined';
$pill_size            = $attributes['pillSize'] ?? 'medium';
$pill_bg_colour       = $attributes['pillBgColour'] ?? '';
$pill_text_colour     = $attributes['pillTextColour'] ?? '';
$pill_border_colour   = $attributes['pillBorderColour'] ?? '';
$pill_sel_bg_colour   = $attributes['pillSelectedBgColour'] ?? '';
$pill_sel_text_colour = $attributes['pillSelectedTextColour'] ?? '';

/* ── Guard: render nothing if no options ─────────────────────────────────── */

if ( empty( $option_items ) ) {
	return;
}

/* ── Validate option items (ensure key + label are set) ─────────────────── */

$valid_items = array();
$seen_keys   = array();

foreach ( $option_items as $item ) {
	$key        = isset( $item['key'] ) ? sanitize_html_class( trim( (string) $item['key'] ) ) : '';
	$label_text = isset( $item['label'] ) ? sanitize_text_field( trim( (string) $item['label'] ) ) : '';

	if ( '' === $key ) {
		continue; // Skip items with no key.
	}
	if ( in_array( $key, $seen_keys, true ) ) {
		continue; // Skip duplicate keys — first occurrence wins.
	}

	$seen_keys[]   = $key;
	$valid_items[] = array(
		'key'   => $key,
		'label' => '' !== $label_text ? $label_text : $key,
	);
}

/* After deduplication, bail if nothing remains. */
if ( empty( $valid_items ) ) {
	return;
}

/* ── Resolve default selection: explicit > first option ─────────────────── */

$sanitised_default = sanitize_html_class( trim( (string) $default_selected ) );
$resolved_default  = '';

if ( $sanitised_default ) {
	foreach ( $valid_items as $item ) {
		if ( $item['key'] === $sanitised_default ) {
			$resolved_default = $sanitised_default;
			break;
		}
	}
}

// Fall back to the first option if no valid default was found.
if ( '' === $resolved_default ) {
	$resolved_default = $valid_items[0]['key'];
}

/* ── Unique IDs for this block instance ─────────────────────────────────── */

$uid        = 'sgs-op-' . wp_unique_id();
$legend_id  = $uid . '-legend';
$radio_name = $uid . '-choice';

/* ── Wrapper classes ─────────────────────────────────────────────────────── */

$allowed_styles = array( 'outlined', 'filled', 'ghost' );
$allowed_sizes  = array( 'small', 'medium', 'large' );

$safe_style = in_array( $pill_style, $allowed_styles, true ) ? $pill_style : 'outlined';
$safe_size  = in_array( $pill_size, $allowed_sizes, true ) ? $pill_size : 'medium';

$extra_classes = array(
	'sgs-option-picker',
	'sgs-option-picker--' . $safe_style,
	'sgs-option-picker--' . $safe_size,
);

/* ── CSS custom properties for token-aware colour overrides ─────────────── */

$extra_styles = array();

if ( $pill_bg_colour ) {
	$extra_styles[] = '--sgs-op-bg:' . sgs_colour_value( $pill_bg_colour );
}
if ( $pill_text_colour ) {
	$extra_styles[] = '--sgs-op-text:' . sgs_colour_value( $pill_text_colour );
}
if ( $pill_border_colour ) {
	$extra_styles[] = '--sgs-op-border:' . sgs_colour_value( $pill_border_colour );
}
if ( $pill_sel_bg_colour ) {
	$extra_styles[] = '--sgs-op-sel-bg:' . sgs_colour_value( $pill_sel_bg_colour );
}
if ( $pill_sel_text_colour ) {
	$extra_styles[] = '--sgs-op-sel-text:' . sgs_colour_value( $pill_sel_text_colour );
}

/* ── Build $inner_html: legend + options div (data attrs stay here) ──────── */

// Legend — visible or screen-reader-only.
if ( $show_label ) {
	$legend_html = sprintf(
		'<legend id="%s" class="sgs-option-picker__label">%s</legend>',
		esc_attr( $legend_id ),
		esc_html( $label )
	);
} else {
	$legend_html = sprintf(
		'<legend id="%s" class="sgs-sr-only">%s</legend>',
		esc_attr( $legend_id ),
		esc_html( $label )
	);
}

// Data attributes for the view.js event dispatcher live on the inner div.
$data_type_key = $type_key
	? ' data-type-key="' . esc_attr( sanitize_html_class( $type_key ) ) . '"'
	: '';

$data_content_impact = '';
if ( ! empty( $content_impact ) && is_array( $content_impact ) ) {
	$safe_impacts        = array_map( 'sanitize_html_class', array_filter( $content_impact ) );
	$data_content_impact = ' data-content-impact="' . esc_attr( implode( ',', $safe_impacts ) ) . '"';
}

// Pill radio inputs.
$pills_html = '';
foreach ( $valid_items as $item ) {
	$is_checked  = $item['key'] === $resolved_default;
	$input_id    = $uid . '-' . $item['key'];
	$checked_str = $is_checked ? ' checked' : '';

	$pills_html .= sprintf(
		'<label class="sgs-option-picker__option" for="%s">' .
		'<input type="radio" id="%s" name="%s" value="%s"%s>' .
		'<span class="sgs-option-picker__pill">%s</span>' .
		'</label>',
		esc_attr( $input_id ),
		esc_attr( $input_id ),
		esc_attr( $radio_name ),
		esc_attr( $item['key'] ),
		$checked_str, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 'checked' or empty.
		esc_html( $item['label'] )
	);
}

$options_div_html = sprintf(
	'<div class="sgs-option-picker__options" role="radiogroup" aria-labelledby="%s"%s%s>%s</div>',
	esc_attr( $legend_id ),
	$data_type_key, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr().
	$data_content_impact, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr().
	$pills_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_* functions above.
);

$inner_html = $legend_html . $options_div_html;

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; arrays are caller-built with esc_attr().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'fieldset',
		'extra_classes' => $extra_classes,
		'extra_styles'  => $extra_styles,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
