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
 * ── Swatch rendering (FR-27-B2 + FR-27-I2) ────────────────────────────
 * When the block's `typeKey` maps to a WooCommerce attribute taxonomy
 * (e.g. "pa_flavour"), each option's term is looked up by its slug and
 * its `_sgs_swatch_color` / `_sgs_swatch_image_id` term_meta are read:
 *
 *   - Image swatch:  _sgs_swatch_image_id > 0 → <img> inside the pill
 *                    (the hidden radio + label text remain for a11y).
 *   - Colour swatch: _sgs_swatch_color set → colour chip + label text,
 *                    with build-time WCAG auto-contrast applied to the
 *                    pill text (FR-27-I2 sgs_wcag_text_colour_for_bg()).
 *   - No meta:       existing text pill rendered byte-for-byte unchanged
 *                    (additive-safety guarantee for Typed clones).
 *
 * Taxonomy resolution: `typeKey` is stored as either a bare WC attribute
 * slug (e.g. "flavour") or a full taxonomy name (e.g. "pa_flavour").  The
 * helper sgs_op_resolve_taxonomy() normalises both forms.  If the resolved
 * taxonomy does not exist or WooCommerce is absent, swatch lookup is
 * silently skipped and every pill renders as plain text — this preserves
 * the no-swatch path completely.
 *
 * SEC-3 compliance: all values emitted to HTML attributes use esc_attr()
 * or esc_url(); inline-style hex is validated with sanitize_hex_color()
 * at emit-time (defence-in-depth beyond the save-time sanitise in
 * class-configurator-meta.php).
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
$label_font_size      = $attributes['labelFontSize'] ?? '';
$label_colour         = $attributes['labelColour'] ?? '';
$label_font_weight    = $attributes['labelFontWeight'] ?? '';
$label_margin_bottom  = $attributes['labelMarginBottom'] ?? '';
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
$pill_font_size       = $attributes['pillFontSize'] ?? '';
$pill_font_weight     = $attributes['pillFontWeight'] ?? '';
$pill_border_radius   = $attributes['pillBorderRadius'] ?? '';

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
if ( '' !== $pill_font_size ) {
	$extra_styles[] = '--sgs-op-pill-font-size:' . $pill_font_size;
}
if ( '' !== $pill_font_weight ) {
	$extra_styles[] = '--sgs-op-pill-font-weight:' . $pill_font_weight;
}
if ( '' !== $pill_border_radius ) {
	$extra_styles[] = '--sgs-op-pill-radius:' . $pill_border_radius;
}

/* ── FR-27-B2: resolve WooCommerce attribute taxonomy for swatch lookup ──── */

/**
 * Normalise a typeKey to a WC attribute taxonomy name or '' when not resolvable.
 *
 * WC attribute taxonomies are always prefixed "pa_".  The typeKey stored in
 * block attributes may be stored as the bare slug ("flavour"), the full
 * taxonomy name ("pa_flavour"), or a human label ("Flavour").  We try each
 * form in order:
 *   1. Direct match (typeKey is already a registered taxonomy).
 *   2. pa_<typeKey> — most common case (WC convention).
 *   3. pa_<sanitized-slug> — normalise spaces/mixed-case.
 *
 * Returns '' when WooCommerce is absent or the taxonomy cannot be resolved,
 * so the caller silently falls through to the no-swatch text-pill path.
 *
 * @param string $type_key_raw Raw typeKey attribute value.
 * @return string Resolved taxonomy name or ''.
 */
$swatch_taxonomy = '';

if ( '' !== $type_key && function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
	$candidates = array(
		sanitize_key( $type_key ),
		'pa_' . sanitize_key( $type_key ),
	);
	// If typeKey already starts with "pa_" avoid a duplicate.
	if ( str_starts_with( sanitize_key( $type_key ), 'pa_' ) ) {
		$candidates = array( sanitize_key( $type_key ) );
	}

	foreach ( $candidates as $candidate ) {
		if ( taxonomy_exists( $candidate ) ) {
			$swatch_taxonomy = $candidate;
			break;
		}
	}
}

