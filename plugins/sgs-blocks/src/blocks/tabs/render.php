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
 * NO-INLINE (contract §A, 2026-07-09): color/spacing/__experimentalBorder all
 * declare __experimentalSkipSerialization in block.json. Base spacing/border-
 * radius/max-width/grid stay the WRAPPER's own scoped mechanism (SGS_Container_
 * Wrapper already emits those scoped internally — do NOT duplicate here). This
 * block owns emitting its WP color + border supports into ITS OWN scoped
 * `.{uid}` <style> (composite caveat: these must NOT ride through the wrapper's
 * `extra_styles`, which inlines). Mirrors sgs/hero exactly.
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
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so a border-width/radius value can never break out of its
// declaration. Mirrors sgs/hero.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

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
		// without passing context stripped it, so context-dependent children
		// (core/post-content in the PDP details tab) rendered EMPTY.
		// Root-caused live on the canary 2026-06-11.
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
	'tabActiveIndicatorColour' => '--sgs-tab-active-indicator',
	'tabHoverBgColour'         => '--sgs-tab-hover-bg',
	'panelBgColour'            => '--sgs-panel-bg',
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

$css_vars[] = '--sgs-transition-duration:' . $transition . 'ms';

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
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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

	$tabs_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$tabs_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$tabs_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$tabs_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$tabs_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $tabs_radius_raw ) && '' !== $tabs_radius_raw ) {
			$tabs_border_args['radius'] = $sgs_css_length( $tabs_radius_raw );
		} elseif ( is_array( $tabs_radius_raw ) ) {
			$tabs_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				if ( ! empty( $tabs_radius_raw[ $corner ] ) ) {
					$tabs_radius_clean[ $corner ] = $sgs_css_length( $tabs_radius_raw[ $corner ] );
				}
			}
			if ( ! empty( $tabs_radius_clean ) ) {
				$tabs_border_args['radius'] = $tabs_radius_clean;
			}
		}
	}
	if ( ! empty( $tabs_border_args ) ) {
		$tabs_style_engine_args['border'] = $tabs_border_args;
	}

	if ( ! empty( $tabs_style_engine_args ) ) {
		$tabs_scoped_styles = wp_style_engine_get_styles(
			$tabs_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $tabs_scoped_styles['css'] ) ) {
			$tabs_responsive_css .= $tabs_scoped_styles['css'];
		}
	}
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
// Every value reaching $tabs_responsive_css is pre-sanitised ($sgs_css_length /
// $sgs_css_keyword / wp_style_engine_get_styles), so nothing un-sanitised
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
