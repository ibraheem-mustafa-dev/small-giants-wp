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

$layout_mode     = isset( $attributes['layoutMode'] ) ? esc_attr( $attributes['layoutMode'] ) : 'auto-flex';
$columns_desktop = isset( $attributes['columnsDesktop'] ) ? absint( $attributes['columnsDesktop'] ) : 4;
$columns_tablet  = isset( $attributes['columnsTablet'] ) ? absint( $attributes['columnsTablet'] ) : 2;
$columns_mobile  = isset( $attributes['columnsMobile'] ) ? absint( $attributes['columnsMobile'] ) : 1;
$min_item_width  = isset( $attributes['minItemWidth'] ) ? absint( $attributes['minItemWidth'] ) : 240;
$min_item_unit   = isset( $attributes['minItemWidthUnit'] ) && in_array( $attributes['minItemWidthUnit'], array( 'px', 'em', 'rem' ), true )
	? $attributes['minItemWidthUnit']
	: 'px';
$gap             = isset( $attributes['gap'] ) ? absint( $attributes['gap'] ) : 24;
$gap_tablet      = ( isset( $attributes['gapTablet'] ) && null !== $attributes['gapTablet'] )
	? absint( $attributes['gapTablet'] )
	: $gap;
$gap_mobile      = isset( $attributes['gapMobile'] ) ? absint( $attributes['gapMobile'] ) : 16;
$gap_unit        = isset( $attributes['gapUnit'] ) && in_array( $attributes['gapUnit'], array( 'px', 'em', 'rem' ), true )
	? $attributes['gapUnit']
	: 'px';
$align_items     = isset( $attributes['alignItems'] ) && in_array( $attributes['alignItems'], array( 'stretch', 'start', 'center', 'end' ), true )
	? $attributes['alignItems']
	: 'stretch';
$justify_items   = isset( $attributes['justifyItems'] ) && in_array( $attributes['justifyItems'], array( 'stretch', 'start', 'center', 'end' ), true )
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
	gap: {$gap}{$gap_unit};
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
	gap: {$gap}{$gap_unit};
	align-items: $align_items;
	justify-items: $justify_items;
}
@media (max-width: 1024px) {
	#$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_tablet, 1fr);
		gap: {$gap_tablet}{$gap_unit};
	}
}
@media (max-width: 768px) {
	#$uid.sgs-feature-grid {
		grid-template-columns: repeat($columns_mobile, 1fr);
		gap: {$gap_mobile}{$gap_unit};
	}
}";
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => 'sgs-feature-grid sgs-feature-grid--' . $layout_mode,
	)
);
?>
<style><?php echo esc_html( $css ); ?></style>
<?php
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns trusted WP output.
echo '<div ' . $wrapper_attributes . '>';
// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is already-rendered InnerBlocks HTML.
echo $content;
echo '</div>';
?>
