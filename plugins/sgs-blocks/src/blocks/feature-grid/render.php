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

$layout_mode     = isset( $attributes['layoutMode'] ) ? esc_attr( $attributes['layoutMode'] ) : 'auto-flex';
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

if ( 'auto-flex' === $layout_mode ) {
	/*
	 * Auto-flex: CSS Grid with auto-fill.
	 * Each item has a min-width; the browser wraps to a new row
	 * whenever a full row of items at that width no longer fits.
	 * No media queries needed — fully intrinsic.
	 */
	$css = "#$uid.sgs-feature-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax({$min_item_width}{$min_item_unit}, 1fr));
	gap: $gap_css;
	align-items: $align_items;
	justify-items: $justify_items;
}";
} else {
	/*
	 * Fixed columns: explicit grid with breakpoint overrides.
	 * Desktop (>1024px): $columns_desktop columns.
	 * Tablet (769px–1024px): $columns_tablet columns.
	 * Mobile (≤768px): $columns_mobile columns.
	 */
	$css = "#$uid.sgs-feature-grid {
	display: grid;
	grid-template-columns: repeat($columns_desktop, 1fr);
	gap: $gap_css;
	align-items: $align_items;
	justify-items: $justify_items;
}
@media (max-width: 1024px) {
	#$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_tablet, 1fr);
		gap: $gap_tablet_css;
	}
}
@media (max-width: 768px) {
	#$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_mobile, 1fr);
		gap: $gap_mobile_css;
	}
}";
}

echo '<style>' . esc_html( $css ) . '</style>';

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => array( 'sgs-feature-grid', 'sgs-feature-grid--' . $layout_mode ),
		'extra_attrs'   => array( 'id' => $uid ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
