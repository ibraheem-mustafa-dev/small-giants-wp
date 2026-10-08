<?php
/**
 * SGS Tab — server-side render.
 *
 * WS-4 composite wrapper: CONTENT kind — width/spacing layers only via
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

// The tab content is wrapped in a .sgs-tab__inner div — renamed from
// .sgs-tab__content (2026-09-08) to match the composite wrapper convention
// every other CONTENT-kind wrapper block uses for its content-width band
// (sgs-container__inner, sgs-form__inner, sgs-modal__inner, sgs-post-grid__inner).
// This is the same architectural layer as those — a single band wrapping
// 100% of the block's content, routed through SGS_Container_Wrapper's
// 'content' kind — so it should carry the same element token, not a
// one-off name. (Distinct from sgs/hero's __content, which is a genuine
// grid COLUMN in a 2-column layout, not a content-width band — that one
// correctly keeps its own name.)
$inner_html = sprintf(
	'<div class="sgs-tab__inner">%s</div>',
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


// Text colour (flat or gradient), both states — gradient sibling attribute
// wins when set+valid (D636 sibling-attribute shape). sgs_text_states_css()
// resolves both states + emits both mandatory gradient fallback rules in one
// call (mirrors sgs/counter's labelColour).
//
// Precondition (bg-layer subset, colour-conformance, 2026-09-07): textColour
// and backgroundColour paint the SAME $root_sel (block.json wrapper attrMap:
// css:color=textColour, css:background-color=backgroundColour) — confirmed
// via block.json, not guessed. A flat textColourHover is harmless (a plain
// `color:` declaration), but a GRADIENT hover paints `background-image` on
// `$root_sel:hover` via background-clip:text, the exact property
// backgroundColourHover's own fill rule also writes at the same selector +
// state. Only when the resolved hover value is actually a gradient do we
// move the background paint onto its own `::after` layer first — the common
// flat-colour case (background emitted directly on $root_sel) is completely
// unchanged.
$tab_text_colour_hover_effective = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);

if ( str_contains( $tab_text_colour_hover_effective, 'gradient(' ) ) {
	$tab_bg_resting_decl = sgs_background_paint_decl(
		(string) ( $attributes['backgroundColour'] ?? '' ),
		(string) ( $attributes['backgroundColourGradient'] ?? '' )
	);
	$tab_bg_hover_decl   = sgs_background_paint_decl(
		(string) ( $attributes['backgroundColourHover'] ?? '' ),
		(string) ( $attributes['backgroundColourHoverGradient'] ?? '' )
	);
	$tab_responsive_css .= sgs_block_background_layer_css( $root_sel, $tab_bg_resting_decl, $tab_bg_hover_decl );
} else {
	// Background (colour + gradient, resting + hover) is owned by the shared
	// fill emitter, NOT by the style engine and NOT by supports.color.gradients.
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
}

$tab_responsive_css .= sgs_text_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'textColour',
		'hover'          => 'textColourHover',
		'gradient'       => 'textColourGradient',
		'hover_gradient' => 'textColourHoverGradient',
	)
);

// Text colour renders through sgs_resolve_text_colour_or_gradient() +
// sgs_text_colour_decl() above, not wp_style_engine_get_styles(): the engine's
// color.text input cannot carry a gradient (background-clip:text is not a
// colour value).

// Output the block's own scoped color/border CSS (if any). wp_strip_all_tags
// (NOT esc_html) blocks a </style> breakout while leaving CSS combinators
// like `>` intact (contract §D — matches SGS_Container_Wrapper + sgs/hero).

// ── Root border (width, style, colour, gradient ring, radius at three tiers)
// through the shared assembler. ──
$border = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$tab_responsive_css .= $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
$tab_responsive_css .= implode( '', $border['rules'] );
if ( $border['tablet'] ) {
	$tab_responsive_css .= '@media(max-width:1023px){' . $root_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$tab_responsive_css .= '@media(max-width:767px){' . $root_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
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
