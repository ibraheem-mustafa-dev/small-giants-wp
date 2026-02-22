<?php
/**
 * Server-side render for the SGS Back to Top block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$button_colour   = $attributes['buttonColour'] ?? 'primary';
$icon_colour     = $attributes['iconColour'] ?? 'surface';
$position        = $attributes['position'] ?? 'bottom-right';
$size            = (int) ( $attributes['size'] ?? 48 );
$scroll_threshold = (int) ( $attributes['scrollThreshold'] ?? 300 );
$shape           = $attributes['shape'] ?? 'circle';

$classes = array(
	'sgs-back-to-top',
	'sgs-back-to-top--' . esc_attr( $position ),
	'sgs-back-to-top--' . esc_attr( $shape ),
);

$styles = array(
	'width:' . $size . 'px',
	'height:' . $size . 'px',
	'background-color:' . sgs_colour_value( $button_colour ),
	'color:' . sgs_colour_value( $icon_colour ),
);

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => implode( ' ', $classes ),
	'style' => implode( ';', $styles ),
) );

$arrow_svg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>';

printf(
	'<button %s data-threshold="%d" aria-label="%s" hidden>%s</button>',
	$wrapper_attributes,
	$scroll_threshold,
	esc_attr__( 'Back to top', 'sgs-blocks' ),
	$arrow_svg
);
