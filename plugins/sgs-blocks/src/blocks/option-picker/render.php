<?php
/**
 * Server-side render for the SGS Option Picker block.
 *
 * BLOCK-PRIVATE, NO-INLINE, NO-WRAPPER (LOCKED per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-09 — D294 pattern selector): sgs/option-picker
 * is CONTENT-kind (box + width only — `SGS_Container_Wrapper::render()` for
 * 'content' kind only ever emitted maxWidth/contentWidth/padding, never
 * grid/background/overlay/shape-divider machinery) and it already renders a
 * single semantic root (`<fieldset>`), so the shared wrapper was dead weight —
 * same proven pattern as sgs/quote (D294). The `<fieldset>` IS the block root,
 * built via get_block_wrapper_attributes(); the rendered subtree carries ZERO
 * inline CSS property declarations — every declaration (root box/border/width,
 * WP color/spacing/border supports, pill resting/selected state, legend
 * typography) is emitted into the block's OWN scoped `.{uid}` <style> tag. WP
 * styling supports declare `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() never auto-inlines them.
 *
 * Because the root can carry the anchor `id` (ToC), the scoped uid is a CLASS
 * (`sgs-op-{md5}`, container/quote-style), never an `id`.
 *
 * Pill resting/selected colour + border-radius are attribute-driven CSS custom
 * PROPERTY VALUES (`--sgs-op-*`) consumed by style.css's `.sgs-option-picker`
 * class rules — never inline property declarations (Spec 32 FR-32-4). This is
 * also what makes the pill states CLONEABLE: the universal styling-lift
 * (Spec 31 §3.B B2) matches each attr's `derived_selector` against the draft's
 * DOM by BEM class — resting on `.sgs-option-picker__pill`, selected on the
 * draft's static `--active` modifier class (the mockup shows one pill
 * selected by baking the modifier class directly into the markup).
 *
 * R-22-14: explicit discriminators, never empty($content).
 * No WP Interactivity API store — plain DOM events via view.js (untouched).
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
 * slug (e.g. "flavour") or a full taxonomy name (e.g. "pa_flavour"). The
 * helper below normalises both forms. If the resolved taxonomy does not
 * exist or WooCommerce is absent, swatch lookup is silently skipped and
 * every pill renders as plain text — this preserves the no-swatch path.
 *
 * SEC-3 / no-inline security: all values emitted to HTML attributes use
 * esc_attr()/esc_url(); free-text CSS-keyword attrs pass a keyword
 * sanitiser; the scoped `<style>` blob is emitted via wp_strip_all_tags().
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
// 1. Box-object interface contract §1 + security §D sanitisers.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration. Mirrors sgs/button + sgs/quote + sgs/container.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — free-text attrs concatenated into raw CSS
// declarations (border-style). Strips everything except letters + hyphen.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Attribute extraction.
// ---------------------------------------------------------------------------

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
$colour_preset        = $attributes['colourPreset'] ?? '';
$show_selected_tick   = array_key_exists( 'showSelectedTick', $attributes ) ? (bool) $attributes['showSelectedTick'] : true;
$pill_bg_colour       = $attributes['pillBgColour'] ?? '';
$pill_text_colour     = $attributes['pillTextColour'] ?? '';
$pill_border_colour   = $attributes['pillBorderColour'] ?? '';
$pill_sel_bg_colour   = $attributes['pillSelectedBgColour'] ?? '';
$pill_sel_text_colour = $attributes['pillSelectedTextColour'] ?? '';
$pill_sel_border_col  = $attributes['pillSelectedBorderColour'] ?? '';
// Border-radius attrs are CSS-length STRINGS (e.g. "6px") — so the universal
// styling-lift's generic string value lands in a matching string attr (no
// number/string mismatch) AND an explicit "0"/"0px" is distinguishable from
// unset (empty = fall to the CSS default var). '' !== gate, never `> 0`.
$pill_border_radius   = isset( $attributes['pillBorderRadius'] ) ? (string) $attributes['pillBorderRadius'] : '';
$pill_sel_radius_raw  = isset( $attributes['pillSelectedBorderRadius'] ) ? (string) $attributes['pillSelectedBorderRadius'] : '';

// Root wrapper (box+width only, content-kind — matches the mirrored
// SGS_Container_Wrapper 'content' capability set).
$content_width = $attributes['contentWidth'] ?? '';
$max_width     = $attributes['maxWidth'] ?? '';

// Root border — custom attrs (mirrors sgs/quote: radius stays WP-native,
// width/style/colour are SGS custom so width can be a 4-side object).
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_right  = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bottom = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_left   = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width     = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
$border_colour         = $attributes['borderColour'] ?? '';

// ---------------------------------------------------------------------------
// 3. Guard: render nothing if no options.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 4. Unique CLASS id for scoped CSS (content-hash — stable across
// fragment-cached renders; a CLASS not an id so the anchor `id` stays free).
// ---------------------------------------------------------------------------

$uid        = 'sgs-op-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$radio_name = $uid . '-choice';
$legend_id  = $uid . '-legend';
$root_sel   = '.' . $uid . '.wp-block-sgs-option-picker';

// ---------------------------------------------------------------------------
// 5. WP-native style.* (skip-serialised → emitted scoped, never inline).
// ---------------------------------------------------------------------------

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

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? $sgs_css_length( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

$style_colour_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_colour_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_colour_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// Pill custom padding object (SGS custom — the pill is a content CHILD, not
// the block root, so there is no WP-native support to route through).
$pill_padding_obj        = is_array( $attributes['pillPadding'] ?? null ) ? $attributes['pillPadding'] : array();
$pill_padding_tablet_obj = is_array( $attributes['pillPaddingTablet'] ?? null ) ? $attributes['pillPaddingTablet'] : array();
$pill_padding_mobile_obj = is_array( $attributes['pillPaddingMobile'] ?? null ) ? $attributes['pillPaddingMobile'] : array();

// ---------------------------------------------------------------------------
// 6. Scoped CSS custom-PROPERTY VALUES (never property declarations) for
// pill resting/selected colour + radius, root border colour. These are the
// ONLY per-instance override channel (Spec 32 FR-32-4) — set on the root
// element as `--var:value`, consumed by style.css's class rules.
// ---------------------------------------------------------------------------

$var_decls = array();

if ( $pill_bg_colour ) {
	$var_decls[] = '--sgs-op-bg:' . sgs_colour_value( $pill_bg_colour );
}
if ( $pill_text_colour ) {
	$var_decls[] = '--sgs-op-text:' . sgs_colour_value( $pill_text_colour );
}
if ( $pill_border_colour ) {
	$var_decls[] = '--sgs-op-border:' . sgs_colour_value( $pill_border_colour );
}
if ( $pill_sel_bg_colour ) {
	$var_decls[] = '--sgs-op-sel-bg:' . sgs_colour_value( $pill_sel_bg_colour );
}
if ( $pill_sel_text_colour ) {
	$var_decls[] = '--sgs-op-sel-text:' . sgs_colour_value( $pill_sel_text_colour );
}
if ( $pill_sel_border_col ) {
	// R2: the selected border is DECOUPLED from the fill — a distinct var with
	// its own fallback to --sgs-op-sel-bg (byte-identical when unset).
	$var_decls[] = '--sgs-op-sel-border:' . sgs_colour_value( $pill_sel_border_col );
}
if ( '' !== $pill_border_radius ) {
	// CSS-length string — emit the value directly (sanitised), preserving an
	// explicit "0"/"0px". '' = unset → the CSS default var governs.
	$pbr_safe = $sgs_css_length( $pill_border_radius );
	if ( '' !== $pbr_safe ) {
		$var_decls[] = '--sgs-op-pill-radius:' . $pbr_safe;
	}
}
if ( '' !== $pill_sel_radius_raw ) {
	$psr_safe = $sgs_css_length( $pill_sel_radius_raw );
	if ( '' !== $psr_safe ) {
		$var_decls[] = '--sgs-op-sel-pill-radius:' . $psr_safe;
	}
}
if ( $border_colour ) {
	$var_decls[] = '--sgs-op-root-border-colour:' . sgs_colour_value( $border_colour );
}

// ---------------------------------------------------------------------------
// 7. Scoped <style> — root box/border/pill-padding declarations, base
// WP-native style.* (via wp_style_engine_get_styles, exactly how WP core
// outputs `layout` support), and Tablet/Mobile tiers.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Root box declarations (border-style/width, width, max-width) ---
$root_decls = array();
if ( 'none' !== $border_style ) {
	if ( $has_border_width ) {
		$bwt          = '' !== $border_width_top ? $border_width_top : '0';
		$bwr          = '' !== $border_width_right ? $border_width_right : '0';
		$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl          = '' !== $border_width_left ? $border_width_left : '0';
		$root_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	$root_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$root_decls[] = 'border-color:var(--sgs-op-root-border-colour)';
	}
}
if ( $max_width ) {
	$mw_safe = $sgs_css_length( $max_width );
	if ( '' !== $mw_safe ) {
		$root_decls[] = 'max-width:' . $mw_safe;
		$root_decls[] = 'margin-inline:auto';
	}
}
if ( $content_width ) {
	$cw_safe = $sgs_css_length( $content_width );
	if ( '' !== $cw_safe ) {
		$root_decls[] = 'width:' . $cw_safe;
	}
}
if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}

// --- Base WP-native style.* — skip-serialised, emitted scoped (contract §A/§b) ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

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

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}

	$color_args = array();
	if ( '' !== $style_colour_text ) {
		$color_args['text'] = $style_colour_text;
	}
	if ( '' !== $style_colour_bg ) {
		$color_args['background'] = $style_colour_bg;
	}
	if ( '' !== $style_colour_gradient ) {
		$color_args['gradient'] = $style_colour_gradient;
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

// --- Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand (contract §B/§B2: tablet max-width:1023px, mobile max-width:767px). ---
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

$sgs_corner_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	$tr = $sgs_css_length( $box['topRight'] ?? '' );
	$br = $sgs_css_length( $box['bottomRight'] ?? '' );
	$bl = $sgs_css_length( $box['bottomLeft'] ?? '' );
	if ( '' === $tl && '' === $tr && '' === $br && '' === $bl ) {
		return null;
	}
	return ( '' !== $tl ? $tl : '0' ) . ' ' . ( '' !== $tr ? $tr : '0' ) . ' ' . ( '' !== $br ? $br : '0' ) . ' ' . ( '' !== $bl ? $bl : '0' );
};

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );
$radius_tab_val  = $sgs_corner_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = $sgs_corner_shorthand( $border_radius_mobile_obj );

$tablet_root_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_root_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_root_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_root_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_root_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_root_decls ) . ';}}';
}

$mobile_root_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_root_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_root_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_root_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_root_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_root_decls ) . ';}}';
}

// --- Pill custom padding object — base + tiers, scoped on the pill selector
// (SGS custom family; falls back to the per-size default in style.css when
// unset — byte-identical default behaviour). ---
$sel_pill        = "{$root_sel} .sgs-option-picker__pill";
$pill_padding_val      = $sgs_box_shorthand( $pill_padding_obj );
$pill_padding_tab_val  = $sgs_box_shorthand( $pill_padding_tablet_obj );
$pill_padding_mob_val  = $sgs_box_shorthand( $pill_padding_mobile_obj );

if ( null !== $pill_padding_val ) {
	$scoped_css[] = "{$sel_pill}{padding:{$pill_padding_val};}";
}
if ( null !== $pill_padding_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$sel_pill}{padding:{$pill_padding_tab_val};}}";
}
if ( null !== $pill_padding_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$sel_pill}{padding:{$pill_padding_mob_val};}}";
}

// --- Legend typography (font-size/tablet/mobile) via the shared responsive
// helper — colour/margin-bottom are single declarations, scoped below. ---
$sel_label = "{$root_sel} .sgs-option-picker__label";

$typography_css = sgs_typography_css_rule( $attributes, 'label', $sel_label )
	. sgs_typography_css_rule( $attributes, 'pill', $sel_pill );
if ( '' !== $typography_css ) {
	$scoped_css[] = $typography_css;
}

$legend_decls = array();
if ( '' !== $label_colour ) {
	$legend_decls[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( '' !== $label_margin_bottom ) {
	$mb_safe = $sgs_css_length( $label_margin_bottom );
	if ( '' !== $mb_safe ) {
		$legend_decls[] = 'margin-bottom:' . $mb_safe;
	}
}
if ( $legend_decls ) {
	$scoped_css[] = "{$sel_label}{" . implode( ';', $legend_decls ) . ';}';
}

// ---------------------------------------------------------------------------
// 8. FR-27-B2: resolve WooCommerce attribute taxonomy for swatch lookup.
// ---------------------------------------------------------------------------

$swatch_taxonomy = '';

if ( '' !== $type_key && function_exists( 'wc_get_attribute_taxonomy_names' ) ) {
	$candidates = array(
		sanitize_key( $type_key ),
		'pa_' . sanitize_key( $type_key ),
	);
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

/* ── Build a map: option_slug => array( 'color' => string|'', 'image_id' => int ) ── */

