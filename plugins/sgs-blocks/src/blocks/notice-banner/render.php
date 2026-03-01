<?php
/**
 * Server-side render for the SGS Notice Banner block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$icon          = $attributes['icon'] ?? 'info';
$text          = $attributes['text'] ?? '';
$variant       = $attributes['variant'] ?? 'info';
$text_colour   = $attributes['textColour'] ?? '';
$text_fontsize = $attributes['textFontSize'] ?? '';

// Map icon slug to Lucide icon name.
// 'none' means no icon. The save.js used emoji; render.php uses proper Lucide SVGs.
$icon_map = array(
	'info'    => 'info',
	'check'   => 'circle-check',
	'truck'   => 'truck',
	'star'    => 'star',
	'warning' => 'triangle-alert',
	'gift'    => 'gift',
	'clock'   => 'clock',
	'none'    => '',
);

$classes = array(
	'sgs-notice-banner',
	'sgs-notice-banner--' . esc_attr( $variant ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'role'  => 'note',
	)
);

// Build inline style for text.
$text_styles = array();
if ( $text_colour ) {
	$text_styles[] = 'color:' . sgs_colour_value( $text_colour );
}
if ( $text_fontsize ) {
	$text_styles[] = 'font-size:' . sgs_font_size_value( $text_fontsize );
}
$text_style_attr = $text_styles ? ' style="' . implode( ';', $text_styles ) . '"' : '';

// Build icon HTML using Lucide rather than emoji for consistency.
$icon_html = '';
$icon_name = $icon_map[ $icon ] ?? '';
if ( $icon_name ) {
	$icon_svg  = sgs_get_lucide_icon( $icon_name );
	$icon_html = '<span class="sgs-notice-banner__icon" aria-hidden="true">' . $icon_svg . '</span>';
}

// Text content — stored as HTML by RichText source selector.
$text_html = '';
if ( $text ) {
	$text_html = sprintf(
		'<p class="sgs-notice-banner__text"%s>%s</p>',
		$text_style_attr,
		wp_kses_post( $text )
	);
}

printf(
	'<div %s>%s%s</div>',
	$wrapper_attributes,
	$icon_html,
	$text_html
);
