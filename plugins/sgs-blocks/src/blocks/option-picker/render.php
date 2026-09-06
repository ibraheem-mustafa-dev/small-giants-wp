<?php
/**
 * Server-side render for the SGS Option Picker block.
 *
 * BLOCK-PRIVATE, NO-INLINE, NO-WRAPPER (LOCKED per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-09 — D294 pattern selector): sgs/option-picker
 * is CONTENT-kind (box + width only — `SGS_Container_Wrapper::render()` for
 * 'content' kind only ever emitted maxWidth/width/padding, never
 * grid/background/overlay/shape-divider machinery) and it already renders a
 * single semantic root (`<fieldset>`), so the shared wrapper was dead weight —
 * same proven pattern as sgs/quote (D294). The `<fieldset>` IS the block root,
 * built via get_block_wrapper_attributes().
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
 * `.sgs-option-picker` class rules — never inline property declarations. Per
 * Spec 32 FR-32-4 as amended 2026-07-18 (D345), inline `--var` declarations
 * are FORBIDDEN too — every `--sgs-op-*` value (root resting/hover/selected/
 * radius vars + the per-pill swatch bg/text vars) is emitted into the
 * block's OWN scoped `.{uid}`
 * `<style>` tag, never as an inline `style="--var:…"` attribute. This is
 * also what makes the pill states CLONEABLE: the universal styling-lift
 * (Spec 31 §3.B B2) matches each attr's `derived_selector` against the draft's
 * DOM by BEM class — resting on `.sgs-option-picker__pill`, selected on the
 * draft's static `--active` modifier class (the mockup shows one pill
 * selected by baking the modifier class directly into the markup).
 *
 * R-31-14: explicit discriminators, never empty($content).
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

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Box-object interface contract §1 + security §D sanitisers.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration. Mirrors sgs/button + sgs/quote + sgs/container.
// CSS-keyword sanitiser — free-text attrs concatenated into raw CSS
// declarations (border-style). Strips everything except letters + hyphen.
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
$pill_style           = $attributes['pillStyle'] ?? 'outlined';
$pill_size            = $attributes['pillSize'] ?? 'medium';
$colour_preset        = $attributes['colourPreset'] ?? '';
$show_selected_tick   = array_key_exists( 'showSelectedTick', $attributes ) ? (bool) $attributes['showSelectedTick'] : true;
$pill_bg_colour       = $attributes['pillBgColour'] ?? '';
$pill_bg_colour_gradient = $attributes['pillBgColourGradient'] ?? '';
$pill_text_colour     = $attributes['pillTextColour'] ?? '';

// Pill HOVER colours — real attributes since 2026-09-03 (FR-35-5 exception
// reversed by the block owner). Empty = fall through to the existing
// static preset-variant hover look via the CSS var() fallback chain in
// style.css (no behaviour change for an instance with nothing configured).
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
// SGS_Container_Wrapper 'content' capability set) (D540). This block renders
// no inner band — the value becomes a plain `width:` in $root_decls beside
// `max-width:`. D540 reserves `contentWidth` for a real second layer; a fixed
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

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
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

// Media-element atom layer (rule 37-media-no-handroll) — the image-swatch
// marker classes, computed once (every swatch <img> in this instance shares
// the same 'swatch' scope, since there is one client-facing fit control per
// picker instance, not per option). `.sgs-media-el` is the shared marker
// assets/css/media-atoms/object-fit.css's rule targets; `$sgs_op_swatch_scope`
// is the per-instance scope the atom's custom-property VALUE (§7 below) is
// set on. Mirrors sgs/gallery's identical pattern.
$sgs_op_swatch_scope   = '';
$sgs_op_swatch_classes = array();
if ( class_exists( 'SGS_Media_Element' ) ) {
	$sgs_op_swatch_scope   = SGS_Media_Element::scope_class( $uid, 'swatch' );
	$sgs_op_swatch_classes = SGS_Media_Element::element_classes( $sgs_op_swatch_scope );
}
$sgs_op_swatch_img_class = implode( ' ', array_filter( array_merge( array( 'sgs-option-picker__swatch', 'sgs-option-picker__swatch--image' ), $sgs_op_swatch_classes ) ) );

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

$radius_tiers            = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$base_border_radius       = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

$style_colour_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_colour_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_colour_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// Pill custom padding — SGS custom TIER-OF-BOXES object attr
// {desktop,tablet,mobile} (Spec 35 box-tier migration). The pill is a
// content CHILD, not the block root, so there is no WP-native support to
// route through. sgs_responsive_normalise_object() is the canonical reader
// (helpers-responsive.php:273), box=true so an unset/legacy value never
// mis-resolves as a flat side (D328 defence).
$pill_padding_tiers      = sgs_responsive_normalise_object( $attributes['pillPadding'] ?? null, true );
$pill_padding_obj        = is_array( $pill_padding_tiers['desktop'] ) ? $pill_padding_tiers['desktop'] : array();
$pill_padding_tablet_obj = is_array( $pill_padding_tiers['tablet'] ) ? $pill_padding_tiers['tablet'] : array();
$pill_padding_mobile_obj = is_array( $pill_padding_tiers['mobile'] ) ? $pill_padding_tiers['mobile'] : array();

// ---------------------------------------------------------------------------
// 6. Scoped CSS custom-PROPERTY VALUES (never property declarations, never
// inline) for pill resting/hover/selected colour + radius, root border
// colour. Per Spec 32 FR-32-4 as amended 2026-07-18 (D345), these are
// emitted into the scoped `{$root_sel}{--var:value;…}` rule below (§7) —
// NOT as an inline `style="--var:value"` attribute — consumed by
// style.css's class rules via var(--sgs-op-*, …). The --sgs-op-*-hover
// vars (2026-09-03) feed the SAME :hover rules that used to reuse the
// resting vars as a fallback — style.css chains
// var(--sgs-op-*-hover, var(--sgs-op-*, <old hardcoded default>)) so an
// instance with nothing configured renders byte-identically to before.
// ---------------------------------------------------------------------------

$var_decls = array();

// pillBgColour/pillBgColourHover gradient siblings (2026-09-05) — same
// custom-property-gradient shape already proven on brand-strip/post-grid/
// social-icons/form/gallery/before-after (helpers-tokens.php:953); style.css
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
	// R2: the selected border is DECOUPLED from the fill — a distinct var with
	// its own fallback to --sgs-op-sel-bg (byte-identical when unset).
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
if ( '' !== $pill_sel_radius_raw ) {
	$psr_safe = sgs_css_length_value( $pill_sel_radius_raw );
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

// --- Swatch image object-fit (media-element atom layer, rule
// 37-media-no-handroll) — no `swatchObjectFit` value set -> style() returns
// '' -> nothing appended -> the shared stylesheet's own `.sgs-media-el`
// `cover` fallback governs, matching the removed style.css hardcode exactly. ---
if ( '' !== $sgs_op_swatch_scope && class_exists( 'SGS_Media_Element' ) ) {
	$sgs_op_swatch_css = SGS_Media_Element::style( $attributes, 'swatch', 'sgs/option-picker', $uid, array( 'object-fit' ) );
	if ( '' !== $sgs_op_swatch_css ) {
		$scoped_css[] = $sgs_op_swatch_css;
	}
}

// --- Root custom-property VALUES (§6) — the ONLY per-instance override
// channel (Spec 32 FR-32-4), scoped here rather than emitted inline. ---
if ( $var_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $var_decls ) . ';}';
}

// --- Root box declarations (border-style/width, width, max-width) ---
$root_decls = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
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

// --- Border gradients (D636 border builder) — masked ::before rings.
// Root: only relevant when a real border is on (mirrors the flat-colour gate
// above). Pill: all 3 style variants (outlined/filled/ghost) share an
// identical `border: 2px solid …` shorthand on .sgs-option-picker__pill
// (style.css:188/238/269), so ONE universal rule covers every variant — no
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

// --- Responsive padding/margin/border-radius tiers — box objects, hand-built
// shorthand (contract §B/§B2: tablet max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );
$radius_tab_val  = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = sgs_corner_object_shorthand( $border_radius_mobile_obj );

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
$pill_padding_val      = sgs_box_object_shorthand( $pill_padding_obj );
$pill_padding_tab_val  = sgs_box_object_shorthand( $pill_padding_tablet_obj );
$pill_padding_mob_val  = sgs_box_object_shorthand( $pill_padding_mobile_obj );

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

// Flat-or-gradient (D636 "text" builder) — sgs_resolve_text_colour_or_gradient()
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

// Pill resting TEXT flat-or-gradient (D636 "text" builder) — same recipe as
// the legend colour above and the pillBorderColourGradient border builder
// (§7, ~line 421). $sel_pill (root_sel + .sgs-option-picker__pill, 3
// classes) OUT-SPECIFIES every per-variant resting rule in style.css
// (`.sgs-option-picker--{style} .sgs-option-picker__pill`, 2 classes), the
// exact specificity precedent the pillBorderColourGradient rule already
// relies on — no source-order dependency. The hover-state colour
// (--sgs-op-text-hover, chained to --sgs-op-text in §6) still wins on
// hover/focus-within because that static rule carries an extra pseudo-class
// (specificity 4 vs this rule's 3), so hover behaviour is unaffected by this
// change. Empty pillTextColour + empty pillTextColourGradient -> $effective
// is '' -> decl is '' -> no scoped rule emitted (additive-safety guarantee,
// existing --sgs-op-text var mechanism keeps governing unchanged).
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
				// Marker classes computed once above ($sgs_op_swatch_img_class) —
				// media-element atom layer, object-fit only (rule
				// 37-media-no-handroll; see block.json's `_comment_mediaElements`).
				$swatch_image_html = sprintf(
					'<img src="%s" alt="" class="%s" width="%d" height="%d" loading="lazy" decoding="async" aria-hidden="true" />',
					esc_url( $img_url ),
					esc_attr( $sgs_op_swatch_img_class ),
					$img_w,
					$img_h
				);
				$pill_extra_class  = ' sgs-option-picker__pill--has-image';
			}
		} elseif ( '' !== $color ) {
			// Colour chip — the swatch background is a decorative DATA VALUE (the
			// colour term's own swatch, not a styling property of the block),
			// carried as CSS custom-property VALUES (`--sgs-op-swatch-bg` /
			// `--sgs-op-swatch-text`) painted by style.css. Per Spec 32 FR-32-4
			// as amended 2026-07-18 (D345), these are NEVER inline — each pill's
			// $input_id is a unique per-instance HTML id (already used for the
			// <label for>), so it doubles as a safe, unique scoped-CSS anchor for
			// this one pill's swatch vars (no cross-pill collision, no clash
			// with $root_sel's class-level scoping — a per-item ID selector is a
			// distinct, legitimate use, unlike FR-31-22.3's block-ROOT rule).
			$contrast_colour = sgs_wcag_text_colour_for_bg( $color );
			$sel_this_pill   = '#' . $input_id . ' + .sgs-option-picker__pill';

			$scoped_css[] = $sel_this_pill . ' .sgs-option-picker__swatch--colour{--sgs-op-swatch-bg:' . esc_attr( $color ) . ';}';
			$scoped_css[] = $sel_this_pill . '{--sgs-op-swatch-text:' . esc_attr( $contrast_colour ) . ';}';

			$swatch_chip_html = '<span class="sgs-option-picker__swatch sgs-option-picker__swatch--colour" aria-hidden="true"></span>';
			$pill_extra_class = ' sgs-option-picker__pill--has-colour';
		}
	}

	$pill_inner = $swatch_chip_html . $swatch_image_html . esc_html( $item['label'] );

	$pills_html .= sprintf(
		'<label class="sgs-option-picker__option" for="%s">' .
		'<input type="radio" id="%s" name="%s" value="%s"%s>' .
		'<span class="sgs-option-picker__pill%s">%s</span>' .
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
// No inline `style` output (Spec 32 FR-32-4 as amended D345) — the
// --sgs-op-* custom-property VALUES are emitted into the scoped `{$root_sel}`
// rule at §7 instead (functional-colour values are normalised to hex by
// sgs_colour_value() so they survive WordPress's safecss_filter_attr(),
// which strips rgb()/rgba()/hsl() — the same normalisation protects the
// scoped `<style>` channel, which is unfiltered but kept consistent).
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
	// Every value reaching $scoped_css is pre-sanitised (sgs_css_length_value() /
	// sgs_css_keyword_sanitise() / sgs_colour_value / wp_style_engine_get_styles /
	// sgs_typography_css_rule), so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<fieldset <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $legend_html . $options_div_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></fieldset>