$swatch_map = array();

if ( '' !== $swatch_taxonomy ) {
	foreach ( $valid_items as $item ) {
		$attr_term = get_term_by( 'slug', $item['key'], $swatch_taxonomy );
		if ( ! $attr_term instanceof \WP_Term ) {
			continue;
		}

		$color_raw    = get_term_meta( $attr_term->term_id, '_sgs_swatch_color', true );
		$image_id_raw = get_term_meta( $attr_term->term_id, '_sgs_swatch_image_id', true );

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

// ---------------------------------------------------------------------------
// 9. Build the legend + options markup.
// ---------------------------------------------------------------------------

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

$data_type_key = $type_key
	? ' data-type-key="' . esc_attr( sanitize_html_class( $type_key ) ) . '"'
	: '';

$data_content_impact = '';
if ( ! empty( $content_impact ) && is_array( $content_impact ) ) {
	$safe_impacts        = array_map( 'sanitize_html_class', array_filter( $content_impact ) );
	$data_content_impact = ' data-content-impact="' . esc_attr( implode( ',', $safe_impacts ) ) . '"';
}

$pills_html = '';

foreach ( $valid_items as $item ) {
	$is_checked  = $item['key'] === $resolved_default;
	$input_id    = $uid . '-' . $item['key'];
	$checked_str = $is_checked ? ' checked' : '';

	$swatch            = isset( $swatch_map[ $item['key'] ] ) ? $swatch_map[ $item['key'] ] : null;
	$swatch_image_html = '';
	$swatch_chip_html  = '';
	$pill_extra_var    = '';
	$pill_extra_class  = '';

	if ( null !== $swatch ) {
		$image_id = $swatch['image_id'];
		$color    = $swatch['color'];

		if ( $image_id > 0 ) {
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
		} elseif ( '' !== $color ) {
			// Colour chip — the swatch background is a decorative DATA VALUE (the
			// colour term's own swatch, not a styling property of the block). It
			// is carried as a CSS custom-property VALUE (`--sgs-op-swatch-bg`) and
			// painted by style.css, so NOTHING renders as an inline property
			// declaration (no-inline contract, Spec 32) — mirroring the sibling
			// `--sgs-op-swatch-text` var below.
			$contrast_colour = sgs_wcag_text_colour_for_bg( $color );

			$swatch_chip_html = sprintf(
				'<span class="sgs-option-picker__swatch sgs-option-picker__swatch--colour" style="--sgs-op-swatch-bg:%s;" aria-hidden="true"></span>',
				esc_attr( $color )
			);
			$pill_extra_class = ' sgs-option-picker__pill--has-colour';
			// --sgs-op-swatch-text is a CSS custom-property VALUE (not a property
			// declaration) — allowed inline per Spec 32 FR-32-4.
			$pill_extra_var = ' style="--sgs-op-swatch-text:' . esc_attr( $contrast_colour ) . ';"';
		}
	}

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
		$pill_extra_var,     // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_attr(); var VALUE only.
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

// ---------------------------------------------------------------------------
// 10. Build the root element's classes + attributes. No wrapper div (§B3) —
// the <fieldset> IS the block root.
// ---------------------------------------------------------------------------

$allowed_styles = array( 'outlined', 'filled', 'ghost' );
$allowed_sizes  = array( 'small', 'medium', 'large' );
$allowed_preset = array( '', 'soft', 'solid' );

$safe_style  = in_array( $pill_style, $allowed_styles, true ) ? $pill_style : 'outlined';
$safe_size   = in_array( $pill_size, $allowed_sizes, true ) ? $pill_size : 'medium';
$safe_preset = in_array( $colour_preset, $allowed_preset, true ) ? $colour_preset : '';

$root_classes = array(
	'wp-block-sgs-option-picker',
	'sgs-option-picker',
	'sgs-option-picker--' . $safe_style,
	'sgs-option-picker--' . $safe_size,
	$uid,
);
if ( '' !== $safe_preset ) {
	$root_classes[] = 'sgs-option-picker--' . $safe_preset;
}
if ( ! $show_selected_tick ) {
	$root_classes[] = 'sgs-option-picker--no-tick';
}

// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (mirrors sgs/quote + sgs/button).
if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$anchor = $attributes['anchor'] ?? '';

$root_attr_args = array(
	'class' => implode( ' ', $root_classes ),
);
if ( $var_decls ) {
	// The ONLY inline `style` output permitted — CSS custom-property VALUES,
	// never property declarations (Spec 32 FR-32-4). Functional-colour values
	// are normalised to hex by sgs_colour_value() so they survive WordPress's
	// safecss_filter_attr() (which strips inline rgb()/rgba()/hsl()).
	$root_attr_args['style'] = implode( ';', $var_decls ) . ';';
}
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}

$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 11. Render.
// ---------------------------------------------------------------------------

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (matches SGS_Container_Wrapper + sgs/quote).
	// Every value reaching $scoped_css is pre-sanitised ($sgs_css_length /
	// $sgs_css_keyword / sgs_colour_value / wp_style_engine_get_styles /
	// sgs_typography_css_rule), so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<fieldset <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $legend_html . $options_div_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></fieldset>
