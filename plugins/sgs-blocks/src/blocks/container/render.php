<?php
/**
 * Server-side render for the SGS Container block.
 *
 * Uses the htmlTag attribute to output the correct semantic element.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/shape-dividers.php';

$layout           = $attributes['layout'] ?? 'stack';
$columns          = $attributes['columns'] ?? 2;
$columns_mobile   = $attributes['columnsMobile'] ?? 1;
$columns_tablet   = $attributes['columnsTablet'] ?? 2;
$gap              = $attributes['gap'] ?? '40';
$bg_image         = $attributes['backgroundImage'] ?? null;
$overlay_colour   = $attributes['backgroundOverlayColour'] ?? '';
$overlay_opacity  = $attributes['backgroundOverlayOpacity'] ?? 50;
$shadow           = $attributes['shadow'] ?? '';
$max_width        = $attributes['maxWidth'] ?? 'wide';
$min_height       = $attributes['minHeight'] ?? '';
$vertical_align   = $attributes['verticalAlign'] ?? 'start';
$html_tag         = $attributes['htmlTag'] ?? 'section';

// Allowlist for HTML tags.
$allowed_tags = array( 'section', 'div', 'article', 'aside', 'main' );
if ( ! in_array( $html_tag, $allowed_tags, true ) ) {
	$html_tag = 'section';
}

// Build inline styles.
$styles = array();
$styles[] = 'gap:var(--wp--preset--spacing--' . esc_attr( $gap ) . ')';

if ( $min_height ) {
	$styles[] = 'min-height:' . esc_attr( $min_height );
}

if ( $shadow ) {
	$styles[] = 'box-shadow:var(--wp--preset--shadow--' . esc_attr( $shadow ) . ')';
}

if ( ! empty( $bg_image['url'] ) ) {
	$styles[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
	$styles[] = 'background-size:cover';
	$styles[] = 'background-position:center';
}

if ( 'grid' === $layout ) {
	$styles[] = 'display:grid';
	$styles[] = 'grid-template-columns:repeat(' . absint( $columns ) . ',1fr)';
	$styles[] = 'align-items:' . esc_attr( $vertical_align );
} elseif ( 'flex' === $layout ) {
	$styles[] = 'display:flex';
	$styles[] = 'flex-wrap:wrap';
	$styles[] = 'align-items:' . esc_attr( $vertical_align );
}

// Build CSS classes.
$classes = array(
	'sgs-container',
	'sgs-container--' . esc_attr( $layout ),
	'sgs-container--width-' . esc_attr( $max_width ),
);

if ( 'grid' === $layout ) {
	$classes[] = 'sgs-cols-' . absint( $columns );
	if ( $columns_tablet ) {
		$classes[] = 'sgs-cols-tablet-' . absint( $columns_tablet );
	}
	if ( $columns_mobile ) {
		$classes[] = 'sgs-cols-mobile-' . absint( $columns_mobile );
	}
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => implode( ';', $styles ),
	)
);

// Build overlay markup.
$overlay_html = '';
if ( ! empty( $bg_image['url'] ) && $overlay_colour ) {
	$overlay_style = sprintf(
		'background-color:%s;opacity:%s',
		esc_attr( $overlay_colour ),
		esc_attr( $overlay_opacity / 100 )
	);
	$overlay_html = '<span class="sgs-container__overlay" style="' . $overlay_style . '" aria-hidden="true"></span>';
}

// Shape dividers.
$shape_top    = $attributes['shapeDividerTop'] ?? '';
$shape_bottom = $attributes['shapeDividerBottom'] ?? '';

$shape_top_html    = '';
$shape_bottom_html = '';

if ( $shape_top ) {
	$shape_top_html = sgs_render_shape_divider(
		$shape_top,
		sgs_colour_value( $attributes['shapeDividerTopColour'] ?? 'surface' ),
		(int) ( $attributes['shapeDividerTopHeight'] ?? 60 ),
		! empty( $attributes['shapeDividerTopFlip'] ),
		! empty( $attributes['shapeDividerTopInvert'] ),
		'top'
	);
}

if ( $shape_bottom ) {
	$shape_bottom_html = sgs_render_shape_divider(
		$shape_bottom,
		sgs_colour_value( $attributes['shapeDividerBottomColour'] ?? 'surface' ),
		(int) ( $attributes['shapeDividerBottomHeight'] ?? 60 ),
		! empty( $attributes['shapeDividerBottomFlip'] ),
		! empty( $attributes['shapeDividerBottomInvert'] ),
		'bottom'
	);
}

if ( $shape_top || $shape_bottom ) {
	$classes[] = 'sgs-container--has-shape-divider';
}

// Rebuild wrapper attributes if shapes added a class.
if ( $shape_top || $shape_bottom ) {
	$wrapper_attributes = get_block_wrapper_attributes(
		array(
			'class' => implode( ' ', $classes ),
			'style' => implode( ';', $styles ),
		)
	);
}

printf(
	'<%1$s %2$s>%3$s%4$s%5$s%6$s</%1$s>',
	$html_tag,
	$wrapper_attributes,
	$shape_top_html,
	$overlay_html,
	$content,
	$shape_bottom_html
);
