<?php
/**
 * Server-side render for the SGS Decorative Image block.
 *
 * Outputs an absolute-positioned image with inline styles for positioning,
 * rotation, opacity, and z-index. Supports responsive overrides and parallax.
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

// Extract attributes with defaults.
$image_id            = $attributes['imageId'] ?? null;
$image_url           = $attributes['imageUrl'] ?? '';
$position_x          = $attributes['positionX'] ?? 50;
$position_y          = $attributes['positionY'] ?? 50;
$width               = $attributes['width'] ?? 200;
$max_width_percent   = $attributes['maxWidthPercent'] ?? 20;
$rotation            = $attributes['rotation'] ?? 0;
$opacity             = $attributes['opacity'] ?? 85;
$z_index             = $attributes['zIndex'] ?? 1;
$flip_x              = $attributes['flipX'] ?? false;
$parallax_strength   = $attributes['parallaxStrength'] ?? 0;
$overflow            = $attributes['overflow'] ?? 'visible';

// Responsive overrides.
$position_x_tablet   = $attributes['positionXTablet'] ?? null;
$position_y_tablet   = $attributes['positionYTablet'] ?? null;
$width_tablet        = $attributes['widthTablet'] ?? null;
$rotation_tablet     = $attributes['rotationTablet'] ?? null;
$hide_on_tablet      = $attributes['hideOnTablet'] ?? false;

$position_x_mobile   = $attributes['positionXMobile'] ?? null;
$position_y_mobile   = $attributes['positionYMobile'] ?? null;
$width_mobile        = $attributes['widthMobile'] ?? null;
$rotation_mobile     = $attributes['rotationMobile'] ?? null;
$hide_on_mobile      = $attributes['hideOnMobile'] ?? false;

// Don't render if no image.
if ( ! $image_url ) {
	return;
}

// Build inline styles for desktop.
$styles = array(
	'position: absolute',
	'left: ' . esc_attr( $position_x ) . '%',
	'top: ' . esc_attr( $position_y ) . '%',
	'width: ' . esc_attr( $width ) . 'px',
	'max-width: ' . esc_attr( $max_width_percent ) . '%',
	'opacity: ' . esc_attr( $opacity / 100 ),
	'z-index: ' . esc_attr( $z_index ),
	'pointer-events: none',
);

// Build transform.
$transforms = array(
	'translate(-50%, -50%)',
);
if ( 0 !== $rotation ) {
	$transforms[] = 'rotate(' . esc_attr( $rotation ) . 'deg)';
}
if ( $flip_x ) {
	$transforms[] = 'scaleX(-1)';
}
$styles[] = 'transform: ' . implode( ' ', $transforms );

$style_attr = implode( '; ', $styles );

// Build data attributes.
$data_attrs = array();
if ( $parallax_strength > 0 ) {
	$data_attrs['data-parallax'] = esc_attr( $parallax_strength );
}
if ( $hide_on_tablet ) {
	$data_attrs['data-hide-tablet'] = 'true';
}
if ( $hide_on_mobile ) {
	$data_attrs['data-hide-mobile'] = 'true';
}

// Responsive overrides via data attributes for CSS.
if ( null !== $position_x_tablet ) {
	$data_attrs['data-position-x-tablet'] = esc_attr( $position_x_tablet );
}
if ( null !== $position_y_tablet ) {
	$data_attrs['data-position-y-tablet'] = esc_attr( $position_y_tablet );
}
if ( null !== $width_tablet ) {
	$data_attrs['data-width-tablet'] = esc_attr( $width_tablet );
}
if ( null !== $rotation_tablet ) {
	$data_attrs['data-rotation-tablet'] = esc_attr( $rotation_tablet );
}

if ( null !== $position_x_mobile ) {
	$data_attrs['data-position-x-mobile'] = esc_attr( $position_x_mobile );
}
if ( null !== $position_y_mobile ) {
	$data_attrs['data-position-y-mobile'] = esc_attr( $position_y_mobile );
}
if ( null !== $width_mobile ) {
	$data_attrs['data-width-mobile'] = esc_attr( $width_mobile );
}
if ( null !== $rotation_mobile ) {
	$data_attrs['data-rotation-mobile'] = esc_attr( $rotation_mobile );
}

// Build data attribute string.
$data_attr_str = '';
foreach ( $data_attrs as $key => $value ) {
	$data_attr_str .= ' ' . $key . '="' . $value . '"';
}

// Render using sgs_responsive_image helper.
$img_attrs = array(
	'class'       => 'sgs-decorative-image',
	'style'       => $style_attr,
	'aria-hidden' => 'true',
	'role'        => 'presentation',
	'alt'         => '', // Always empty for decorative images.
	'loading'     => 'lazy',
	'decoding'    => 'async',
);

$img_html = sgs_responsive_image(
	$image_id ? absint( $image_id ) : 0,
	$image_url,
	'', // Empty alt for decorative.
	'large',
	$img_attrs
);

// Output with data attributes.
echo str_replace( 'class="sgs-decorative-image"', 'class="sgs-decorative-image"' . $data_attr_str, $img_html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped - sgs_responsive_image() escapes internally.
