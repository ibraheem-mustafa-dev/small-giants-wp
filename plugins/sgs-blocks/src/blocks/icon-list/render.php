<?php
/**
 * Server-side render for the SGS Icon List block.
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
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$items        = $attributes['items'] ?? array();
$default_icon = $attributes['icon'] ?? 'check';
$icon_colour  = $attributes['iconColour'] ?? '';
$icon_size    = $attributes['iconSize'] ?? 'medium';
$text_colour  = $attributes['textColour'] ?? '';
$gap          = $attributes['gap'] ?? '20';

if ( empty( $items ) ) {
	return;
}

// Build wrapper inline styles: gap as spacing preset.
$list_styles = array(
	'gap:var(--wp--preset--spacing--' . esc_attr( $gap ) . ')',
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-icon-list sgs-icon-list--icon-' . esc_attr( $icon_size ),
		'style' => implode( ';', $list_styles ),
	)
);

// Build per-item style attributes.
$icon_style_attr = $icon_colour
	? ' style="color:' . sgs_colour_value( $icon_colour ) . '"'
	: '';

$text_style_attr = $text_colour
	? ' style="color:' . sgs_colour_value( $text_colour ) . '"'
	: '';

// Build list items.
$items_html = '';
foreach ( $items as $item ) {
	// Per-item icon overrides the block-level default.
	$icon_slug = ! empty( $item['icon'] ) ? $item['icon'] : $default_icon;
	$icon_svg  = sgs_get_lucide_icon( $icon_slug );
	$item_text = $item['text'] ?? '';

	$items_html .= sprintf(
		'<li class="sgs-icon-list__item">' .
		'<span class="sgs-icon-list__icon"%s aria-hidden="true">%s</span>' .
		'<span class="sgs-icon-list__text"%s>%s</span>' .
		'</li>',
		$icon_style_attr,
		$icon_svg,
		$text_style_attr,
		esc_html( $item_text )
	);
}

printf( '<ul %s>%s</ul>', $wrapper_attributes, $items_html );
