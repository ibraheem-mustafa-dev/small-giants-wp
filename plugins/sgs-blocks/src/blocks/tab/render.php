<?php
/**
 * SGS Tab — server-side render.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The tab panel wrapper carries full
 * ARIA tabpanel semantics required by the parent sgs/tabs view.js:
 *   - role="tabpanel"          (ARIA role — tabs view.js shows/hides panels)
 *   - id="{panel_id}"          (referenced by the matching <button aria-controls>)
 *   - aria-labelledby="{tab}"  (references the matching tab button)
 *   - tabindex="0"             (keyboard-reachable panel per ARIA tabs pattern)
 *
 * All four are carried via extra_attrs so the parent tabs block's view.js
 * can find and toggle panel visibility without coupling to render internals.
 * The .sgs-tab__content inner div stays inside $inner_html (= $content).
 *
 * R-31-14: explicit discriminators, never empty($content).
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * Width/padding stay the wrapper's own scoped mechanism ('content' kind).
 * This block owns emitting its WP color + border supports into ITS OWN
 * scoped `.{uid}` <style> (composite caveat — must NOT ride through the
 * wrapper's `extra_styles`, which inlines). Mirrors sgs/hero + sgs/tabs.
 * Because the panel's own `id` is reserved for the ARIA panel_id (consumed by
 * the parent's view.js), the scoped uid here is always a CLASS, never an id.
 *
 * @var array    $attributes Block attributes (label, anchor, etc.).
 * @var string   $content    Rendered inner blocks (InnerBlocks markup).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style). Letters + hyphen only. Mirrors sgs/hero.
// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so a border-width/radius value can never break out of its
// declaration. Mirrors sgs/hero.
// Generate stable IDs for ARIA relationships.
// The parent tabs block provides tab IDs; we derive the panel ID from the block's anchor.
$block_id = isset( $attributes['anchor'] ) ? sanitize_html_class( $attributes['anchor'] ) : '';
$panel_id = ! empty( $block_id ) ? $block_id : '';

// ─── Scoped uid + root selector (NO-INLINE contract §A) ──────────────────────
// A CLASS uid (never an id) — the element's `id` attribute is reserved for the
// ARIA panel_id above, consumed by the parent tabs block's view.js.
$tab_uid  = 'sgs-tab-uid-' . substr( md5( wp_json_encode( $attributes ) . ( $attributes['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $tab_uid . '.wp-block-sgs-tab';

// The tab content is wrapped in a .sgs-tab__content div (unchanged from original).
$inner_html = sprintf(
	'<div class="sgs-tab__content">%s</div>',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
);

// NO ARIA tab attrs here — the parent sgs/tabs render.php wraps every tab in
// its own .sgs-tabs__panel[role="tabpanel"] wrapper and its view.js toggles
// THOSE (verified: view.js queries .sgs-tabs__panel only). The child emitting
// role="tabpanel"/tabindex too produced NESTED duplicate tabpanels (8 for 4
// tabs — caught live on the canary PDP 2026-06-11). Keep the optional anchor
// id for deep links; drop the duplicated semantics.
$extra_attrs = array();

if ( '' !== $panel_id ) {
	$extra_attrs['id'] = esc_attr( $panel_id );
}

$extra_classes = array( 'sgs-tab', $tab_uid );

// Skip-serialised `color` support stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero + sgs/tabs) so preset palette colours resolve.
$tab_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$tab_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $tab_preset_text_slug ) {
	$extra_classes[] = 'has-text-color';
	$extra_classes[] = 'has-' . $tab_preset_text_slug . '-color';
}
if ( '' !== $tab_preset_bg_slug ) {
	$extra_classes[] = 'has-background';
	$extra_classes[] = 'has-' . $tab_preset_bg_slug . '-background-color';
}

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from $attributes['style'] and emit into THIS
// TAB'S OWN scoped <style> via the stable core API. Mirrors sgs/hero + sgs/tabs.
$tab_responsive_css = '';

$tab_style_engine_args = array();

$tab_color_args = array();
// ⚠ EVERY value goes through sgs_colour_value() before the style engine
// (D684). DesignTokenPicker stores a token SLUG ('primary') when a palette
// swatch is picked with linked:true. wp_style_engine_get_styles() neither
// resolves nor rejects a bare slug — it emits the literal `color:primary;`,
// invalid CSS the browser drops, so the client's chosen text colour silently
// does nothing (proven live on the canary). sgs_colour_value() maps a slug to
// var(--wp--preset--color--…), passes a raw hex through unchanged, and
// rejects a declaration breakout. Mirrors sgs/site-header-row.
if ( isset( $attributes['textColour'] ) && '' !== $attributes['textColour'] ) {
	$tab_text_value = sgs_colour_value( (string) $attributes['textColour'] );
	if ( '' !== $tab_text_value ) {
		$tab_color_args['text'] = $tab_text_value;
	}
}
if ( ! empty( $tab_color_args ) ) {
	$tab_style_engine_args['color'] = $tab_color_args;
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
$tab_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $tab_fill_css ) {
	$tab_responsive_css .= $tab_fill_css;
}

$tab_border_args = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width. Gated together via the shared helper (helpers-box.php)
// so this rule is applied identically everywhere, not per block.
if ( ! empty( $tab_border_args ) ) {
	$tab_style_engine_args['border'] = $tab_border_args;
}

if ( ! empty( $tab_style_engine_args ) ) {
	$tab_scoped_styles = wp_style_engine_get_styles(
		$tab_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $tab_scoped_styles['css'] ) ) {
		$tab_responsive_css .= $tab_scoped_styles['css'];
	}
}

// Output the block's own scoped color/border CSS (if any). wp_strip_all_tags
// (NOT esc_html) blocks a </style> breakout while leaving CSS combinators
// like `>` intact (contract §D — matches SGS_Container_Wrapper + sgs/hero).

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
		$tab_responsive_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$tab_responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$tab_responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$tab_responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$tab_responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$tab_responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// Every value reaching $tab_responsive_css is pre-sanitised (sgs_css_length_value() /
// sgs_css_keyword_sanitise() / wp_style_engine_get_styles), so nothing un-sanitised
// survives to here.
if ( $tab_responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below.
	printf( '<style id="%s">%s</style>', esc_attr( $tab_uid ), wp_strip_all_tags( $tab_responsive_css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; arrays are caller-built with esc_attr().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => $extra_classes,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