/* ── FR-27-B2: pre-fetch swatch meta for all options in one pass ─────────── */

/*
 * Build a map: option_slug => array( 'color' => string|'', 'image_id' => int )
 *
 * We read term_meta only when a valid WC taxonomy was resolved above.
 * When no taxonomy is found (Typed mode, non-WC option picker, or WC absent),
 * $swatch_map remains empty and every pill renders as plain text — no change
 * to the existing rendering path.
 *
 * get_term_by() accepts a slug and a taxonomy; it returns false when the term
 * does not exist, so the per-item fallback to plain text is automatic.
 */
$swatch_map = array();

if ( '' !== $swatch_taxonomy ) {
	foreach ( $valid_items as $item ) {
		$attr_term = get_term_by( 'slug', $item['key'], $swatch_taxonomy );
		if ( ! $attr_term instanceof \WP_Term ) {
			// Term not found — plain-text pill (no swatch data).
			continue;
		}

		$color_raw    = get_term_meta( $attr_term->term_id, '_sgs_swatch_color', true );
		$image_id_raw = get_term_meta( $attr_term->term_id, '_sgs_swatch_image_id', true );

		// Defence-in-depth: re-validate at render (sec-3 / meta may have been
		// written outside the registered sanitise callback in edge cases).
		$color    = sanitize_hex_color( (string) $color_raw );
		$image_id = absint( $image_id_raw );

		if ( $color || $image_id > 0 ) {
			$swatch_map[ $item['key'] ] = array(
				'color'    => $color ? $color : '',
				'image_id' => $image_id,
			);
		}
	}
}

/* ── Build $inner_html: legend + options div (data attrs stay here) ──────── */

