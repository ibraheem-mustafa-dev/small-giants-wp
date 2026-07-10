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
 * R-22-14: explicit discriminators, never empty($content).
 *
 * NO-INLINE (contract §A, 2026-07-09): color/__experimentalBorder both declare
 * __experimentalSkipSerialization in block.json (tab has no spacing/typography
 * supports). Width/padding stay the wrapper's own scoped mechanism ('content'
 * kind). This block owns emitting its WP color + border supports into ITS OWN
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

// ─── WP-native color / border supports — no-inline contract (§A) ─────────────
// Read the resolved values from $attributes['style'] (still populated — skip-
// serialisation only stops the AUTO-INLINE) and emit into THIS TAB'S OWN
// scoped <style> via the stable core API. Mirrors sgs/hero + sgs/tabs.
$tab_responsive_css = '';
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$tab_style_engine_args = array();

	$tab_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$tab_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$tab_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$tab_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $tab_color_args ) ) {
		$tab_style_engine_args['color'] = $tab_color_args;
	}

	$tab_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$tab_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$tab_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$tab_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$tab_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $tab_radius_raw ) && '' !== $tab_radius_raw ) {
			$tab_border_args['radius'] = $sgs_css_length( $tab_radius_raw );
		} elseif ( is_array( $tab_radius_raw ) ) {
			$tab_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				if ( ! empty( $tab_radius_raw[ $corner ] ) ) {
					$tab_radius_clean[ $corner ] = $sgs_css_length( $tab_radius_raw[ $corner ] );
				}
			}
			if ( ! empty( $tab_radius_clean ) ) {
				$tab_border_args['radius'] = $tab_radius_clean;
			}
		}
	}
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
}

// Output the block's own scoped color/border CSS (if any). wp_strip_all_tags
// (NOT esc_html) blocks a </style> breakout while leaving CSS combinators
// like `>` intact (contract §D — matches SGS_Container_Wrapper + sgs/hero).
// Every value reaching $tab_responsive_css is pre-sanitised ($sgs_css_length /
// $sgs_css_keyword / wp_style_engine_get_styles), so nothing un-sanitised
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
