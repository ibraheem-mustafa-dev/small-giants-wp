<?php
/**
 * Server-side render for the SGS Option Picker block.
 *
 * BLOCK-PRIVATE, NO-INLINE, NO-WRAPPER (per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-09; matches the sgs/quote pattern): CONTENT
 * kind — box (width/spacing/border/colour) only, never used the shared
 * wrapper's grid/section/background machinery, so SGS_Container_Wrapper is
 * dropped. The <fieldset> IS the block root, built via
 * get_block_wrapper_attributes(). Every CSS declaration (colour vars aside —
 * those are custom-PROPERTY values, not real declarations) lives in the
 * block's own scoped `.{uid}` <style> tag: WP colour/spacing/border
 * supports all declare `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() never auto-inlines them; padding/margin
 * tiers are box object attrs (paddingTablet/paddingMobile/marginTablet/
 * marginMobile), scoped @media 1023/767 on the SAME root selector.
 *
 * The radio pills + legend stay in $inner_html. view.js reads data
 * attributes from .sgs-option-picker__options (inside $inner_html) — these
 * do NOT need to be on the outer wrapper.
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
 *                    The chip's colour reaches the DOM as the CSS custom
 *                    property `--sgs-op-swatch` (a var-only declaration,
 *                    contract-allowed) — the real `background:` decl lives
 *                    in the block's static style.css, scoped to
 *                    .sgs-option-picker__swatch--colour.
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
 * or esc_url(); the swatch hex custom-property is validated with
 * sanitize_hex_color() at emit-time (defence-in-depth beyond the save-time
 * sanitise in class-configurator-meta.php).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// Box-object interface contract §1 + security §D sanitisers (mirrors
// sgs/quote + sgs/heading + sgs/button).
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

/* ── Attribute extraction ────────────────────────────────────────────────── */

