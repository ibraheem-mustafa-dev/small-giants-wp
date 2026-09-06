<?php
/**
 * Feature Grid — server-side render.
 *
 * Generates a unique ID per instance so each grid's layout CSS
 * is scoped and does not bleed into neighbouring grids on the page.
 *
 * Variables available from WordPress block renderer:
 *   $attributes  array   Block attributes (already validated against block.json schema).
 *   $content     string  InnerBlocks HTML — the rendered sgs/info-box children.
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/unit sanitiser — for free-text style-engine values concatenated
// into raw CSS declarations inside this block's scoped <style> tag. Mirrors
// sgs/hero's proven sanitiser (contract §D).
// CSS-keyword sanitiser — for free-text attrs (border-style) — letters + hyphen only.
$layout_mode = isset( $attributes['layoutMode'] ) ? esc_attr( $attributes['layoutMode'] ) : 'fixed-columns';
// `columns` is a TIER OBJECT (Spec 35 pass 4) — the old columnsDesktop/columnsTablet/
// columnsMobile flat trio is retired; resolve each tier from the object instead,
// preserving the exact same fallback defaults (4/2/1) the flat attrs used.
$columns_desktop = absint( $attributes['columns']['desktop'] ?? 4 );
$columns_tablet  = absint( $attributes['columns']['tablet'] ?? 2 );
$columns_mobile  = absint( $attributes['columns']['mobile'] ?? 1 );
$min_item_width  = isset( $attributes['minItemWidth'] ) ? absint( $attributes['minItemWidth'] ) : 240;
$min_item_unit   = isset( $attributes['minItemWidthUnit'] ) && in_array( $attributes['minItemWidthUnit'], array( 'px', 'em', 'rem' ), true )
	? $attributes['minItemWidthUnit']
	: 'px';

// Gap is now a full CSS value string (e.g. "24px") or a bare WP spacing slug
// (e.g. "40"). sgs_container_gap_value() handles both formats.
// Back-compat: pre-consolidation posts may store a bare number (e.g. 24) for gap.
// Normalise it to a px value. The retired gapUnit attr is no longer declared, so WP
// strips it before render (the old unit was always "px") — reading it would be a
// dead legacy-attr fallback (R-31-14).
// `gap` is a TIER OBJECT (Spec 35 pass 1, 2026-08-10): one attr carrying every tier.
// ⛔ Do NOT cast $attributes['gap'] to string — it is an ARRAY now, and casting one
// emits the PHP notice "Array to string conversion" on EVERY render plus literal
// garbage CSS (`gap:Array`). That exact defect has already shipped here once as
// `grid-auto-rows:Array`. sgs_responsive_normalise_object() always returns
// desktop/tablet/mobile keys, so the emission below is otherwise unchanged, and each
// tier keeps the same fallback it had as a flat sibling.
$gap_obj = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$gap_raw = (string) ( $gap_obj['desktop'] ?? '' );
if ( '' === $gap_raw ) {
	$gap_raw = '24px';
}
if ( '' !== $gap_raw && preg_match( '/^\d+$/', $gap_raw ) ) {
	// Bare digit-only number — append "px" (e.g. "24" → "24px").
	$gap_raw = $gap_raw . 'px';
}
$gap_css = sgs_container_gap_value( $gap_raw );
if ( '' === $gap_css ) {
	$gap_css = '24px'; // Safe fallback if attribute is missing or invalid.
}

$gap_tablet_raw = (string) ( $gap_obj['tablet'] ?? '' );
$gap_mobile_raw = (string) ( $gap_obj['mobile'] ?? '' );
if ( '' === $gap_mobile_raw ) {
	$gap_mobile_raw = '16px';
}

// Back-compat: tablet/mobile gap may also be a bare digit string from pre-consolidation posts.
if ( '' !== $gap_tablet_raw && preg_match( '/^\d+$/', $gap_tablet_raw ) ) {
	$gap_tablet_raw = $gap_tablet_raw . 'px';
}
if ( preg_match( '/^\d+$/', $gap_mobile_raw ) ) {
	$gap_mobile_raw = $gap_mobile_raw . 'px';
}

// If gapTablet is empty, default to desktop gap for tablet.
$gap_tablet_css = '' !== $gap_tablet_raw ? sgs_container_gap_value( $gap_tablet_raw ) : $gap_css;
if ( '' === $gap_tablet_css ) {
	$gap_tablet_css = $gap_css;
}
$gap_mobile_css = sgs_container_gap_value( $gap_mobile_raw );
if ( '' === $gap_mobile_css ) {
	$gap_mobile_css = '16px';
}

$align_items   = isset( $attributes['alignItems'] ) && in_array( $attributes['alignItems'], array( 'stretch', 'start', 'center', 'end' ), true )
	? $attributes['alignItems']
	: 'stretch';
$justify_items = isset( $attributes['justifyItems'] ) && in_array( $attributes['justifyItems'], array( 'stretch', 'start', 'center', 'end' ), true )
	? $attributes['justifyItems']
	: 'stretch';

$uid = wp_unique_id( 'sgs-fg-' );

/*
 * The shared SGS_Container_Wrapper IS the grid engine: when the container is a
 * grid it emits `display:grid` + the base `grid-template-columns` + the correct
 * 768/1024 device-tier responsive rules (class-sgs-container-wrapper.php). A
 * "feature grid" is a real grid, so grid rendering is delegated ENTIRELY to that
 * wrapper whenever an explicit grid template is present (e.g. a faithful clone
 * transfer of `grid-template-columns`) OR the operator has not chosen auto-flex.
 *
 * `auto-flex` is the opt-in INTRINSIC mode (auto-fill / minmax) — a capability the
 * wrapper does not provide — and it applies ONLY when there is no explicit template.
 * It owns its own <style> whose `#uid.sgs-feature-grid` specificity intentionally
 * beats the wrapper's `.uid` rules. In every other case render.php must NOT emit a
 * competing grid rule, or it would override the wrapper's faithful template (the
 * bug this structure fixes — the forced auto-flex 3-across on cloned grids).
 */
