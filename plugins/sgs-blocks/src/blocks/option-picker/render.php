<?php
/**
 * Server-side render for the SGS Option Picker block.
 *
 * BLOCK-PRIVATE, NO-INLINE, NO-WRAPPER (per-block no-inline contract
 * §A/§B/§B3): sgs/option-picker is CONTENT-kind (box + width only — no
 * grid/background/overlay/shape-divider machinery) and it renders a single
 * semantic root (`<fieldset>`), so it makes no `SGS_Container_Wrapper` call —
 * same pattern as sgs/quote. The `<fieldset>` IS the block root, built via
 * get_block_wrapper_attributes().
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check.
 *
 * Because the root can carry the anchor `id` (ToC), the scoped uid is a CLASS
 * (`sgs-op-{md5}`, container/quote-style), never an `id`.
 *
 * Pill resting/hover/selected colour + border-radius are attribute-driven CSS
 * custom PROPERTY VALUES (`--sgs-op-*`) consumed by style.css's
 * `.sgs-option-picker` class rules — never inline property declarations.
 * Inline `--var` declarations are forbidden too (Spec 32 FR-32-4) — every
 * `--sgs-op-*` value (root resting/hover/selected/
 * radius vars + the per-pill swatch bg/text vars) is emitted into the
 * block's OWN scoped `.{uid}`
 * `<style>` tag, never as an inline `style="--var:…"` attribute. This is
 * also what makes the pill states CLONEABLE: the universal styling-lift
 * (Spec 32 section 6.1) matches each attr's `derived_selector` against the draft's
 * DOM by BEM class — resting on `.sgs-option-picker__pill`, selected on the
 * draft's static `--active` modifier class (the mockup shows one pill
 * selected by baking the modifier class directly into the markup).
 *
 * FP-14: explicit discriminators, never empty($content).
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

// padding/margin are owned tier-object attrs {desktop,tablet,mobile}.
// Normalise once, into fresh locals only -- never write back into
// $attributes.
// sgs_responsive_normalise_object() lives in helpers-responsive.php,
// which this file's own render-helpers.php require below WOULD load --
// but too late, since these two calls run before that require executes.
// A block whose render.php is the first SGS block PHP to run in a request
// (e.g. the site-header navigation bar, present on every page) would
// otherwise fatal with "Call to undefined function". Requiring the
// defining file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once __DIR__ . '/sub-label-support.php';
require_once dirname( __DIR__, 3 ) . '/includes/media/render-item-slot.php';

// ---------------------------------------------------------------------------
// 1. Box-object interface contract §1 + security §D sanitisers.
// ---------------------------------------------------------------------------

// The sanitisers come from the shared helpers loaded above: sgs_css_length_value()
// (includes/helpers-css-safety.php) keeps an object-attr side or corner value from
// breaking out of its declaration, and sgs_css_keyword_sanitise() (includes/helpers-box.php)
// keeps a free-text keyword (border-style) to letters and hyphens.

// ---------------------------------------------------------------------------
// 2. Attribute extraction.
// ---------------------------------------------------------------------------

$label                = $attributes['label'] ?? __( 'Choose an option', 'sgs-blocks' );
$show_label           = $attributes['showLabel'] ?? true;
$label_colour         = $attributes['labelColour'] ?? '';
$label_colour_gradient = $attributes['labelColourGradient'] ?? '';
$label_margin_bottom  = $attributes['labelMarginBottom'] ?? '';
$option_items         = $attributes['optionItems'] ?? array();
$default_selected     = $attributes['defaultSelected'] ?? '';
$content_impact       = $attributes['contentImpact'] ?? array();
$type_key             = $attributes['typeKey'] ?? '';
$sub_label_meta_key   = isset( $attributes['subLabelMetaKey'] ) ? sanitize_key( (string) $attributes['subLabelMetaKey'] ) : '';
$show_term_details    = array_key_exists( 'showTermDetails', $attributes ) ? (bool) $attributes['showTermDetails'] : true;
$pill_style           = $attributes['pillStyle'] ?? 'outlined';
// Validated once, up front, so the 'tile' image-size lookup (§8) and the
// root-class build (§10) share one allow-listed value -- no duplicate list.
$allowed_pill_styles  = array( 'outlined', 'filled', 'ghost', 'tile' );
$pill_style_safe      = in_array( $pill_style, $allowed_pill_styles, true ) ? $pill_style : 'outlined';
$tile_gap_raw         = isset( $attributes['tileGap'] ) ? (string) $attributes['tileGap'] : '';
$pill_size            = $attributes['pillSize'] ?? 'medium';
$colour_preset        = $attributes['colourPreset'] ?? '';
$show_selected_tick   = array_key_exists( 'showSelectedTick', $attributes ) ? (bool) $attributes['showSelectedTick'] : false;
$pill_bg_colour       = $attributes['pillBgColour'] ?? '';
$pill_bg_colour_gradient = $attributes['pillBgColourGradient'] ?? '';
$pill_text_colour     = $attributes['pillTextColour'] ?? '';

// Pill HOVER colours — real attributes. Empty = fall through to the
// static preset-variant hover look via the CSS var() fallback chain in
// style.css.
$pill_bg_colour_hover   = $attributes['pillBgColourHover'] ?? '';
$pill_bg_colour_hover_gradient = $attributes['pillBgColourHoverGradient'] ?? '';
$pill_text_colour_hover = $attributes['pillTextColourHover'] ?? '';

$pill_border_colour   = $attributes['pillBorderColour'] ?? '';
$pill_border_gradient = sgs_css_gradient_value( $attributes['pillBorderColourGradient'] ?? '' );
$pill_sel_bg_colour   = $attributes['pillSelectedBgColour'] ?? '';
$pill_sel_text_colour = $attributes['pillSelectedTextColour'] ?? '';
$pill_sel_border_col  = $attributes['pillSelectedBorderColour'] ?? '';
$pill_sel_border_gradient = sgs_css_gradient_value( $attributes['pillSelectedBorderColourGradient'] ?? '' );
// Border-radius attrs are CSS-length STRINGS (e.g. "6px") — so the universal
// styling-lift's generic string value lands in a matching string attr (no
// number/string mismatch) AND an explicit "0"/"0px" is distinguishable from
// unset (empty = fall to the CSS default var). '' !== gate, never `> 0`.
$pill_border_radius   = isset( $attributes['pillBorderRadius'] ) ? (string) $attributes['pillBorderRadius'] : '';
$pill_sel_radius_raw  = isset( $attributes['pillSelectedBorderRadius'] ) ? (string) $attributes['pillSelectedBorderRadius'] : '';

// Root wrapper (box+width only, content-kind — matches the mirrored
// SGS_Container_Wrapper 'content' capability set). This block renders
// no inner band — the value becomes a plain `width:` in $root_decls beside
// `max-width:`. `contentWidth` is reserved for a real second layer; a fixed
// width is `width`.
$content_width = $attributes['width'] ?? '';
$max_width     = $attributes['maxWidth'] ?? '';

// Root border — custom attrs (mirrors sgs/quote: radius stays WP-native,
// width/style/colour are SGS custom so width can be a 4-side object).
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width     = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? '';
$border_style          = sgs_border_style_keyword( $border_style_raw );
$border_colour         = $attributes['borderColour'] ?? '';
$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );

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

	$seen_keys[] = $key;
	$valid_item  = array(
		'key'   => $key,
		'label' => '' !== $label_text ? $label_text : $key,
	);
	// A caller's per-item picture (sgs/buybox pickerVariationSwatch) survives validation, as the media item it is
	// (`source`, `alt`, `decorative`, `fit`, `focal`); the pill loop below reads it ahead of the term-meta swatch.
	if ( sgs_media_item_has_source( (array) $item ) ) {
		foreach ( array( 'source', 'alt', 'decorative', 'fit', 'focal' ) as $media_key ) {
			if ( isset( $item[ $media_key ] ) ) {
				$valid_item[ $media_key ] = $item[ $media_key ];
			}
		}
	}
	// A caller's per-item second line (the buybox pack tile's variation price) wins over the term-meta sub-label.
	$item_sub_label_text = isset( $item['subLabel'] ) ? sanitize_text_field( trim( (string) $item['subLabel'] ) ) : '';
	if ( '' !== $item_sub_label_text ) {
		$valid_item['subLabel'] = $item_sub_label_text;
	}
	$valid_items[] = $valid_item;
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

// Fall back to the first option if no valid default was found, unless the
// picker must start with nothing selected (`requireChoice`: the guided buybox's
// groups with no product default, so a choice is always the shopper's own).
if ( '' === $resolved_default && empty( $attributes['requireChoice'] ) ) {
	$resolved_default = $valid_items[0]['key'];
}

// ---------------------------------------------------------------------------
// 4. Unique CLASS id for scoped CSS (content-hash — stable across
// fragment-cached renders; a CLASS not an id so the anchor `id` stays free).
// ---------------------------------------------------------------------------

$uid        = 'sgs-op-' . sgs_instance_scope_hash( $attributes, $block );
$radio_name = $uid . '-choice';
$legend_id  = $uid . '-legend';
$root_sel   = '.' . $uid . '.wp-block-sgs-option-picker';

// The image swatches: one item of the `swatch` slot each (Spec 49 §8.3). The renderer's group span IS the swatch box
// (`sgs-option-picker__swatch--image`), so the block's Width and Shape size and clip it; the block-level rules print
// once, each pill's own source, alt and fit under its own scope class.
$sgs_op_swatch_css    = '';
$sgs_op_render_swatch = sgs_media_item_renderer(
	sgs_media_item_slot_for( $block, 'swatch' ),
	$attributes,
	'sgs/option-picker',
	$uid . '-media',
	array(
		'desktop' => 0,
		'tablet'  => 0,
		'mobile'  => 0,
	),
	$sgs_op_swatch_css,
	'sgs-option-picker__swatch sgs-option-picker__swatch--image'
);

// ---------------------------------------------------------------------------
// 5. WP-native style.* (skip-serialised → emitted scoped, never inline).
// ---------------------------------------------------------------------------

$base_padding_obj = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

$radius_tiers            = sgs_border_radius_tiers( $attributes );
$base_border_radius       = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

$style_colour_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_colour_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_colour_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// Pill custom padding — SGS custom TIER-OF-BOXES object attr
// {desktop,tablet,mobile} (Spec 35 box-tier). The pill is a
// content CHILD, not the block root, so there is no WP-native support to
// route through. sgs_responsive_normalise_object() is the canonical reader
// (helpers-responsive.php), box=true so an unset or flat value never
// mis-resolves as a flat side.
$pill_padding_tiers      = sgs_responsive_normalise_object( $attributes['pillPadding'] ?? null, true );
$pill_padding_obj        = is_array( $pill_padding_tiers['desktop'] ) ? $pill_padding_tiers['desktop'] : array();
$pill_padding_tablet_obj = is_array( $pill_padding_tiers['tablet'] ) ? $pill_padding_tiers['tablet'] : array();
$pill_padding_mobile_obj = is_array( $pill_padding_tiers['mobile'] ) ? $pill_padding_tiers['mobile'] : array();

// ---------------------------------------------------------------------------
// 6. Scoped CSS custom-PROPERTY VALUES (never property declarations, never
// inline) for pill resting/hover/selected colour + radius, root border
// colour. Per Spec 32 FR-32-4, these are
// emitted into the scoped `{$root_sel}{--var:value;…}` rule below (§7) —
// NOT as an inline `style="--var:value"` attribute — consumed by
// style.css's class rules via var(--sgs-op-*, …). The --sgs-op-*-hover
// vars feed the :hover rules — style.css chains
// var(--sgs-op-*-hover, var(--sgs-op-*, <hardcoded default>)) so an
// instance with nothing configured renders the default look.
// ---------------------------------------------------------------------------

$var_decls = array();

// pillBgColour/pillBgColourHover gradient siblings — same
// custom-property-gradient shape used on brand-strip/post-grid/
// social-icons/form/gallery/before-after (helpers-tokens.php); style.css
// carries the matching background-image:var(--sgs-op-bg[-hover]-gradient,none)
// line next to the existing background-color:var(...) rule.
$var_decls = array_merge( $var_decls, sgs_custom_property_gradient_decls( 'sgs-op-bg', $pill_bg_colour, $pill_bg_colour_gradient ) );
if ( $pill_text_colour ) {
	$var_decls[] = '--sgs-op-text:' . sgs_colour_value( $pill_text_colour );
}
$var_decls = array_merge( $var_decls, sgs_custom_property_gradient_decls( 'sgs-op-bg-hover', $pill_bg_colour_hover, $pill_bg_colour_hover_gradient ) );
if ( $pill_text_colour_hover ) {
	$var_decls[] = '--sgs-op-text-hover:' . sgs_colour_value( $pill_text_colour_hover );
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
	// The selected border is DECOUPLED from the fill — a distinct var with
	// its own fallback to --sgs-op-sel-bg.
	$var_decls[] = '--sgs-op-sel-border:' . sgs_colour_value( $pill_sel_border_col );
}
if ( '' !== $pill_border_radius ) {
	// CSS-length string — emit the value directly (sanitised), preserving an
	// explicit "0"/"0px". '' = unset → the CSS default var governs.
	$pbr_safe = sgs_css_length_value( $pill_border_radius );
	if ( '' !== $pbr_safe ) {
		$var_decls[] = '--sgs-op-pill-radius:' . $pbr_safe;
	}
}
$pill_border_width_safe = sgs_css_length_value( (string) ( $attributes['pillBorderWidth'] ?? '' ) );
if ( '' !== $pill_border_width_safe ) {
	$var_decls[] = '--sgs-op-border-width:' . $pill_border_width_safe;
}
if ( '' !== $pill_sel_radius_raw ) {
	$psr_safe = sgs_css_length_value( $pill_sel_radius_raw );
	if ( '' !== $psr_safe ) {
		$var_decls[] = '--sgs-op-sel-pill-radius:' . $psr_safe;
	}
}
if ( $border_colour ) {
	$var_decls[] = '--sgs-op-root-border-colour:' . sgs_colour_value( $border_colour );
}
// Tile gap (Wave B, tile pill style only) — CSS-length string, same shape as
// the border-radius vars above. Empty = unset, style.css's own
// `var(--sgs-option-picker-tile-gap, 8px)` fallback governs.
if ( '' !== $tile_gap_raw ) {
	$tile_gap_safe = sgs_css_length_value( $tile_gap_raw );
	if ( '' !== $tile_gap_safe ) {
		$var_decls[] = '--sgs-option-picker-tile-gap:' . $tile_gap_safe;
	}
}

// ---------------------------------------------------------------------------
// 7. Scoped <style> — root box/border/pill-padding declarations, base
// WP-native style.* (via wp_style_engine_get_styles, exactly how WP core
// outputs `layout` support), and Tablet/Mobile tiers.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Root custom-property VALUES (§6) — the ONLY per-instance override
// channel (Spec 32 FR-32-4), scoped here rather than emitted inline. ---
$swatch_tick_inside = ! empty( $attributes['swatchTickInside'] );
$swatch_tick_colour = sgs_colour_value( (string) ( $attributes['swatchTickColour'] ?? '' ) );
if ( $swatch_tick_inside && '' !== $swatch_tick_colour ) {
	$var_decls[] = '--sgs-op-swatch-tick:' . $swatch_tick_colour;
}
if ( $var_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $var_decls ) . ';}';
}

// --- Colour dot shape, size and ring (a tile keeps its full-width colour block). Unset prints nothing. ---
if ( 'tile' !== $pill_style_safe ) {
	$swatch_decls = array();
	// The dot's shape is the swatch slot's Shape: circle rounds it, none squares it, anything else keeps the stylesheet's.
	$swatch_shape = is_array( $attributes['swatchShape'] ?? null ) ? sgs_media_item_device_tiers( $attributes['swatchShape'] ) : array();
	$swatch_kind  = is_array( $swatch_shape['desktop'] ?? null ) ? (string) ( $swatch_shape['desktop']['shape'] ?? '' ) : '';
	if ( 'circle' === $swatch_kind ) {
		$swatch_decls[] = 'border-radius:50%';
	} elseif ( 'none' === $swatch_kind ) {
		$swatch_decls[] = 'border-radius:0';
	}
	$swatch_size = sgs_css_length_value( (string) ( $attributes['swatchSize'] ?? '' ) );
	if ( '' !== $swatch_size ) {
		$swatch_decls[] = 'width:' . $swatch_size;
		$swatch_decls[] = 'height:' . $swatch_size;
	}
	$swatch_ring_width = sgs_css_length_value( (string) ( $attributes['swatchRingWidth'] ?? '' ) );
	if ( '' !== $swatch_ring_width ) {
		$swatch_decls[] = 'border-width:' . $swatch_ring_width;
	}
	$swatch_ring_colour = sgs_colour_value( (string) ( $attributes['swatchRingColour'] ?? '' ) );
	if ( '' !== $swatch_ring_colour ) {
		$swatch_decls[] = 'border-color:' . $swatch_ring_colour;
	}
	if ( $swatch_decls ) {
		$scoped_css[] = "{$root_sel} .sgs-option-picker__swatch--colour{" . implode( ';', $swatch_decls ) . ';}';
	}
}

// --- Root box declarations (border-style/width, width, max-width) ---
$root_decls = array();
// 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width.
if ( 'none' !== $border_style && $has_border_width ) {
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
	$mw_safe = sgs_css_length_value( $max_width );
	if ( '' !== $mw_safe ) {
		$root_decls[] = 'max-width:' . $mw_safe;
		$root_decls[] = 'margin-inline:auto';
	}
}
if ( $content_width ) {
	$cw_safe = sgs_css_length_value( $content_width );
	if ( '' !== $cw_safe ) {
		$root_decls[] = 'width:' . $cw_safe;
	}
}
if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}

// --- Border gradients (border builder) — masked ::before rings.
// Root: only relevant when a real border is on (mirrors the flat-colour gate
// above). Pill: all 3 style variants (outlined/filled/ghost) share an
// identical `border: 2px solid …` shorthand on .sgs-option-picker__pill
// (style.css), so ONE universal rule covers every variant — no
// per-style carve-out. Selected: the compound `:checked ~ .pill` selector is
// reproduced verbatim so specificity matches the flat-colour rule it
// overrides (both rooted at $root_sel, which out-specifies the variant
// class prefix style.css itself uses). ---
if ( '' !== $border_colour_gradient && 'none' !== $border_style ) {
	$root_gradient_width = '' !== $border_width_top ? $border_width_top : '1px';
	$scoped_css[]         = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, $root_gradient_width );
}
if ( '' !== $pill_border_gradient ) {
	$scoped_css[] = sgs_border_gradient_css( "{$root_sel} .sgs-option-picker__pill", $pill_border_gradient, null, '2px' );
}
if ( '' !== $pill_sel_border_gradient ) {
	$scoped_css[] = sgs_border_gradient_css(
		"{$root_sel} .sgs-option-picker__option input[type=\"radio\"]:checked ~ .sgs-option-picker__pill",
		$pill_sel_border_gradient,
		null,
		'2px'
	);
}

// --- Resting pill shadow (the base the selected shadow replaces). Unset prints nothing. ---
$rest_pill_decls = sgs_shadow_decls(
	$attributes,
	array(
		'base'   => 'pillShadow',
		'colour' => 'pillShadowColour',
	),
	'sgs/option-picker'
)['normal'];
if ( $rest_pill_decls ) {
	$scoped_css[] = "{$root_sel} .sgs-option-picker__pill{" . implode( ';', $rest_pill_decls ) . ';}';
}

// --- Selected pill shadow + offset. Unset prints nothing. The shadow goes through the shared
// emitter; the offset uses the individual `translate` property so a hover `transform` is untouched. ---
$sel_pill_decls = sgs_shadow_decls(
	$attributes,
	array(
		'base'   => 'pillSelectedShadow',
		'colour' => 'pillSelectedShadowColour',
	),
	'sgs/option-picker'
)['normal'];
$sel_offset_x   = sgs_css_length_value( (string) ( $attributes['pillSelectedOffsetX'] ?? '' ) );
$sel_offset_y   = sgs_css_length_value( (string) ( $attributes['pillSelectedOffsetY'] ?? '' ) );
if ( '' !== $sel_offset_x || '' !== $sel_offset_y ) {
	$sel_pill_decls[] = 'translate:' . ( '' !== $sel_offset_x ? $sel_offset_x : '0' ) . ' ' . ( '' !== $sel_offset_y ? $sel_offset_y : '0' );
}
if ( $sel_pill_decls ) {
	$scoped_css[] = "{$root_sel} .sgs-option-picker__option input[type=\"radio\"]:checked ~ .sgs-option-picker__pill{" . implode( ';', $sel_pill_decls ) . ';}';
}

// --- Hover shift, and no brightening on hover. The shift uses the individual `translate` property so the tile's own
// hover transform is cleared only when a shift is set. Unset prints nothing. ---
$hover_offset_x = sgs_css_length_value( (string) ( $attributes['pillHoverOffsetX'] ?? '' ) );
$hover_offset_y = sgs_css_length_value( (string) ( $attributes['pillHoverOffsetY'] ?? '' ) );
if ( '' !== $hover_offset_x || '' !== $hover_offset_y ) {
	$scoped_css[] = "{$root_sel} .sgs-option-picker__option:hover .sgs-option-picker__pill{transform:none;translate:" . ( '' !== $hover_offset_x ? $hover_offset_x : '0' ) . ' ' . ( '' !== $hover_offset_y ? $hover_offset_y : '0' ) . ';}';
}
if ( ! empty( $attributes['pillHoverStill'] ) ) {
	$still_vars = array();
	if ( '' === (string) $pill_bg_colour_hover && '' === (string) $pill_bg_colour_hover_gradient ) {
		$still_vars[] = '--sgs-op-bg-hover:var(--sgs-op-bg,transparent)';
	}
	if ( '' === (string) $pill_text_colour_hover ) {
		$still_vars[] = '--sgs-op-text-hover:currentcolor';
	}
	if ( $still_vars ) {
		$scoped_css[] = "{$root_sel}{" . implode( ';', $still_vars ) . ';}';
	}
}

// --- Base WP-native style.* — skip-serialised, emitted scoped (contract §A/§b) ---

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

// --- Responsive padding/margin/border-radius tiers — box objects, longhands for
// the set sides and corners only (contract §B/§B2: tablet max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_longhands( $padding_tablet_obj, 'padding' );
$padding_mob_val = sgs_box_object_longhands( $padding_mobile_obj, 'padding' );
$margin_tab_val  = sgs_box_object_longhands( $margin_tablet_obj, 'margin' );
$margin_mob_val  = sgs_box_object_longhands( $margin_mobile_obj, 'margin' );
$radius_tab_val  = sgs_corner_object_longhands( $border_radius_tablet_obj );
$radius_mob_val  = sgs_corner_object_longhands( $border_radius_mobile_obj );

$tablet_root_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_root_decls[] = "{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_root_decls[] = "{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_root_decls[] = "{$radius_tab_val}";
}
if ( $tablet_root_decls ) {
	$scoped_css[] = sgs_emit_tier_decls( $root_sel, array( 'tablet' => $tablet_root_decls ) );
}

$mobile_root_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_root_decls[] = "{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_root_decls[] = "{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_root_decls[] = "{$radius_mob_val}";
}
if ( $mobile_root_decls ) {
	$scoped_css[] = sgs_emit_tier_decls( $root_sel, array( 'mobile' => $mobile_root_decls ) );
}

// Wrap setting of the option pills (tile mode lays the options on a grid, where it has no effect).
$scoped_css[] = sgs_flex_wrap_css( $attributes, $root_sel, array( 'flexWrap' => '.sgs-option-picker__options' ) );

// --- Pill custom padding object — base + tiers, scoped on the pill selector
// (SGS custom family; falls back to the per-size default in style.css when
// unset — byte-identical default behaviour). ---
$sel_pill        = "{$root_sel} .sgs-option-picker__pill";
$pill_padding_val      = sgs_box_object_longhands( $pill_padding_obj, 'padding' );
$pill_padding_tab_val  = sgs_box_object_longhands( $pill_padding_tablet_obj, 'padding' );
$pill_padding_mob_val  = sgs_box_object_longhands( $pill_padding_mobile_obj, 'padding' );

if ( null !== $pill_padding_val ) {
	$scoped_css[] = "{$sel_pill}{{$pill_padding_val};}";
}
if ( null !== $pill_padding_tab_val ) {
	$scoped_css[] = SGS_Breakpoints::media( 'tablet' ) . '{' . "{$sel_pill}{{$pill_padding_tab_val};}}";
}
if ( null !== $pill_padding_mob_val ) {
	$scoped_css[] = SGS_Breakpoints::media( 'mobile' ) . '{' . "{$sel_pill}{{$pill_padding_mob_val};}}";
}

// --- Legend typography (font-size/tablet/mobile) via the shared responsive
// helper — colour/margin-bottom are single declarations, scoped below. ---
$sel_label = "{$root_sel} .sgs-option-picker__label";

$typography_css = sgs_typography_css_rule( $attributes, 'label', "{$root_sel} .sgs-option-picker__label", '', false, false, sgs_object_attr_keys( $block ) )
	. sgs_typography_css_rule( $attributes, 'pill', "{$root_sel} .sgs-option-picker__pill", '', false, false, sgs_object_attr_keys( $block ) );
if ( '' !== $typography_css ) {
	$scoped_css[] = $typography_css;
}

// Flat-or-gradient ("text" builder) — sgs_resolve_text_colour_or_gradient()
// picks the gradient sibling attribute when it's set and valid, otherwise the
// flat labelColour value untouched; sgs_text_colour_decl() emits a plain
// `color:` declaration for a flat value or the background-clip:text
// declarations for a gradient. sgs_text_colour_gradient_fallback_rule() is the
// MANDATORY @supports companion — a gradient with no background-clip:text
// support would otherwise render invisible text (omitted for a flat value,
// where it is a no-op). Same recipe as sgs/quote's attribution colour.
$label_colour_effective = sgs_resolve_text_colour_or_gradient( $label_colour, $label_colour_gradient );
$label_colour_decl      = sgs_text_colour_decl( $label_colour_effective );

$legend_decls = array();
if ( '' !== $label_colour_decl ) {
	$legend_decls[] = $label_colour_decl;
}
if ( '' !== $label_margin_bottom ) {
	$mb_safe = sgs_css_length_value( $label_margin_bottom );
	if ( '' !== $mb_safe ) {
		$legend_decls[] = 'margin-bottom:' . $mb_safe;
	}
}
if ( $legend_decls ) {
	$scoped_css[] = "{$sel_label}{" . implode( ';', $legend_decls ) . ';}';
}
$label_colour_gradient_fallback = sgs_text_colour_gradient_fallback_rule( $sel_label, $label_colour_effective );
if ( '' !== $label_colour_gradient_fallback ) {
	$scoped_css[] = $label_colour_gradient_fallback;
}

// labelColour hover state — same trio, :hover/:focus-visible variant of the
// same selector.
$label_colour_hover           = $attributes['labelColourHover'] ?? '';
$label_colour_hover_gradient  = $attributes['labelColourHoverGradient'] ?? '';
$label_colour_effective_hover = sgs_resolve_text_colour_or_gradient( $label_colour_hover, $label_colour_hover_gradient );
if ( '' !== $label_colour_effective_hover ) {
	$label_colour_hover_decl = sgs_text_colour_decl( $label_colour_effective_hover );
	if ( '' !== $label_colour_hover_decl ) {
		$scoped_css[] = sgs_hover_state_rules( $sel_label, $label_colour_hover_decl );
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $sel_label . ':hover', $label_colour_effective_hover );
}

// Pill resting TEXT flat-or-gradient ("text" builder) — same recipe as
// the legend colour above and the pillBorderColourGradient border builder
// (§7). $sel_pill (root_sel + .sgs-option-picker__pill, 3
// classes) OUT-SPECIFIES every per-variant resting rule in style.css
// (`.sgs-option-picker--{style} .sgs-option-picker__pill`, 2 classes), the
// exact specificity precedent the pillBorderColourGradient rule already
// relies on — no source-order dependency. The hover-state colour
// (--sgs-op-text-hover, chained to --sgs-op-text in §6) still wins on
// hover/focus-within because that static rule carries an extra pseudo-class
// (specificity 4 vs this rule's 3), so hover behaviour is unaffected.
// Empty pillTextColour + empty pillTextColourGradient -> $effective
// is '' -> decl is '' -> no scoped rule emitted (the --sgs-op-text var
// mechanism keeps governing).
$pill_text_colour_gradient  = $attributes['pillTextColourGradient'] ?? '';
$pill_text_colour_effective = sgs_resolve_text_colour_or_gradient( $pill_text_colour, $pill_text_colour_gradient );
$pill_text_colour_decl      = sgs_text_colour_decl( $pill_text_colour_effective );
if ( '' !== $pill_text_colour_decl ) {
	$scoped_css[] = "{$sel_pill}{{$pill_text_colour_decl};}";
}
$pill_text_colour_gradient_fallback = sgs_text_colour_gradient_fallback_rule( $sel_pill, $pill_text_colour_effective );
if ( '' !== $pill_text_colour_gradient_fallback ) {
	$scoped_css[] = $pill_text_colour_gradient_fallback;
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

$swatch_map       = array();
$sub_label_map    = array();
$term_details_map = array();

if ( '' !== $swatch_taxonomy ) {
	foreach ( $valid_items as $item ) {
		$attr_term = get_term_by( 'slug', $item['key'], $swatch_taxonomy );
		if ( ! $attr_term instanceof \WP_Term ) {
			continue;
		}

		// Per-option sub-label -- generic client-chosen term-meta key, resolved
		// off the SAME already-fetched term (no extra taxonomy query). Empty
		// key/meta/value = no second line (sub-label-support.php).
		if ( '' !== $sub_label_meta_key ) {
			$sub_label_text = sgs_option_picker_resolve_sub_label( $attr_term, $sub_label_meta_key );
			if ( '' !== $sub_label_text ) {
				$sub_label_map[ $item['key'] ] = $sub_label_text;
			}
		}

		// Guided-buybox peripherals (Spec 43 FR-43-25) -- the term's own badge
		// pill + one-line description, off the SAME already-fetched term.
		// Shown wherever this WC-bound picker renders: the standard buybox,
		// the guided buybox, and flow product-option steps that don't
		// override them. showTermDetails:false or a term with neither field
		// set = byte-identical to the current markup.
		if ( $show_term_details ) {
			$term_badge_raw       = (string) get_term_meta( $attr_term->term_id, '_sgs_term_badge', true );
			$term_description_raw = (string) get_term_meta( $attr_term->term_id, '_sgs_term_description', true );
			if ( '' !== $term_badge_raw || '' !== $term_description_raw ) {
				$term_details_map[ $item['key'] ] = array(
					'badge'       => $term_badge_raw,
					'description' => $term_description_raw,
				);
			}
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
		sgs_rich_text_kses( (string) $label, false )
	);
} else {
	$legend_html = sprintf(
		'<legend id="%s" class="sgs-sr-only">%s</legend>',
		esc_attr( $legend_id ),
		sgs_rich_text_kses( (string) $label, false )
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

foreach ( $valid_items as $item_index => $item ) {
	$is_checked  = $item['key'] === $resolved_default;
	$input_id    = $uid . '-' . $item['key'];
	$checked_str = $is_checked ? ' checked' : '';

	$swatch            = isset( $swatch_map[ $item['key'] ] ) ? $swatch_map[ $item['key'] ] : null;
	$swatch_image_html = '';
	$swatch_chip_html  = '';
	$pill_extra_class  = '';

	// (sgs/buybox pickerVariationSwatch): a caller-supplied per-item picture wins over the term-meta swatch lookup
	// below — a per-PRODUCT variation photo, which the term's shared meta cannot carry. Every other caller leaves
	// the item's `source` unset, so this branch is dormant everywhere else.
	$swatch_item = null;
	if ( sgs_media_item_has_source( $item ) ) {
		$swatch_item = $item;
	} elseif ( null !== $swatch && $swatch['image_id'] > 0 ) {
		// The term's own swatch image: decorative, the label beside it names the option.
		$swatch_item = array(
			'source'     => array(
				'desktop' => array(
					'kind' => 'image',
					'id'   => $swatch['image_id'],
				),
			),
			'decorative' => true,
		);
	}
	$swatch_image_html = null !== $swatch_item ? $sgs_op_render_swatch( $swatch_item, $item_index ) : '';
	if ( '' !== $swatch_image_html ) {
		$pill_extra_class = ' sgs-option-picker__pill--has-image';
	} elseif ( null !== $swatch ) {
		$color = $swatch['color'];

		if ( $swatch['image_id'] > 0 ) {
			// The term's image no longer resolves to a file: no swatch.
		} elseif ( '' !== $color ) {
			// Colour chip — the swatch background is a decorative DATA VALUE (the
			// colour term's own swatch, not a styling property of the block),
			// carried as CSS custom-property VALUES (`--sgs-op-swatch-bg` /
			// `--sgs-op-swatch-text`) painted by style.css. Per Spec 32 FR-32-4,
			// these are NEVER inline — each pill's
			// $input_id is a unique per-instance HTML id (already used for the
			// <label for>), so it doubles as a safe, unique scoped-CSS anchor for
			// this one pill's swatch vars (no cross-pill collision, no clash
			// with $root_sel's class-level scoping — a per-item ID selector is a
			// distinct, legitimate use, unlike Spec 32 section 6.1's block-ROOT rule).
			$contrast_colour = sgs_wcag_text_colour_for_bg( $color );
			$sel_this_pill   = '#' . $input_id . ' + .sgs-option-picker__pill';

			$scoped_css[] = $sel_this_pill . ' .sgs-option-picker__swatch--colour{--sgs-op-swatch-bg:' . esc_attr( $color ) . ';}';
			$scoped_css[] = $sel_this_pill . '{--sgs-op-swatch-text:' . esc_attr( $contrast_colour ) . ';}';

			$swatch_chip_html = '<span class="sgs-option-picker__swatch sgs-option-picker__swatch--colour" aria-hidden="true"></span>';
			$pill_extra_class = ' sgs-option-picker__pill--has-colour';
		}
	}

	// Label + optional sub-label are wrapped in their own text-stack span so
	// CSS can lay the two lines out independently of the swatch chip/image
	// (row layout for outlined/filled/ghost pills, column layout for tiles) --
	// the swatch stays outside this span so its own row/column position is
	// unaffected. Same accessible name either way: both spans stay inside the
	// <label>, so a sub-label is simply extra text an AT reads as part of the
	// existing option label -- no separate aria-* wiring needed.
	$item_sub_label   = isset( $item['subLabel'] ) ? $item['subLabel'] : ( isset( $sub_label_map[ $item['key'] ] ) ? $sub_label_map[ $item['key'] ] : '' );
	$item_term_badge  = isset( $term_details_map[ $item['key'] ]['badge'] ) ? $term_details_map[ $item['key'] ]['badge'] : '';
	$item_term_desc   = isset( $term_details_map[ $item['key'] ]['description'] ) ? $term_details_map[ $item['key'] ]['description'] : '';
	$pill_text_html   = '<span class="sgs-option-picker__pill-text"><span class="sgs-option-picker__pill-label">' . esc_html( $item['label'] ) . '</span>';
	if ( '' !== $item_term_badge ) {
		$pill_text_html .= '<span class="sgs-option-picker__term-badge">' . esc_html( $item_term_badge ) . '</span>';
	}
	if ( '' !== $item_sub_label ) {
		$pill_text_html .= '<span class="sgs-option-picker__sub-label">' . esc_html( $item_sub_label ) . '</span>';
	}
	if ( '' !== $item_term_desc ) {
		$pill_text_html .= '<span class="sgs-option-picker__term-description">' . esc_html( $item_term_desc ) . '</span>';
	}
	$pill_text_html .= '</span>';

	$pill_inner = $swatch_chip_html . $swatch_image_html . $pill_text_html;

	$pills_html .= sprintf(
		'<label class="sgs-option-picker__option" for="%s">' .
		'<input type="radio" class="sgs-focus-source" id="%s" name="%s" value="%s"%s>' .
		'<span class="sgs-option-picker__pill sgs-focus-proxy%s">%s</span>' .
		'</label>',
		esc_attr( $input_id ),
		esc_attr( $input_id ),
		esc_attr( $radio_name ),
		esc_attr( $item['key'] ),
		$checked_str,        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- 'checked' or empty.
		esc_attr( $pill_extra_class ),
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

$allowed_sizes  = array( 'small', 'medium', 'large' );
$allowed_preset = array( '', 'soft', 'solid' );

$safe_style  = $pill_style_safe; // Validated in §2 (includes 'tile').
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
if ( ! $show_selected_tick || ( $swatch_tick_inside && 'tile' !== $pill_style_safe ) ) {
	$root_classes[] = 'sgs-option-picker--no-tick';
}
if ( $swatch_tick_inside && 'tile' !== $pill_style_safe ) {
	$root_classes[] = 'sgs-option-picker--swatch-tick';
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
// No inline `style` output (Spec 32 FR-32-4) — the
// --sgs-op-* custom-property VALUES are emitted into the scoped `{$root_sel}`
// rule at §7 instead (functional-colour values are normalised to hex by
// sgs_colour_value() so they survive WordPress's safecss_filter_attr(),
// which strips rgb()/rgba()/hsl() — the same normalisation protects the
// scoped `<style>` channel, which is unfiltered but kept consistent).
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}

// The swatch slot's rules (Width, Shape, Fit, Ratio) join the block's scoped rules.
if ( '' !== $sgs_op_swatch_css ) {
	$scoped_css[] = $sgs_op_swatch_css;
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
	// Every value reaching $scoped_css is pre-sanitised (sgs_css_length_value() /
	// sgs_css_keyword_sanitise() / sgs_colour_value / wp_style_engine_get_styles /
	// sgs_typography_css_rule), so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<fieldset <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $legend_html . $options_div_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></fieldset>
