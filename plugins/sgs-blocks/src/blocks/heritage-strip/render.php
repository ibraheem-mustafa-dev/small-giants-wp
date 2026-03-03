<?php
/**
 * Server-side render for the SGS Heritage Strip block.
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

$label            = $attributes['label'] ?? '';
$layout           = $attributes['layout'] ?? 'image-text-image';
$headline         = $attributes['headline'] ?? '';
$body             = $attributes['body'] ?? '';
$image_left       = $attributes['imageLeft'] ?? null;
$image_right      = $attributes['imageRight'] ?? null;
$headline_colour  = $attributes['headlineColour'] ?? '';
$headline_size    = $attributes['headlineFontSize'] ?? '';
$body_colour      = $attributes['bodyColour'] ?? '';
$body_size        = $attributes['bodyFontSize'] ?? '';

// Determine which images to show based on layout.
$show_left  = in_array( $layout, array( 'image-text-image', 'image-text' ), true );
$show_right = in_array( $layout, array( 'image-text-image', 'text-image' ), true );

$classes = array(
	'sgs-heritage-strip',
	'sgs-heritage-strip--' . esc_attr( $layout ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build inline style strings for headline and body text.
$headline_styles = array();
if ( $headline_colour ) {
	$headline_styles[] = 'color:' . sgs_colour_value( $headline_colour );
}
if ( $headline_size ) {
	$headline_styles[] = 'font-size:' . sgs_font_size_value( $headline_size );
}
$headline_style_attr = $headline_styles ? ' style="' . implode( ';', $headline_styles ) . '"' : '';

$body_styles = array();
if ( $body_colour ) {
	$body_styles[] = 'color:' . sgs_colour_value( $body_colour );
}
if ( $body_size ) {
	$body_styles[] = 'font-size:' . sgs_font_size_value( $body_size );
}
$body_style_attr = $body_styles ? ' style="' . implode( ';', $body_styles ) . '"' : '';

// Build left image.
$left_image_html = '';
if ( $show_left && ! empty( $image_left['url'] ) ) {
	$img_id = isset( $image_left['id'] ) ? absint( $image_left['id'] ) : 0;
	$img    = sgs_responsive_image(
		$img_id,
		$image_left['url'],
		$image_left['alt'] ?? '',
		'large',
		array(
			'class'   => 'sgs-heritage-strip__img',
			'loading' => 'lazy',
		)
	);
	$left_image_html = '<div class="sgs-heritage-strip__image sgs-heritage-strip__image--left">' . $img . '</div>';
}

// Build right image.
$right_image_html = '';
if ( $show_right && ! empty( $image_right['url'] ) ) {
	$img_id = isset( $image_right['id'] ) ? absint( $image_right['id'] ) : 0;
	$img    = sgs_responsive_image(
		$img_id,
		$image_right['url'],
		$image_right['alt'] ?? '',
		'large',
		array(
			'class'   => 'sgs-heritage-strip__img',
			'loading' => 'lazy',
		)
	);
	$right_image_html = '<div class="sgs-heritage-strip__image sgs-heritage-strip__image--right">' . $img . '</div>';
}

// Build content area.
$content_html = '<div class="sgs-heritage-strip__content">';

if ( $label ) {
	$content_html .= sprintf(
		'<p class="sgs-heritage-strip__label">%s</p>',
		esc_html( $label )
	);
}

if ( $headline ) {
	$content_html .= sprintf(
		'<h2 class="sgs-heritage-strip__headline"%s>%s</h2>',
		$headline_style_attr,
		wp_kses_post( $headline )
	);
}

if ( $body ) {
	$content_html .= sprintf(
		'<div class="sgs-heritage-strip__body"%s>%s</div>',
		$body_style_attr,
		wp_kses_post( $body )
	);
}

$content_html .= '</div>';

printf(
	'<section %s>%s%s%s</section>',
	$wrapper_attributes,
	$left_image_html,
	$content_html,
	$right_image_html
);
