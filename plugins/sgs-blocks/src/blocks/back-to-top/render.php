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

$button_colour = $attributes['buttonColour'] ?? 'primary';
$icon_colour   = $attributes['iconColour'] ?? 'surface';
$size          = (int) ( $attributes['size'] ?? 48 );
$offset        = (int) ( $attributes['offset'] ?? 24 );
$show_after    = (int) ( $attributes['showAfter'] ?? 300 );

$styles = [
	'--sgs-btt-bg:' . sgs_colour_value( $button_colour ),
	'--sgs-btt-color:' . sgs_colour_value( $icon_colour ),
	'--sgs-btt-size:' . $size . 'px',
	'--sgs-btt-offset:' . $offset . 'px',
];

$wrapper = get_block_wrapper_attributes( [
	'class'           => 'sgs-back-to-top',
	'style'           => implode( ';', $styles ),
	'data-show-after' => (string) $show_after,
] );

printf(
	'<button %s aria-label="%s" type="button">' .
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' .
	'<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>' .
	'</svg></button>',
	$wrapper,
	esc_attr__( 'Back to top', 'sgs-blocks' )
);
