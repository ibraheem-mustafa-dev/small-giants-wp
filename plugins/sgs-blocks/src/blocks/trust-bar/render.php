<?php
/**
 * Server-side render for the SGS Trust Bar block.
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

$items         = $attributes['items'] ?? array();
$animated      = $attributes['animated'] ?? true;
$value_colour  = $attributes['valueColour'] ?? '';
$label_colour  = $attributes['labelColour'] ?? '';
$label_size    = $attributes['labelFontSize'] ?? '';

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-trust-bar',
	)
);

// Build inline style attributes.
$value_style_attr = $value_colour
	? ' style="color:' . sgs_colour_value( $value_colour ) . '"'
	: '';

$label_styles = array();
if ( $label_colour ) {
	$label_styles[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( $label_size ) {
	$label_styles[] = 'font-size:' . sgs_font_size_value( $label_size );
}
$label_style_attr = $label_styles ? ' style="' . implode( ';', $label_styles ) . '"' : '';

/**
 * Determine whether a value string represents a plain number.
 * Strips commas and whitespace before testing (matches view.js logic).
 *
 * @since 1.0.0
 * @param string $val The display value to test.
 * @return bool True if the value is numeric.
 */
function sgs_trust_bar_is_numeric( string $val ): bool {
	if ( '' === $val ) {
		return false;
	}
	$cleaned = preg_replace( '/[,\s]/', '', $val );
	return is_numeric( $cleaned ) && '' !== $cleaned;
}

// Build item HTML.
$items_html = '';
foreach ( $items as $item ) {
	$value  = $item['value'] ?? '';
	$suffix = $item['suffix'] ?? '';
	$label  = $item['label'] ?? '';

	// Determine whether this item should animate (requires a numeric value).
	$item_animated = $animated && ( $item['animated'] ?? true ) && sgs_trust_bar_is_numeric( $value );

	// Build data attributes for the counter animation hook (view.js).
	$data_attrs = '';
	if ( $item_animated ) {
		$numeric_value = (int) preg_replace( '/[,\s]/', '', $value );
		$data_attrs   .= ' data-target="' . esc_attr( (string) $numeric_value ) . '"';
		$data_attrs   .= ' data-separator="true"';
		if ( $suffix ) {
			$data_attrs .= ' data-suffix="' . esc_attr( $suffix ) . '"';
		}
	}

	$items_html .= sprintf(
		'<div class="sgs-trust-bar__item">' .
		'<span class="sgs-trust-bar__value"%s%s>%s%s</span>' .
		'<span class="sgs-trust-bar__label"%s>%s</span>' .
		'</div>',
		$value_style_attr,
		$data_attrs,
		esc_html( $value ),
		esc_html( $suffix ),
		$label_style_attr,
		esc_html( $label )
	);
}

printf( '<div %s>%s</div>', $wrapper_attributes, $items_html );