// C7 + new: optional per-label typography — font-size, font-weight, colour (token or hex),
// and margin-bottom. Inline on the visible <legend> so it beats the class-level default
// in style.css. Empty values are skipped so the CSS/token default wins.
$label_style_parts = array();
if ( '' !== $label_font_size ) {
	$label_style_parts[] = 'font-size:' . $label_font_size;
}
if ( '' !== $label_font_weight ) {
	$label_style_parts[] = 'font-weight:' . $label_font_weight;
}
if ( '' !== $label_colour ) {
	$label_style_parts[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( '' !== $label_margin_bottom ) {
	$label_style_parts[] = 'margin-bottom:' . $label_margin_bottom;
}
$label_style_attr = ! empty( $label_style_parts )
	? ' style="' . esc_attr( implode( ';', $label_style_parts ) ) . '"'
	: '';

// Legend — visible or screen-reader-only.
if ( $show_label ) {
	$legend_html = sprintf(
		'<legend id="%s" class="sgs-option-picker__label"%s>%s</legend>',
		esc_attr( $legend_id ),
		$label_style_attr,
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

// Pill radio inputs — three rendering paths (image swatch / colour swatch / plain text).
$pills_html = '';

foreach ( $valid_items as $item ) {
	$is_checked  = $item['key'] === $resolved_default;
	$input_id    = $uid . '-' . $item['key'];
	$checked_str = $is_checked ? ' checked' : '';

	/* ── Determine swatch mode for this option ───────────────────────── */

	$swatch            = isset( $swatch_map[ $item['key'] ] ) ? $swatch_map[ $item['key'] ] : null;
	$swatch_image_html = '';
	$swatch_chip_html  = '';
	$pill_extra_style  = '';
	$pill_extra_class  = '';

	if ( null !== $swatch ) {
		$image_id = $swatch['image_id'];
		$color    = $swatch['color'];

		if ( $image_id > 0 ) {
			/*
			 * IMAGE SWATCH PATH.
			 *
			 * Render a thumbnail <img> inside the pill.  The image is
			 * decorative because the visible label text (screen-reader + sighted)
			 * is still present as the pill text — alt="" is correct here.
			 * wp_get_attachment_image_src() returns array( url, w, h ) or false.
			 */
			$src_data = wp_get_attachment_image_src( $image_id, 'thumbnail' );
			if ( $src_data ) {
				$img_url           = $src_data[0];
				$img_w             = absint( $src_data[1] );
				$img_h             = absint( $src_data[2] );
				$swatch_image_html = sprintf(
					'<img src="%s" alt="" class="sgs-option-picker__swatch sgs-option-picker__swatch--image" width="%d" height="%d" loading="lazy" decoding="async" aria-hidden="true" />',
					esc_url( $img_url ),
					$img_w,
					$img_h
				);
				$pill_extra_class  = ' sgs-option-picker__pill--has-image';
			}
			// If wp_get_attachment_image_src() returned false, fall through to
			// plain text pill (no swatch markup emitted).

		} elseif ( '' !== $color ) {
			/*
			 * COLOUR SWATCH PATH.
			 *
			 * Render a colour chip <span> inside the pill, followed by the
			 * label text.  FR-27-I2: apply sgs_wcag_text_colour_for_bg() to
			 * compute an auto-contrast text colour for the pill text so it
			 * always meets 4.5:1 against the swatch background when that
			 * background bleeds onto the pill (e.g. filled/ghost styles).
			 *
			 * The CSS custom property --sgs-op-swatch-text is scoped to this
			 * specific pill's inline style so it does not affect other pills.
			 *
			 * The colour chip background is inlined on the <span>; the hex
			 * is already validated by sanitize_hex_color() above.
			 */
			$contrast_colour = sgs_wcag_text_colour_for_bg( $color );

			$swatch_chip_html = sprintf(
				'<span class="sgs-option-picker__swatch sgs-option-picker__swatch--colour" style="background:%s;" aria-hidden="true"></span>',
				esc_attr( $color )
			);
			$pill_extra_class = ' sgs-option-picker__pill--has-colour';
			$pill_extra_style = ' style="--sgs-op-swatch-text:' . esc_attr( $contrast_colour ) . ';"';
		}
		// If both image_id was 0 and color was '' (should not happen given the
		// map-build filter, but defensive): fall through to plain text.
	}

	/*
	 * Build the pill <span> content.
	 *
	 * Plain text path  → <span class="…pill">LABEL</span>
	 * Colour swatch    → <span class="…pill …has-colour" style="…"><span chip/> LABEL</span>
	 * Image swatch     → <span class="…pill …has-image"><img/> LABEL</span>
	 *
	 * The label text is ALWAYS present so colour is never the sole indicator
	 * (WCAG 1.4.1 non-text contrast / 1.4.3 colour).  Screen readers read the
	 * label text from the visible <span> (the hidden radio's accessible name
	 * comes from the wrapping <label> element via the fieldset legend).
	 */
	$pill_inner = $swatch_chip_html . $swatch_image_html . esc_html( $item['label'] );

	$pills_html .= sprintf(
		'<label class="sgs-option-picker__option" for="%s">' .
		'<input type="radio" id="%s" name="%s" value="%s"%s>' .
		'<span class="sgs-option-picker__pill%s"%s>%s</span>' .
		'</label>',
		esc_attr( $input_id ),
		esc_attr( $input_id ),
		esc_attr( $radio_name ),
		esc_attr( $item['key'] ),
		$checked_str,        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 'checked' or empty.
		esc_attr( $pill_extra_class ),
		$pill_extra_style,   // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr().
		$pill_inner          // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_* calls above.
	);
}

$options_div_html = sprintf(
	'<div class="sgs-option-picker__options" role="radiogroup" aria-labelledby="%s"%s%s>%s</div>',
	esc_attr( $legend_id ),
	$data_type_key,          // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr().
	$data_content_impact,    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr().
	$pills_html              // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_* functions above.
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
