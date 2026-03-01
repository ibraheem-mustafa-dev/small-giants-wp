<?php
/**
 * Server-side render for the SGS Card Grid block.
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

$variant         = $attributes['variant'] ?? 'card';
$items           = $attributes['items'] ?? array();
$columns         = (int) ( $attributes['columns'] ?? 3 );
$columns_mobile  = (int) ( $attributes['columnsMobile'] ?? 1 );
$columns_tablet  = (int) ( $attributes['columnsTablet'] ?? 2 );
$gap             = $attributes['gap'] ?? '30';
$aspect_ratio    = $attributes['aspectRatio'] ?? '16/10';
$hover_effect    = $attributes['hoverEffect'] ?? 'zoom';
$title_colour    = $attributes['titleColour'] ?? '';
$subtitle_colour = $attributes['subtitleColour'] ?? '';
$hover_bg        = $attributes['hoverBackgroundColour'] ?? '';
$hover_text      = $attributes['hoverTextColour'] ?? '';
$hover_border    = $attributes['hoverBorderColour'] ?? '';

if ( empty( $items ) ) {
	return;
}

// Build CSS custom properties for the grid layout and hover states.
$grid_styles = array(
	'--sgs-card-grid-columns:' . $columns,
	'--sgs-card-grid-columns-mobile:' . $columns_mobile,
	'--sgs-card-grid-columns-tablet:' . $columns_tablet,
	'--sgs-card-grid-gap:var(--wp--preset--spacing--' . esc_attr( $gap ) . ')',
	'--sgs-card-grid-aspect:' . esc_attr( $aspect_ratio ),
);

if ( $hover_bg ) {
	$grid_styles[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_bg );
}
if ( $hover_text ) {
	$grid_styles[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text );
}
if ( $hover_border ) {
	$grid_styles[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border );
}

$classes = array(
	'sgs-card-grid',
	'sgs-card-grid--' . esc_attr( $variant ),
	'sgs-card-grid--hover-' . esc_attr( $hover_effect ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => implode( ';', $grid_styles ),
	)
);

// Inline style attributes for title and subtitle text.
$title_style_attr    = $title_colour ? ' style="color:' . sgs_colour_value( $title_colour ) . '"' : '';
$subtitle_style_attr = $subtitle_colour ? ' style="color:' . sgs_colour_value( $subtitle_colour ) . '"' : '';

// Build each card item.
$items_html = '';
foreach ( $items as $item ) {
	$has_link = ! empty( $item['link'] );
	$tag      = $has_link ? 'a' : 'div';

	// Build opening tag attributes.
	if ( $has_link ) {
		$tag_open = sprintf(
			'<a href="%s" class="sgs-card-grid__item">',
			esc_url( $item['link'] )
		);
	} else {
		$tag_open = '<div class="sgs-card-grid__item">';
	}
	$tag_close = '</' . $tag . '>';

	// Image — use sgs_responsive_image() for srcset where an attachment ID is available.
	$image_html = '';
	if ( ! empty( $item['image']['url'] ) ) {
		$img_id  = isset( $item['image']['id'] ) ? absint( $item['image']['id'] ) : 0;
		$img_alt = $item['image']['alt'] ?? '';

		$image_html = sgs_responsive_image(
			$img_id,
			$item['image']['url'],
			$img_alt,
			'large',
			array(
				'class'   => 'sgs-card-grid__image',
				'loading' => 'lazy',
			)
		);
	}

	// Overlay inner content (overlay variant only).
	$overlay_html = '';
	if ( 'overlay' === $variant ) {
		$overlay_inner = '';
		if ( ! empty( $item['title'] ) ) {
			$overlay_inner .= sprintf(
				'<span class="sgs-card-grid__title"%s>%s</span>',
				$title_style_attr,
				esc_html( $item['title'] )
			);
		}
		if ( ! empty( $item['subtitle'] ) ) {
			$overlay_inner .= sprintf(
				'<span class="sgs-card-grid__subtitle"%s>%s</span>',
				$subtitle_style_attr,
				esc_html( $item['subtitle'] )
			);
		}
		if ( $overlay_inner ) {
			$overlay_html = '<div class="sgs-card-grid__overlay">' . $overlay_inner . '</div>';
		}
	}

	// Card body (card variant only).
	$body_html = '';
	if ( 'card' === $variant ) {
		$body_inner = '';
		if ( ! empty( $item['title'] ) ) {
			$body_inner .= sprintf(
				'<h3 class="sgs-card-grid__title"%s>%s</h3>',
				$title_style_attr,
				esc_html( $item['title'] )
			);
		}
		if ( ! empty( $item['subtitle'] ) ) {
			$body_inner .= sprintf(
				'<p class="sgs-card-grid__subtitle"%s>%s</p>',
				$subtitle_style_attr,
				esc_html( $item['subtitle'] )
			);
		}
		if ( ! empty( $item['badge'] ) && ! empty( $item['badgeVariant'] ) ) {
			$body_inner .= sprintf(
				'<span class="sgs-card-grid__badge sgs-card-grid__badge--%s">%s</span>',
				esc_attr( $item['badgeVariant'] ),
				esc_html( $item['badge'] )
			);
		}
		if ( $body_inner ) {
			$body_html = '<div class="sgs-card-grid__body">' . $body_inner . '</div>';
		}
	}

	$items_html .= sprintf(
		'%s<div class="sgs-card-grid__image-wrap">%s%s</div>%s%s',
		$tag_open,
		$image_html,
		$overlay_html,
		$body_html,
		$tag_close
	);
}

printf( '<div %s>%s</div>', $wrapper_attributes, $items_html );
