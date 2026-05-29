<?php
/**
 * Server-side render for the SGS Decorative Image block.
 *
 * Outputs an absolute-positioned image with inline styles for positioning,
 * rotation, opacity, and z-index. Supports responsive overrides and parallax.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults.
$image_id            = $attributes['imageId'] ?? null;
$image_url           = $attributes['imageUrl'] ?? '';
$image_alt           = $attributes['imageAlt'] ?? '';

// decorMedia (added 2026-05-05) is the unified image-or-video slot. For
// back-compat, when only the legacy imageUrl is set, synthesise a decorMedia
// object so downstream rendering can use sgs_render_media() for video while
// keeping the rich image pipeline (srcset via sgs_responsive_image) for images.
$decor_media         = $attributes['decorMedia'] ?? null;
if ( empty( $decor_media ) && ! empty( $image_url ) ) {
	$decor_media = array(
		'url'  => $image_url,
		'type' => 'image',
		'id'   => $image_id ? absint( $image_id ) : 0,
		'alt'  => (string) $image_alt,
		'mime' => 'image/jpeg',
	);
}
// When decorMedia carries an image and the legacy imageUrl is empty, hydrate
// the legacy fields so the existing srcset/responsive pipeline still runs.
if ( empty( $image_url ) && ! empty( $decor_media['url'] ) && 'image' === ( $decor_media['type'] ?? 'image' ) ) {
	$image_url = (string) $decor_media['url'];
	$image_id  = isset( $decor_media['id'] ) ? absint( $decor_media['id'] ) : 0;
	$image_alt = isset( $decor_media['alt'] ) ? (string) $decor_media['alt'] : '';
}
$position_x          = $attributes['positionX'] ?? 50;
$position_y          = $attributes['positionY'] ?? 50;
$width               = $attributes['width'] ?? 200;
$max_width_percent   = $attributes['maxWidthPercent'] ?? 20;
$rotation            = $attributes['rotation'] ?? 0;
$opacity             = $attributes['opacity'] ?? 85;
$z_index             = $attributes['zIndex'] ?? 1;
$flip_x              = $attributes['flipX'] ?? false;
$parallax_strength   = $attributes['parallaxStrength'] ?? 0;
$fade_on_scroll      = (bool) ( $attributes['fadeOnScroll'] ?? false );
$overflow            = $attributes['overflow'] ?? 'visible';
$path_draw           = (bool) ( $attributes['pathDrawOnScroll'] ?? false );
$path_draw_duration  = absint( $attributes['pathDrawDurationMs'] ?? 1500 );
$path_draw_offset    = absint( $attributes['pathDrawTriggerOffset'] ?? 20 );
$allowed_easings     = array( 'ease-out', 'ease-in-out', 'linear' );
$path_draw_easing    = in_array( $attributes['pathDrawEasing'] ?? 'ease-out', $allowed_easings, true )
	? $attributes['pathDrawEasing']
	: 'ease-out';

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

// Don't render if no media.
if ( empty( $decor_media['url'] ) && ! $image_url ) {
	return;
}

// Build inline styles for desktop (pointer-events moved to style.css).
$styles = array(
	'position: absolute',
	'left: ' . esc_attr( $position_x ) . '%',
	'top: ' . esc_attr( $position_y ) . '%',
	'width: ' . esc_attr( $width ) . 'px',
	'max-width: ' . esc_attr( $max_width_percent ) . '%',
	'opacity: ' . esc_attr( $opacity / 100 ),
	'z-index: ' . esc_attr( $z_index ),
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

// Build data attributes — passed directly through $img_attrs for proper escaping.
$img_attrs = array(
	'class'       => 'sgs-decorative-image',
	'style'       => $style_attr,
	'aria-hidden' => 'true',
	'role'        => 'presentation',
	'alt'         => '',
	'loading'     => 'lazy',
	'decoding'    => 'async',
);

if ( $parallax_strength > 0 ) {
	$img_attrs['data-parallax'] = esc_attr( $parallax_strength );
}
if ( $fade_on_scroll ) {
	$img_attrs['data-fade-on-scroll'] = 'true';
}
if ( $path_draw ) {
	$img_attrs['data-sgs-path-draw']          = 'true';
	$img_attrs['data-sgs-path-draw-duration'] = esc_attr( $path_draw_duration );
	$img_attrs['data-sgs-path-draw-offset']   = esc_attr( $path_draw_offset );
	$img_attrs['data-sgs-path-draw-easing']   = esc_attr( $path_draw_easing );
}
if ( $hide_on_tablet ) {
	$img_attrs['data-hide-tablet'] = 'true';
}
if ( $hide_on_mobile ) {
	$img_attrs['data-hide-mobile'] = 'true';
}

// Responsive overrides via data attributes (consumed by view.js).
if ( null !== $position_x_tablet ) {
	$img_attrs['data-position-x-tablet'] = esc_attr( $position_x_tablet );
}
if ( null !== $position_y_tablet ) {
	$img_attrs['data-position-y-tablet'] = esc_attr( $position_y_tablet );
}
if ( null !== $width_tablet ) {
	$img_attrs['data-width-tablet'] = esc_attr( $width_tablet );
}
if ( null !== $rotation_tablet ) {
	$img_attrs['data-rotation-tablet'] = esc_attr( $rotation_tablet );
}

if ( null !== $position_x_mobile ) {
	$img_attrs['data-position-x-mobile'] = esc_attr( $position_x_mobile );
}
if ( null !== $position_y_mobile ) {
	$img_attrs['data-position-y-mobile'] = esc_attr( $position_y_mobile );
}
if ( null !== $width_mobile ) {
	$img_attrs['data-width-mobile'] = esc_attr( $width_mobile );
}
if ( null !== $rotation_mobile ) {
	$img_attrs['data-rotation-mobile'] = esc_attr( $rotation_mobile );
}

// Video branch: when decorMedia is a video, defer to sgs_render_media() and
// wrap it in a positioned span so the existing position/transform/data-*
// pipeline (parallax, fade, hide-on-*, responsive overrides) still applies.
$is_video = ! empty( $decor_media ) && isset( $decor_media['type'] ) && 'video' === $decor_media['type'];

if ( $is_video ) {
	$video_html = sgs_render_media( $decor_media, 'sgs/decorative-image' );
	if ( '' === $video_html ) {
		return;
	}

	// Build wrapper attributes mirroring the image data-* pipeline.
	$wrapper_attrs = array(
		'class'       => 'sgs-decorative-image sgs-decorative-image--video',
		'style'       => $style_attr,
		'aria-hidden' => 'true',
		'role'        => 'presentation',
	);
	foreach ( $img_attrs as $key => $val ) {
		if ( 0 === strpos( $key, 'data-' ) ) {
			$wrapper_attrs[ $key ] = $val;
		}
	}

	$wrapper_attr_strs = array();
	foreach ( $wrapper_attrs as $key => $val ) {
		$wrapper_attr_strs[] = sprintf( '%s="%s"', esc_attr( $key ), esc_attr( $val ) );
	}

	printf(
		'<span %1$s>%2$s</span>',
		implode( ' ', $wrapper_attr_strs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each attr already escaped above.
		$video_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_render_media() escapes attributes internally.
	);
	return;
}

// Image branch: render using sgs_responsive_image helper — all attributes
// escaped via $img_attrs.
echo sgs_responsive_image(
	$image_id ? absint( $image_id ) : 0,
	$image_url,
	'', // Empty alt for decorative.
	'large',
	$img_attrs
); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_responsive_image() escapes all attributes internally.