$label                = $attributes['label'] ?? __( 'Choose an option', 'sgs-blocks' );
$show_label           = $attributes['showLabel'] ?? true;
$label_colour         = $attributes['labelColour'] ?? '';
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
$pill_border_radius   = $attributes['pillBorderRadius'] ?? 0;
$max_width            = $attributes['maxWidth'] ?? '';
$content_width        = $attributes['contentWidth'] ?? '';

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
	$uid,  // Scope typography rules — uid travels with the rendered block.
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
if ( $pill_border_radius > 0 ) {
	$extra_styles[] = '--sgs-op-pill-radius:' . absint( $pill_border_radius ) . 'px';
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

/* ── Root scope selector (contract §A/§B3) ────────────────────────────────── */

// Selectors are scoped to the uid class that travels with the fieldset root.
// When option-picker is nested inside sgs/product-card via render_block(), the
// uid is unique per block instance so styles never leak across cards.
$root_sel  = '.' . $uid;
$sel_label = $root_sel . ' .sgs-option-picker__label';
$sel_pill  = $root_sel . ' .sgs-option-picker__pill';

/* ── Scoped typography (label + pill) ─────────────────────────────────────── */

$typography_css = sgs_typography_css_rule( $attributes, 'label', $sel_label )
	. sgs_typography_css_rule( $attributes, 'pill', $sel_pill );

/*
 * ── Legend colour + margin-bottom — SCOPED (contract §A), NOT inline ───────
 * Was: inline style="" on the <legend>. Now: a rule on $sel_label alongside
 * the typography rule above, exactly like the rest of the block's CSS.
 */
$label_decls = array();
if ( '' !== $label_colour ) {
	$label_decls[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( '' !== $label_margin_bottom ) {
	$mb_safe = $sgs_css_length( $label_margin_bottom );
	if ( '' !== $mb_safe ) {
		$label_decls[] = 'margin-bottom:' . $mb_safe;
	}
}
$css_label_style = $label_decls ? ( $sel_label . '{' . implode( ';', $label_decls ) . ';}' ) : '';

// Legend — visible or screen-reader-only. No inline style attribute any more.
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
			 * The CSS custom properties --sgs-op-swatch-text and --sgs-op-swatch
			 * are scoped to this specific pill/chip's inline style so they do
			 * not affect other pills. Both are custom-PROPERTY values (contract-
			 * allowed), never a real `background:` declaration — the actual
			 * `background: var(--sgs-op-swatch)` rule lives in the block's
			 * static style.css, scoped to .sgs-option-picker__swatch--colour.
			 * The hex is already validated by sanitize_hex_color() above.
			 */
			$contrast_colour = sgs_wcag_text_colour_for_bg( $color );

			$swatch_chip_html = sprintf(
				'<span class="sgs-option-picker__swatch sgs-option-picker__swatch--colour" style="--sgs-op-swatch:%s;" aria-hidden="true"></span>',
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

/*
 * ── Wrapper (root) box declarations — colour / spacing / border / width ────
 * Box-object interface contract §B/§E: base padding/margin/border route to
 * WP-native style.* (skip-serialised → scoped, not inline); tiers are the
 * paddingTablet/paddingMobile/marginTablet/marginMobile object attrs.
 * maxWidth/contentWidth stay KEPT-SCALAR single-value families (contract §C).
 */

$scoped_css = array();

// --- Legend + typography (built above) ---
if ( $css_label_style ) {
	$scoped_css[] = $css_label_style;
}
if ( $typography_css ) {
	$scoped_css[] = $typography_css;
}

// --- Root max-width / content-width (kept-scalar, base only) ---
$wrapper_decls = array();
if ( $max_width ) {
	$mw_safe = $sgs_css_length( $max_width );
	if ( '' !== $mw_safe ) {
		$wrapper_decls[] = 'max-width:' . $mw_safe;
		$wrapper_decls[] = 'margin-inline:auto';
	}
}
if ( $content_width ) {
	$cw_safe = $sgs_css_length( $content_width );
	if ( '' !== $cw_safe ) {
		$wrapper_decls[] = 'width:' . $cw_safe;
	}
}
if ( $wrapper_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_decls ) . ';}';
}

// --- WP-native colour/spacing/border supports — skip-serialised, emitted
// scoped via the stable core style engine (same API WP core uses for
// `layout` support; matches sgs/quote + sgs/heading + sgs/button). ---
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_padding_obj = array();
	if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
		foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
			if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
				$base_padding_obj[ $spacing_side ] = $spacing_value;
			}
		}
	}
	$base_margin_obj = array();
	if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
		foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
			if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
				$base_margin_obj[ $spacing_side ] = $spacing_value;
			}
		}
	}
	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	// Border is FULLY WP-native here (radius/width/color/style all declared in
	// supports.__experimentalBorder) — pass the whole style.border object
	// straight through, exactly as WP core's own border support would render
	// it, just scoped to $root_sel instead of auto-inlined.
	if ( isset( $attributes['style']['border'] ) && is_array( $attributes['style']['border'] ) && ! empty( $attributes['style']['border'] ) ) {
		$base_style_engine_args['border'] = $attributes['style']['border'];
	}

	$color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

/* ── Build $inner_html: legend + options div (data attrs stay here) ──────── */

$inner_html = $legend_html . $options_div_html;

/*
 * ── Build the root element's classes + attributes ───────────────────────
 * Contract §B3: the <fieldset> IS the block root — no extra wrapper div.
 * It carries get_block_wrapper_attributes(), the block classes, the scoped
 * uid CLASS ($uid, already in $extra_classes), and the anchor `id`. The
 * ONLY 'style' value passed is the pre-built --sgs-op-* custom-property
 * string ($extra_styles) — custom-PROPERTY values are contract-allowed;
 * every real CSS declaration lives in the scoped <style> above.
 */

$root_classes = $extra_classes; // sgs-option-picker, --style, --size, uid.

// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (they set the colour from the theme palette).
if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$root_attr_args = array(
	'class' => implode( ' ', $root_classes ),
);
if ( $extra_styles ) {
	$root_attr_args['style'] = implode( ';', $extra_styles ) . ';';
}
$anchor = $attributes['anchor'] ?? '';
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

/* ── Render ────────────────────────────────────────────────────────────── */
?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches sgs/quote +
	// sgs/heading + SGS_Container_Wrapper). Every value reaching $scoped_css is
	// pre-sanitised ($sgs_css_length / sgs_colour_value / wp_style_engine_get_styles
	// / sgs_typography_css_rule / sanitize_html_class), so no un-sanitised value
	// survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<fieldset <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></fieldset>
