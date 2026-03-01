<?php
/**
 * Server-side render for the SGS Counter block.
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

$number        = (int) ( $attributes['number'] ?? 0 );
$prefix        = $attributes['prefix'] ?? '';
$suffix        = $attributes['suffix'] ?? '';
$label         = $attributes['label'] ?? '';
$duration      = (int) ( $attributes['duration'] ?? 2000 );
$separator     = $attributes['separator'] ?? true;
$num_colour    = $attributes['numberColour'] ?? '';
$label_colour  = $attributes['labelColour'] ?? '';
$label_size    = $attributes['labelFontSize'] ?? '';

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-counter',
	)
);

// Build inline style attributes.
$num_style_attr = $num_colour
	? ' style="color:' . sgs_colour_value( $num_colour ) . '"'
	: '';

$label_styles = array();
if ( $label_colour ) {
	$label_styles[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( $label_size ) {
	$label_styles[] = 'font-size:' . sgs_font_size_value( $label_size );
}
$label_style_attr = $label_styles ? ' style="' . implode( ';', $label_styles ) . '"' : '';

// Format the display number with optional thousand separator (en-GB locale).
if ( $separator ) {
	$display_number = number_format( $number, 0, '.', ',' );
} else {
	$display_number = (string) $number;
}

// Build data attributes for the view.js animation hook.
$data_attrs  = ' data-target="' . esc_attr( (string) $number ) . '"';
$data_attrs .= ' data-duration="' . esc_attr( (string) $duration ) . '"';
$data_attrs .= ' data-separator="' . ( $separator ? 'true' : 'false' ) . '"';
if ( $prefix ) {
	$data_attrs .= ' data-prefix="' . esc_attr( $prefix ) . '"';
}
if ( $suffix ) {
	$data_attrs .= ' data-suffix="' . esc_attr( $suffix ) . '"';
}

// Build the number span with prefix/suffix display and animation data attributes.
$number_html = sprintf(
	'<span class="sgs-counter__number"%s%s>%s%s%s</span>',
	$num_style_attr,
	$data_attrs,
	esc_html( $prefix ),
	esc_html( $display_number ),
	esc_html( $suffix )
);

// Label — stored as HTML by the RichText source selector.
$label_html = '';
if ( $label ) {
	$label_html = sprintf(
		'<p class="sgs-counter__label"%s>%s</p>',
		$label_style_attr,
		wp_kses_post( $label )
	);
}

printf( '<div %s>%s%s</div>', $wrapper_attributes, $number_html, $label_html );
