<?php
/**
 * Server-side render for the SGS Trust Badges block.
 *
 * Renders a horizontal row of icon-in-circle trust badges.
 * Items with `pending: true` are hidden on the frontend via the `hidden` HTML
 * attribute — they remain visible in the editor (greyed out with a "Pending" pill)
 * so the editor can manage them without losing the slot. When the cert/credential
 * lands, flip `pending` to false in the block inspector to make it visible.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$items            = $attributes['items'] ?? array();
$icon_circle_size = absint( $attributes['iconCircleSize'] ?? 44 );
$icon_circle_bg   = $attributes['iconCircleBackground'] ?? 'surface';
$icon_colour      = $attributes['iconColour'] ?? 'primary-dark';
$text_colour      = $attributes['textColour'] ?? 'text';
$columns          = absint( $attributes['columns'] ?? 4 );
$gap_slug         = preg_replace( '/[^0-9]/', '', $attributes['gap'] ?? '20' );

// Clamp circle size to sane bounds.
$icon_circle_size = max( 36, min( 64, $icon_circle_size ) );

// Resolve colour values.
$circle_bg_value   = sgs_colour_value( $icon_circle_bg );
$icon_colour_value = sgs_colour_value( $icon_colour );
$text_colour_value = sgs_colour_value( $text_colour );

// Build CSS custom properties for the wrapper.
$styles = array();
if ( $gap_slug ) {
	$styles[] = '--sgs-trust-badges-gap: var(--wp--preset--spacing--' . $gap_slug . ')';
}
if ( 44 !== $icon_circle_size ) {
	$styles[] = '--sgs-trust-badge-circle-size: ' . $icon_circle_size . 'px';
}
if ( $circle_bg_value ) {
	$styles[] = '--sgs-trust-badge-circle-bg: ' . $circle_bg_value;
}
if ( $icon_colour_value ) {
	$styles[] = '--sgs-trust-badge-icon-colour: ' . $icon_colour_value;
}
if ( $text_colour_value ) {
	$styles[] = '--sgs-trust-badge-text-colour: ' . $text_colour_value;
}

// Count visible items (non-pending).
$visible_count = 0;
foreach ( $items as $item ) {
	if ( empty( $item['pending'] ) ) {
		++$visible_count;
	}
}

// Use a data attribute for the column count so the CSS can drive the grid
// without hardcoded breakpoints per instance.
$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'        => 'sgs-trust-badges',
		'style'        => implode( ';', $styles ),
		'data-columns' => $columns,
		'aria-label'   => __( 'Trust signals', 'sgs-blocks' ),
	)
);

// Lucide icon name map — editor slug → Lucide name.
$lucide_map = array(
	'home'         => 'home',
	'check'        => 'check',
	'truck'        => 'truck',
	'star'         => 'star',
	'moon'         => 'moon',
	'shield-check' => 'shield-check',
	'award'        => 'award',
	'heart'        => 'heart',
	'leaf'         => 'leaf',
	'zap'          => 'zap',
	'clock'        => 'clock',
	'package'      => 'package',
	'users'        => 'users',
	'globe'        => 'globe',
	'badge-check'  => 'badge-check',
	'thumbs-up'    => 'thumbs-up',
	'flame'        => 'flame',
	'gift'         => 'gift',
	'baby'         => 'baby',
	'milk'         => 'milk',
);

$items_html = '';
foreach ( $items as $item ) {
	$is_pending  = ! empty( $item['pending'] );
	$icon_slug   = isset( $item['icon'] ) ? sanitize_key( $item['icon'] ) : 'check';
	$label       = isset( $item['label'] ) ? sanitize_text_field( $item['label'] ) : '';
	$lucide_name = $lucide_map[ $icon_slug ] ?? 'check';
	$svg         = sgs_get_lucide_icon( $lucide_name );

	$item_attrs = '';
	if ( $is_pending ) {
		// `hidden` hides the badge on the frontend. CSS `:not([hidden])` guard
		// in the stylesheet prevents layout shifts from empty grid slots.
		$item_attrs = ' hidden data-pending="true"';
	}

	$items_html .= sprintf(
		'<div class="sgs-trust-badges__badge" %s>' .
		'<span class="sgs-trust-badges__circle" aria-hidden="true">%s</span>' .
		'<span class="sgs-trust-badges__label">%s</span>' .
		'</div>',
		$item_attrs,
		$svg,
		esc_html( $label )
	);
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; items built with esc_html/sgs_get_lucide_icon above.
printf(
	'<div %s>%s</div>',
	$wrapper_attributes,
	$items_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
