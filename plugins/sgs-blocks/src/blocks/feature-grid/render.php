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
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs (border-style) — letters + hyphen only.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$layout_mode     = isset( $attributes['layoutMode'] ) ? esc_attr( $attributes['layoutMode'] ) : 'fixed-columns';
$columns_desktop = isset( $attributes['columnsDesktop'] ) ? absint( $attributes['columnsDesktop'] ) : 4;
$columns_tablet  = isset( $attributes['columnsTablet'] ) ? absint( $attributes['columnsTablet'] ) : 2;
$columns_mobile  = isset( $attributes['columnsMobile'] ) ? absint( $attributes['columnsMobile'] ) : 1;
$min_item_width  = isset( $attributes['minItemWidth'] ) ? absint( $attributes['minItemWidth'] ) : 240;
$min_item_unit   = isset( $attributes['minItemWidthUnit'] ) && in_array( $attributes['minItemWidthUnit'], array( 'px', 'em', 'rem' ), true )
	? $attributes['minItemWidthUnit']
	: 'px';

// Gap is now a full CSS value string (e.g. "24px") or a bare WP spacing slug
// (e.g. "40"). sgs_container_gap_value() handles both formats.
// Back-compat: pre-consolidation posts may store a bare number (e.g. 24) with
// a separate gapUnit attr (e.g. "px"). deprecated.js v3 migrates those on the
// next editor open. On the server side we handle the legacy format defensively:
// if gap is numeric-only (no unit letters), assume gapUnit was "px".
$gap_raw        = isset( $attributes['gap'] ) ? (string) $attributes['gap'] : '24px';
$gap_unit_legacy = isset( $attributes['gapUnit'] ) ? (string) $attributes['gapUnit'] : 'px';
if ( '' !== $gap_raw && preg_match( '/^\d+$/', $gap_raw ) ) {
	// Bare digit-only number — reconstruct the full CSS value using the legacy unit
	// (defaulting to "px"). The previous guard excluded the px case, which was wrong:
	// the old render used $gap.$unit where unit defaulted to "px", so "24" → "24px".
	$gap_raw = $gap_raw . $gap_unit_legacy;
}
$gap_css = sgs_container_gap_value( $gap_raw );
if ( '' === $gap_css ) {
	$gap_css = '24px'; // Safe fallback if attribute is missing or invalid.
}

$gap_tablet_raw = isset( $attributes['gapTablet'] ) ? (string) $attributes['gapTablet'] : '';
$gap_mobile_raw = isset( $attributes['gapMobile'] ) ? (string) $attributes['gapMobile'] : '16px';

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
$grid_template     = isset( $attributes['gridTemplateColumns'] ) ? trim( (string) $attributes['gridTemplateColumns'] ) : '';
$has_explicit_grid = '' !== $grid_template;
$use_auto_flex     = ( 'auto-flex' === $layout_mode ) && ! $has_explicit_grid;

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
	 * overrides. Desktop (>1024px): $columns_desktop. Tablet (769–1024px):
	 * $columns_tablet. Mobile (≤768px): $columns_mobile.
	 */
	$css = ".$uid.sgs-feature-grid {
	display: grid;
	grid-template-columns: repeat($columns_desktop, 1fr);
	gap: $gap_css;
	align-items: $align_items;
	justify-items: $justify_items;
}
@media (max-width: 1024px) {
	.$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_tablet, 1fr);
		gap: $gap_tablet_css;
	}
}
@media (max-width: 768px) {
	.$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_mobile, 1fr);
		gap: $gap_mobile_css;
	}
}";
}

// ── WP-native color / border supports — no-inline contract (§A). ──────────────
// block.json declares color/spacing/__experimentalBorder ALL with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes() (called
// inside SGS_Container_Wrapper::render() below) never auto-inlines them. Read the
// resolved values from $attributes['style'] here and emit them into this block's
// OWN scoped <style>, reusing the same ID hook the grid engine already builds
// (.$uid.sgs-feature-grid) rather than minting a second uid. Spacing (padding/
// margin) is a SEPARATE mechanism the shared wrapper already handles scoped
// internally — not duplicated here.
$root_sel = '.' . $uid . '.sgs-feature-grid';
// D303: $uid is ALSO a class (the wrapper applies it as an id via extra_attrs) so the
// class-scoped `.{$uid}.sgs-feature-grid` colour/border rules match this element.
$classes  = array( 'sgs-feature-grid', $mode_class, $uid );

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$fg_style_engine_args = array();

	$fg_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$fg_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$fg_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$fg_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $fg_color_args ) ) {
		$fg_style_engine_args['color'] = $fg_color_args;
	}

	$fg_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$fg_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$fg_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$fg_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$fg_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $fg_radius_raw ) && '' !== $fg_radius_raw ) {
			$fg_border_args['radius'] = $sgs_css_length( $fg_radius_raw );
		} elseif ( is_array( $fg_radius_raw ) ) {
			$fg_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $fg_corner ) {
				if ( ! empty( $fg_radius_raw[ $fg_corner ] ) ) {
					$fg_radius_clean[ $fg_corner ] = $sgs_css_length( $fg_radius_raw[ $fg_corner ] );
				}
			}
			if ( ! empty( $fg_radius_clean ) ) {
				$fg_border_args['radius'] = $fg_radius_clean;
			}
		}
	}
	if ( ! empty( $fg_border_args ) ) {
		$fg_style_engine_args['border'] = $fg_border_args;
	}

	if ( ! empty( $fg_style_engine_args ) ) {
		$fg_scoped_styles = wp_style_engine_get_styles(
			$fg_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $fg_scoped_styles['css'] ) ) {
			$css .= $fg_scoped_styles['css'];
		}
	}
}

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
