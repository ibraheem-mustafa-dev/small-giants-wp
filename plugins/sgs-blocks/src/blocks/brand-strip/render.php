<?php
/**
 * Server-side render for the SGS Brand Strip block.
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
$logos        = $attributes['logos'] ?? array();
$scrolling    = $attributes['scrolling'] ?? false;
$scroll_speed = $attributes['scrollSpeed'] ?? 'medium';
$greyscale    = $attributes['greyscale'] ?? true;
$max_height   = $attributes['maxHeight'] ?? 48;

// Map scroll speed to CSS animation duration.
$speed_map = array(
	'slow'   => '40s',
	'medium' => '25s',
	'fast'   => '15s',
);
$animation_speed = $speed_map[ $scroll_speed ] ?? '25s';

// Build wrapper classes.
$classes = array(
	'sgs-brand-strip',
);
if ( $greyscale ) {
	$classes[] = 'sgs-brand-strip--greyscale';
}
if ( $scrolling ) {
	$classes[] = 'sgs-brand-strip--scrolling';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build track styles.
$track_styles = array(
	'--sgs-logo-max-height:' . absint( $max_height ) . 'px',
	'--sgs-scroll-speed:' . esc_attr( $animation_speed ),
);
$track_style_attr = ' style="' . implode( ';', $track_styles ) . '"';

// Build logo items HTML.
$logos_html = '';
if ( ! empty( $logos ) ) {
	foreach ( $logos as $logo ) {
		// Handle both shapes: {id, url, alt} (homepage content) and {image: {url}, alt} (save.js).
		$logo_url = '';
		if ( isset( $logo['image']['url'] ) ) {
			$logo_url = $logo['image']['url'];
		} elseif ( isset( $logo['url'] ) ) {
			$logo_url = $logo['url'];
		}

		$logo_alt = $logo['alt'] ?? '';

		if ( ! $logo_url ) {
			continue;
		}

		// H13/H14: use responsive image helper for srcset + explicit dimensions.
		$logo_id = isset( $logo['id'] ) ? absint( $logo['id'] ) : ( isset( $logo['image']['id'] ) ? absint( $logo['image']['id'] ) : 0 );
		$logo_attrs = [
			'class'   => 'sgs-brand-strip__logo',
			'loading' => 'lazy',
			'style'   => 'max-height:' . absint( $max_height ) . 'px',
		];
		$logo_w = isset( $logo['image']['width'] ) ? absint( $logo['image']['width'] ) : 0;
		$logo_h = isset( $logo['image']['height'] ) ? absint( $logo['image']['height'] ) : 0;
		if ( $logo_w ) {
			$logo_attrs['width'] = $logo_w;
		}
		if ( $logo_h ) {
			$logo_attrs['height'] = $logo_h;
		}

		$logos_html .= '<div class="sgs-brand-strip__item">';
		$logos_html .= sgs_responsive_image( $logo_id, $logo_url, $logo_alt, 'medium', $logo_attrs );
		$logos_html .= '</div>';
	}

	// M10: If scrolling is enabled, duplicate logos for seamless infinite scroll.
	// The clones are purely decorative — hide them from screen readers so assistive
	// technology does not announce the same logos twice.
	if ( $scrolling ) {
		$cloned = preg_replace(
			'/<div class="sgs-brand-strip__item">/',
			'<div class="sgs-brand-strip__item" aria-hidden="true">',
			$logos_html
		);
		$logos_html .= $cloned;
	}
}

// Output.
printf(
	'<div %s><div class="sgs-brand-strip__track"%s>%s</div></div>',
	$wrapper_attributes,
	$track_style_attr,
	$logos_html
);
