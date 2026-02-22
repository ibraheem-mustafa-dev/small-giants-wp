<?php
/**
 * Server-side render for the SGS Decorative Image block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults.
$image_id        = $attributes['imageId'] ?? null;
$image_url       = $attributes['imageUrl'] ?? '';
$image_alt       = $attributes['imageAlt'] ?? '';
$effect          = $attributes['effect'] ?? 'none';
$mask_shape      = $attributes['maskShape'] ?? 'none';
$overlay_colour  = $attributes['overlayColour'] ?? '';
$overlay_opacity = $attributes['overlayOpacity'] ?? 0;
$width           = $attributes['width'] ?? '100%';
$height          = $attributes['height'] ?? 'auto';
$object_fit      = $attributes['objectFit'] ?? 'cover';

// Don't render if no image.
if ( ! $image_url ) {
	return;
}

// Build wrapper classes.
$classes = array(
	'sgs-decorative-image',
);
if ( 'none' !== $effect ) {
	$classes[] = 'sgs-decorative-image--' . esc_attr( $effect );
}
if ( 'none' !== $mask_shape ) {
	$classes[] = 'sgs-decorative-image--mask-' . esc_attr( $mask_shape );
}

// Build wrapper data attributes for parallax effect.
$data_attrs = '';
if ( 'parallax' === $effect ) {
	$data_attrs .= ' data-parallax="true"';
}

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => implode( ' ', $classes ),
) );

// Build image styles.
$image_styles = array();
if ( $width ) {
	$image_styles[] = 'width:' . esc_attr( $width );
}
if ( $height ) {
	$image_styles[] = 'height:' . esc_attr( $height );
}
if ( $object_fit ) {
	$image_styles[] = 'object-fit:' . esc_attr( $object_fit );
}
$image_style_attr = $image_styles ? ' style="' . implode( ';', $image_styles ) . '"' : '';

// Build overlay styles.
$overlay_html = '';
if ( $overlay_opacity > 0 ) {
	$overlay_styles = array();
	if ( $overlay_colour ) {
		$overlay_styles[] = 'background-color:' . sgs_colour_value( $overlay_colour );
	}
	$overlay_styles[] = 'opacity:' . ( (float) $overlay_opacity / 100 );
	$overlay_style_attr = ' style="' . implode( ';', $overlay_styles ) . '"';

	$overlay_html = sprintf(
		'<div class="sgs-decorative-image__overlay"%s aria-hidden="true"></div>',
		$overlay_style_attr
	);
}

// Render.
printf(
	'<div %s%s><div class="sgs-decorative-image__wrapper"><img src="%s" alt="" class="sgs-decorative-image__img"%s aria-hidden="true" />%s</div></div>',
	$wrapper_attributes,
	$data_attrs,
	esc_url( $image_url ),
	$image_style_attr,
	$overlay_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
);
