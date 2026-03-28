<?php
/**
 * Server-side render for the SGS Info Box block.
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
$icon                    = $attributes['icon'] ?? 'star-filled';
$heading                 = $attributes['heading'] ?? '';
$description             = $attributes['description'] ?? '';
$link                    = $attributes['link'] ?? '';
$link_opens_new_tab      = $attributes['linkOpensNewTab'] ?? false;
$icon_colour             = $attributes['iconColour'] ?? 'primary';
$icon_background_colour  = $attributes['iconBackgroundColour'] ?? 'accent-light';
$icon_size               = $attributes['iconSize'] ?? 'medium';
$icon_size_tablet        = $attributes['iconSizeTablet'] ?? '';
$icon_size_mobile        = $attributes['iconSizeMobile'] ?? '';
$heading_colour          = $attributes['headingColour'] ?? '';
$heading_font_size       = $attributes['headingFontSize'] ?? '';
$description_colour      = $attributes['descriptionColour'] ?? '';
$card_style              = $attributes['cardStyle'] ?? 'elevated';
$hover_effect            = $attributes['hoverEffect'] ?? 'lift';

$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';

// Build wrapper styles.
$wrapper_styles = array();

// Transition custom properties — consumed by CSS vars on the block and its children.
$wrapper_styles = array_merge( $wrapper_styles, sgs_transition_vars( $attributes ) );

if ( $hover_background_colour ) {
	$wrapper_styles[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_background_colour );
}
if ( $hover_text_colour ) {
	$wrapper_styles[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$wrapper_styles[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}

// Valid icon size slugs — used to sanitise tablet/mobile overrides.
$valid_icon_sizes = array( 'small', 'medium', 'large' );

// Build wrapper classes.
$classes = array(
	'sgs-info-box',
	'sgs-info-box--' . esc_attr( $card_style ),
	'sgs-info-box--hover-' . esc_attr( $hover_effect ),
);

$wrapper_attr_args = array(
	'class' => implode( ' ', $classes ),
);
if ( $wrapper_styles ) {
	$wrapper_attr_args['style'] = implode( ';', $wrapper_styles ) . ';';
}
// Responsive icon size overrides — consumed by CSS attribute selectors in style.css,
// avoiding per-block scoped <style> tags with hardcoded pixel values.
if ( $icon_size_tablet && in_array( $icon_size_tablet, $valid_icon_sizes, true ) ) {
	$wrapper_attr_args['data-icon-size-tablet'] = $icon_size_tablet;
}
if ( $icon_size_mobile && in_array( $icon_size_mobile, $valid_icon_sizes, true ) ) {
	$wrapper_attr_args['data-icon-size-mobile'] = $icon_size_mobile;
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_attr_args );

// Build icon styles.
$icon_styles = array();
if ( $icon_colour ) {
	$icon_styles[] = 'color:' . sgs_colour_value( $icon_colour );
}
if ( $icon_background_colour ) {
	$icon_styles[] = 'background-color:' . sgs_colour_value( $icon_background_colour );
}
$icon_style_attr = $icon_styles ? ' style="' . implode( ';', $icon_styles ) . '"' : '';

// Build heading styles.
$heading_styles = array();
if ( $heading_colour ) {
	$heading_styles[] = 'color:' . sgs_colour_value( $heading_colour );
}
if ( $heading_font_size ) {
	$heading_styles[] = 'font-size:' . sgs_font_size_value( $heading_font_size );
}
$heading_style_attr = $heading_styles ? ' style="' . implode( ';', $heading_styles ) . '"' : '';

// Build description styles.
$description_style_attr = '';
if ( $description_colour ) {
	$description_style_attr = ' style="color:' . sgs_colour_value( $description_colour ) . '"';
}

// Load Lucide icon from generated PHP map (1900+ icons).
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
$icon_svg = sgs_get_lucide_icon( $icon );

// Build icon HTML.
$icon_html = sprintf(
	'<span class="sgs-info-box__icon sgs-info-box__icon--%s"%s aria-hidden="true">%s</span>',
	esc_attr( $icon_size ),
	$icon_style_attr,
	$icon_svg
);

// Build heading HTML.
$heading_html = sprintf(
	'<h3 class="sgs-info-box__heading"%s>%s</h3>',
	$heading_style_attr,
	wp_kses_post( $heading )
);

// Build description HTML.
$description_html = sprintf(
	'<p class="sgs-info-box__description"%s>%s</p>',
	$description_style_attr,
	wp_kses_post( $description )
);

// Build link wrapper if URL is set.
$link_open  = '';
$link_close = '';
if ( $link ) {
	$target = $link_opens_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
	$link_open = sprintf(
		'<a href="%s" class="sgs-info-box__link"%s>',
		esc_url( $link ),
		$target
	);
	$link_close = '</a>';
}

// Output.
printf(
	'<div %s>%s%s%s%s%s</div>',
	$wrapper_attributes,
	$link_open,
	$icon_html,
	$heading_html,
	$description_html,
	$link_close
);
