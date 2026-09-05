<?php
/**
 * SGS Tabs — server-side render.
 *
 * WS-4 composite-mirror: outer wrapper via SGS_Container_Wrapper (layout kind).
 * data-tabs-block + id attributes are passed via extra_attrs so view.js continues
 * to find the block via document.querySelectorAll('[data-tabs-block]').
 *
 * Builds the tab navigation (role="tablist") and tab panels (role="tabpanel")
 * from the inner sgs/tab child blocks. Handles deep linking via data attributes
 * consumed by view.js.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Base spacing/border-radius/max-width/grid stay the WRAPPER's own
 * scoped mechanism (SGS_Container_Wrapper already emits those scoped
 * internally — do NOT duplicate here). This block owns emitting its WP color
 * + border supports into ITS OWN scoped `.{uid}` <style> (composite caveat:
 * these must NOT ride through the wrapper's `extra_styles`, which inlines).
 * Mirrors sgs/hero exactly.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (not used — we render manually).
 * @var \WP_Block $block      Block instance with ->inner_blocks available.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style). Letters + hyphen only. Mirrors sgs/hero.
// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so a border-width/radius value can never break out of its
// declaration. Mirrors sgs/hero.
$orientation = $attributes['orientation'] ?? 'horizontal';
$tab_style   = $attributes['tabStyle'] ?? 'underline';
$tab_align   = $attributes['tabAlignment'] ?? 'left';
$transition  = isset( $attributes['transitionDuration'] )
	? (int) $attributes['transitionDuration']
	: 200;

// Collect tabs from inner blocks.
$tabs = array(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- local render.php scope; $tabs is not a WP global.
foreach ( $block->inner_blocks as $inner_block ) {
	if ( 'sgs/tab' !== $inner_block->name ) {
		continue;
	}
	$tabs[] = array( // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- $tabs[] append, not a WP global.
		'label'   => isset( $inner_block->attributes['label'] )
			? wp_strip_all_tags( $inner_block->attributes['label'] )
			: __( 'Tab', 'sgs-blocks' ),
		// Render the EXISTING WP_Block instance — it carries the inherited
		// block context (postId/postType). Re-constructing from parsed_block
		// without passing context strips it, so context-dependent children
		// (core/post-content in the PDP details tab) render EMPTY.
		'content' => $inner_block->render(),
	);
}

if ( empty( $tabs ) ) {
	return;
}

// Generate a stable block ID for ARIA relationships.
$block_id = ! empty( $attributes['anchor'] )
	? sanitize_html_class( $attributes['anchor'] )
	: 'sgs-tabs-' . substr( md5( serialize( $attributes ) . count( $tabs ) ), 0, 8 ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize -- $attributes is a plain array of scalars from block.json; no objects, no injection risk.

// ─── Inline CSS custom properties ───────────────────────────────────────────
$css_vars = array();

$colour_props = array(
	'tabTextColour'            => '--sgs-tab-text',
	'tabActiveTextColour'      => '--sgs-tab-active-text',
	'tabActiveBgColour'        => '--sgs-tab-active-bg',
	'tabIndicatorColour'       => '--sgs-tab-indicator',
	'tabActiveIndicatorColour' => '--sgs-tab-active-indicator',
	'tabHoverBgColour'         => '--sgs-tab-hover-bg',
	'panelBorderColour'        => '--sgs-panel-border',
);

foreach ( $colour_props as $attr => $prop ) {
	if ( ! empty( $attributes[ $attr ] ) ) {
		$resolved = sgs_colour_value( $attributes[ $attr ] );
		if ( $resolved ) {
			$css_vars[] = $prop . ':' . $resolved;
		}
	}
}

// tabBgColour/panelBgColour gradient siblings (2026-09-06, colour-conformance
// closeout) — same custom-property-gradient shape already proven on
// brand-strip/post-grid/social-icons/form/gallery/before-after/option-picker
// (helpers-tokens.php:953); style.css carries the matching
// background-image:var(--sgs-tab-bg[/panel]-gradient,none) line next to the
// existing background-color/background rule.
$css_vars = array_merge( $css_vars, sgs_custom_property_gradient_decls( 'sgs-tab-bg', $attributes['tabBgColour'] ?? '', $attributes['tabBgColourGradient'] ?? '' ) );
$css_vars = array_merge( $css_vars, sgs_custom_property_gradient_decls( 'sgs-panel-bg', $attributes['panelBgColour'] ?? '', $attributes['panelBgColourGradient'] ?? '' ) );

$css_vars[] = '--sgs-transition-duration:' . $transition . 'ms';

// D636 border-colour gradient rollout — resting/active tab indicator + panel
// border. tabIndicatorColour/tabActiveIndicatorColour resolve to css:border-
// color in the DB (the box-shadow underline is this block's visual technique
// for border-colour), so they take the same masked ::before ring mechanism
// as every other border-colour attribute. Non-empty gradient wins over the
// flat colour; each state uses its own selector (not `:hover`) so the ring
// only appears on the tab actually in that state.
// D948-follow-up (2026-09-05) — resting tab TEXT colour/gradient. tabTextColour
// resolves to css:color in the DB (a genuine text row, not border), so it takes
// the text-colour/gradient primitive rather than the masked-ring border
// mechanism above. Resting state only (`:not([aria-selected='true'])`) — mirrors
// the D636 indicator scoping so this override never clobbers the ALREADY-
// selected tab, which stays governed by tabActiveTextColour (untouched here).
$tab_text_effective = sgs_resolve_text_colour_or_gradient( $attributes['tabTextColour'] ?? '', $attributes['tabTextColourGradient'] ?? '' );
$tab_text_decl      = sgs_text_colour_decl( $tab_text_effective );

$tab_indicator_gradient        = sgs_css_gradient_value( $attributes['tabIndicatorColourGradient'] ?? '' );
$tab_active_indicator_gradient = sgs_css_gradient_value( $attributes['tabActiveIndicatorColourGradient'] ?? '' );
$panel_border_gradient         = sgs_css_gradient_value( $attributes['panelBorderColourGradient'] ?? '' );

// ─── Scoped uid + root selector (NO-INLINE contract §A) ──────────────────────
// Own uid, independent of the wrapper's internal uid — mirrors sgs/hero. Added
// as an extra class so $root_sel resolves against the rendered wrapper element.
$tabs_uid = 'sgs-tabs-uid-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $tabs_uid . '.wp-block-sgs-tabs';

// ─── Own classes + styles ─────────────────────────────────────────────────────
$extra_classes = array(
	'sgs-tabs',
	'sgs-tabs--' . esc_attr( $orientation ),
	'sgs-tabs--style-' . esc_attr( $tab_style ),
	'sgs-tabs--align-' . esc_attr( $tab_align ),
	$tabs_uid,
);

// Skip-serialised `color` support stops WP auto-adding the standard
// has-*-color / has-*-background-color classes onto the wrapper — re-add them
// manually (mirrors sgs/hero + sgs/quote) so preset palette colours resolve.
$tabs_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$tabs_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $tabs_preset_text_slug ) {
	$extra_classes[] = 'has-text-color';
	$extra_classes[] = 'has-' . $tabs_preset_text_slug . '-color';
}
if ( '' !== $tabs_preset_bg_slug ) {
	$extra_classes[] = 'has-background';
	$extra_classes[] = 'has-' . $tabs_preset_bg_slug . '-background-color';
}

// ─── WP-native color / border supports — no-inline contract (§A) ─────────────
// Read the resolved values from $attributes['style'] (still populated — skip-
// serialisation only stops the AUTO-INLINE) and emit into TABS' OWN scoped
// <style> via the stable core API. Mirrors sgs/hero exactly; spacing/max-width/
// grid stay the wrapper's own scoped mechanism (not duplicated here).
$tabs_responsive_css = '';

$tabs_style_engine_args = array();

$tabs_color_args = array();
if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
	$tabs_color_args['text'] = (string) $attributes['style']['color']['text'];
}
if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
	$tabs_color_args['background'] = (string) $attributes['style']['color']['background'];
}
if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
	$tabs_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
}
if ( ! empty( $tabs_color_args ) ) {
	$tabs_style_engine_args['color'] = $tabs_color_args;
}

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

if ( ! empty( $tabs_style_engine_args ) ) {
	$tabs_scoped_styles = wp_style_engine_get_styles(
		$tabs_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $tabs_scoped_styles['css'] ) ) {
		$tabs_responsive_css .= $tabs_scoped_styles['css'];
	}
}

// D636 border-colour gradient rollout — masked ::before ring per state.
// Resting/active are distinct static selectors (aria-selected), never a CSS
// `:hover`, so hover_paint stays null on every call here.
if ( '' !== $tab_indicator_gradient ) {
	$tabs_responsive_css .= sgs_border_gradient_css(
		"{$root_sel} .sgs-tabs__tab:not([aria-selected='true'])",
		$tab_indicator_gradient,
		null,
		'2px'
	);
}
if ( '' !== $tab_active_indicator_gradient ) {
	$tabs_responsive_css .= sgs_border_gradient_css(
		"{$root_sel} .sgs-tabs__tab[aria-selected='true']",
		$tab_active_indicator_gradient,
		null,
		'2px'
	);
}
if ( '' !== $panel_border_gradient ) {
	$tabs_responsive_css .= sgs_border_gradient_css(
		"{$root_sel} .sgs-tabs__panel",
		$panel_border_gradient,
		null,
		'1px'
	);
}

// Resting tab TEXT colour/gradient override (D948-follow-up) — scoped rule
// beats the compiled stylesheet's `color: var( --sgs-tab-text, … )` default by
// source order (this <style> is enqueued after style-index.css) at
// equal-or-greater specificity. `:not([aria-selected='true'])` keeps this from
// ever painting the active tab, which stays governed by tabActiveTextColour.
if ( '' !== $tab_text_decl ) {
	$tab_text_sel         = "{$root_sel} .sgs-tabs__tab:not([aria-selected='true'])";
	$tabs_responsive_css .= "{$tab_text_sel}{{$tab_text_decl};}";
	$tabs_responsive_css .= sgs_text_colour_gradient_fallback_rule( $tab_text_sel, $tab_text_effective );
}

// $css_vars (CSS custom-property VALUES only, e.g. --sgs-tab-text:…) stay
// inline via extra_styles — a `--x: value` VALUE is allowed by the no-inline
// contract (only real property declarations are forbidden).
$extra_styles = $css_vars;

// ─── Attrs that view.js queries on the OUTER wrapper ─────────────────────────
// view.js: document.querySelectorAll('[data-tabs-block]')
// The id is also on the outer wrapper for ARIA labelledby on panels.
$extra_attrs = array(
	'id'              => esc_attr( $block_id ),
	'data-tabs-block' => 'true',
);

// ─── Build interior HTML (tablist + panels) ───────────────────────────────────
$tab_count   = count( $tabs );
$nav_html    = '';
$panels_html = '';

$aria_label = ! empty( $attributes['blockLabel'] )
	? $attributes['blockLabel']
	: ( ! empty( $tabs[0]['label'] ) ? $tabs[0]['label'] : __( 'Content tabs', 'sgs-blocks' ) );

$nav_html .= sprintf(
	'<div class="sgs-tabs__nav" role="tablist" aria-label="%s" aria-orientation="%s">',
	esc_attr( $aria_label ),
	esc_attr( $orientation )
);

foreach ( $tabs as $i => $tab ) { // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- $tab is not a WP global; local loop variable.
	$tab_id   = esc_attr( $block_id . '-tab-' . $i );
	$panel_id = esc_attr( $block_id . '-panel-' . $i );
	$is_first = ( 0 === $i );

	$nav_html .= sprintf(
		'<button id="%s" class="sgs-tabs__tab%s" role="tab" aria-selected="%s" aria-controls="%s" tabindex="%s" data-tab-index="%d">%s</button>',
		$tab_id,
		$is_first ? ' sgs-tabs__tab--active' : '',
		$is_first ? 'true' : 'false',
		$panel_id,
		$is_first ? '0' : '-1',
		$i,
		esc_html( $tab['label'] )
	);
}

$nav_html .= '</div>';

$panels_html .= '<div class="sgs-tabs__panels">';
foreach ( $tabs as $i => $tab ) { // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- $tab is not a WP global; local loop variable.
	$tab_id   = esc_attr( $block_id . '-tab-' . $i );
	$panel_id = esc_attr( $block_id . '-panel-' . $i );
	$is_first = ( 0 === $i );

	$panels_html .= sprintf(
		'<div id="%s" class="sgs-tabs__panel" role="tabpanel" aria-labelledby="%s" tabindex="0"%s>%s</div>',
		$panel_id,
		$tab_id,
		$is_first ? '' : ' hidden',
		$tab['content'] // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered block HTML.
	);
}
$panels_html .= '</div>';

$inner_html = $nav_html . $panels_html;

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
		$tabs_responsive_css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$tabs_responsive_css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$tabs_responsive_css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$tabs_responsive_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$tabs_responsive_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$tabs_responsive_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// Every value reaching $tabs_responsive_css is pre-sanitised (sgs_css_length_value() /
// sgs_css_keyword_sanitise() / wp_style_engine_get_styles), so nothing un-sanitised
// survives to here.
if ( $tabs_responsive_css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied below.
	printf( '<style id="%s">%s</style>', esc_attr( $tabs_uid ), wp_strip_all_tags( $tabs_responsive_css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $extra_classes,
		'extra_styles'  => $extra_styles,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