// `gridTemplateColumns` is a TIER OBJECT as of Spec 35 pass 3a (2026-08-11).
// A `(string)` cast on it yields the literal "Array" (plus a PHP notice on every
// render), which is non-empty — so `$has_explicit_grid` went TRUE for every
// block whether or not a template was set, and auto-flex mode was suppressed.
// Measured before this fix: the fixture's 4-column grid rendered as 2 columns.
// Only the DESKTOP tier decides whether an explicit template exists; the wrapper
// emits the per-tier rules itself, so this flag must not consider tablet/mobile.
$grid_template_tiers = sgs_responsive_normalise_object( $attributes['gridTemplateColumns'] ?? null );
$grid_template       = trim( (string) ( $grid_template_tiers['desktop'] ?? '' ) );
$has_explicit_grid   = '' !== $grid_template;
$use_auto_flex       = ( 'auto-flex' === $layout_mode ) && ! $has_explicit_grid;

$mode_class = 'sgs-feature-grid--' . $layout_mode;
$css        = '';

if ( $use_auto_flex ) {
	/*
	 * Auto-flex: CSS Grid with auto-fill.
	 * Each item has a min-width; the browser wraps to a new row
	 * whenever a full row of items at that width no longer fits.
	 * No media queries needed — fully intrinsic. render.php owns this <style>.
	 */
	$css = ".$uid.sgs-feature-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax({$min_item_width}{$min_item_unit}, 1fr));
	gap: $gap_css;
	align-items: $align_items;
	justify-items: $justify_items;
}";
} elseif ( $has_explicit_grid ) {
	/*
	 * Real grid with an explicit template — delegate to the shared wrapper's grid
	 * engine. Force layout=grid so that engine runs, emit NO competing <style>,
	 * and use the --grid modifier (NOT --auto-flex, whose style.css rule would
	 * re-force the intrinsic minmax template over the faithful columns).
	 */
	$attributes['layout'] = 'grid';
	$mode_class           = 'sgs-feature-grid--grid';
} else {
	/*
	 * Fixed columns by count (no explicit template): explicit grid with breakpoint
	 * overrides on the SGS device tiers (contract §B2: 767/1023). Desktop (≥1024px):
	 * $columns_desktop. Tablet (768–1023px): $columns_tablet. Mobile (≤767px):
	 * $columns_mobile.
	 */
	$css = ".$uid.sgs-feature-grid {
	display: grid;
	grid-template-columns: repeat($columns_desktop, 1fr);
	gap: $gap_css;
	align-items: $align_items;
	justify-items: $justify_items;
}
@media (max-width: 1023px) {
	.$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_tablet, 1fr);
		gap: $gap_tablet_css;
	}
}
@media (max-width: 767px) {
	.$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_mobile, 1fr);
		gap: $gap_mobile_css;
	}
}";
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from $attributes['style'] here and emit them into
// this block's OWN scoped <style>, reusing the same ID hook the grid engine
// already builds (.$uid.sgs-feature-grid) rather than minting a second uid.
// Spacing (padding/margin) is a SEPARATE mechanism the shared wrapper
// already handles scoped internally — not duplicated here.
$root_sel = '.' . $uid . '.sgs-feature-grid';
// D303: $uid is ALSO a class (the wrapper applies it as an id via extra_attrs) so the
// class-scoped `.{$uid}.sgs-feature-grid` colour/border rules match this element.
$classes = array( 'sgs-feature-grid', $mode_class, $uid );

// D636 — sibling gradient attribute wins when set+valid.
$fg_text_colour           = isset( $attributes['textColour'] ) ? (string) $attributes['textColour'] : '';
$fg_text_colour_gradient  = isset( $attributes['textColourGradient'] ) ? (string) $attributes['textColourGradient'] : '';
$fg_text_colour_effective = sgs_resolve_text_colour_or_gradient( $fg_text_colour, $fg_text_colour_gradient );
if ( '' !== $fg_text_colour_effective ) {
	$fg_text_colour_decl = sgs_text_colour_decl( $fg_text_colour_effective );
	if ( '' !== $fg_text_colour_decl ) {
		$css .= "{$root_sel}{{$fg_text_colour_decl};}";
	}
	// MANDATORY companion, not optional: a gradient reaches the browser as
	// background-clip:text, and without this @supports fallback a browser
	// lacking that support gets a bare `color:` holding a gradient string,
	// which it drops silently. No-op for a flat colour.
	$css .= sgs_text_colour_gradient_fallback_rule( $root_sel, $fg_text_colour_effective );
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. Switching the flag off alone would have
// REMOVED the only gradient control this block had, because the sole gradient
// read was $attributes['style']['color']['gradient'] (core's own storage). The
// flag flip is therefore PAIRED with a block-private backgroundColourGradient
// exposed through fillRow(), so capability is moved rather than lost.
$fg_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $fg_fill_css ) {
	$css .= $fg_fill_css;
}

// (native border_args removed by the Shape-B migration -- width/style/colour
// are block-private attrs now, emitted below)

// Skip-serialised `color` support also stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero, sgs/quote) so preset palette colours still resolve.
$fg_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$fg_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $fg_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $fg_preset_text_slug . '-color';
}
if ( '' !== $fg_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $fg_preset_bg_slug . '-background-color';
}


// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below; $css built from pre-sanitised values only (grid engine literals + wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $classes,
		'extra_attrs'   => array( 'id' => $uid ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
