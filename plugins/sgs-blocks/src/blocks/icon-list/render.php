<?php
/**
 * Server-side render for the SGS Icon List block.
 *
 * Outputs inline SVG icons via sgs_get_lucide_icon(), eliminating brittle
 * CSS content/Unicode rendering that breaks on some platforms.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Map editor icon slugs to Lucide icon names.
$icon_map = array(
	'check'       => 'check',
	'star-filled' => 'star',
	'arrow-right' => 'arrow-right',
	'shipping'    => 'truck',
	'shield'      => 'shield',
	'payment'     => 'credit-card',
	'globe'       => 'globe',
	'people'      => 'users',
);

$items        = $attributes['items'] ?? array();
$default_icon = $attributes['icon'] ?? 'check';
$icon_colour  = $attributes['iconColour'] ?? '';
$icon_size    = $attributes['iconSize'] ?? 'medium';
$dividers     = ! empty( $attributes['dividers'] );
$text_colour  = $attributes['textColour'] ?? '';
$gap          = $attributes['gap'] ?? '20';

// Validate icon size — only allow known sizes.
$allowed_icon_sizes = array( 'small', 'medium', 'large', 'xlarge' );
if ( ! in_array( $icon_size, $allowed_icon_sizes, true ) ) {
	$icon_size = 'medium';
}

// Sanitise gap to digits only — it is used as a spacing preset slug (e.g. "20", "30").
$gap_slug = preg_replace( '/[^0-9]/', '', $gap );

$wrapper_classes = 'sgs-icon-list sgs-icon-list--icon-' . esc_attr( $icon_size );
if ( $dividers ) {
	$wrapper_classes .= ' sgs-icon-list--dividers';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => $wrapper_classes,
		'style' => $gap_slug ? '--sgs-icon-list-gap: var(--wp--preset--spacing--' . $gap_slug . ');' : '',
	)
);

// Icon colour style.
$icon_style = '';
if ( $icon_colour ) {
	$icon_style = ' style="color:' . sgs_colour_value( $icon_colour ) . '"';
}

// Text colour style.
$text_style = '';
if ( $text_colour ) {
	$text_style = ' style="color:' . sgs_colour_value( $text_colour ) . '"';
}

$items_html = '';
foreach ( $items as $item ) {
	$item_icon_slug = $item['icon'] ?? $default_icon;
	$lucide_name    = $icon_map[ $item_icon_slug ] ?? 'check';
	$svg            = sgs_get_lucide_icon( $lucide_name );
	$item_text      = $item['text'] ?? '';
	$item_url       = isset( $item['url'] ) ? esc_url( $item['url'] ) : '';

	// Wrap text in <a> when a per-item URL is provided.
	if ( $item_url ) {
		$text_content = sprintf(
			'<a href="%s" class="sgs-icon-list__item-link"%s>%s</a>',
			$item_url,
			! empty( $item['newTab'] ) ? ' target="_blank" rel="noopener noreferrer"' : '',
			wp_kses_post( $item_text )
		);
	} else {
		$text_content = wp_kses_post( $item_text );
	}

	$items_html .= sprintf(
		'<li class="sgs-icon-list__item"><span class="sgs-icon-list__icon"%s aria-hidden="true">%s</span><span class="sgs-icon-list__text"%s>%s</span></li>',
		$icon_style,
		$svg,
		$text_style,
		$text_content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
	);
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $items_html built with esc_url/wp_kses_post above.
printf(
	'<ul %s>%s</ul>',
	$wrapper_attributes,
	$items_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
