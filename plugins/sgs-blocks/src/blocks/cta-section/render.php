<?php
/**
 * Server-side render for the SGS CTA Section block.
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
$headline                 = $attributes['headline'] ?? '';
$body                     = $attributes['body'] ?? '';
$ribbon                   = isset( $attributes['ribbon'] ) ? sanitize_text_field( $attributes['ribbon'] ) : '';
$layout                   = $attributes['layout'] ?? 'centred';
$headline_colour          = $attributes['headlineColour'] ?? '';
$body_colour              = $attributes['bodyColour'] ?? '';
$body_font_size           = $attributes['bodyFontSize'] ?? '';
$body_font_size_tablet    = $attributes['bodyFontSizeTablet'] ?? '';
$body_font_size_mobile    = $attributes['bodyFontSizeMobile'] ?? '';
$background_image         = $attributes['backgroundImage'] ?? null;
$background_image_opacity = $attributes['backgroundImageOpacity'] ?? 30;
$stats                    = $attributes['stats'] ?? array();

$hover_background_colour = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour       = $attributes['hoverTextColour'] ?? '';
$hover_border_colour     = $attributes['hoverBorderColour'] ?? '';
$transition_duration     = $attributes['transitionDuration'] ?? '300';
$transition_easing       = $attributes['transitionEasing'] ?? 'ease-in-out';

$allowed_gradient_presets = array( '', 'primary-fade', 'accent-glow', 'dark-radial', 'mesh-soft' );
$gradient_preset          = in_array( $attributes['gradientPreset'] ?? '', $allowed_gradient_presets, true )
	? sanitize_key( $attributes['gradientPreset'] ?? '' )
	: '';

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

if ( ! empty( $background_image['url'] ) ) {
	$wrapper_styles[] = 'background-image:url(' . esc_url( $background_image['url'] ) . ')';
	$wrapper_styles[] = 'background-size:cover';
	$wrapper_styles[] = 'background-position:center';
}

// Build wrapper classes.
$classes = array(
	'sgs-cta-section',
	'sgs-cta-section--' . esc_attr( $layout ),
);

if ( $gradient_preset ) {
	$classes[] = 'sgs-cta-section--gradient-' . esc_attr( $gradient_preset );
}

// Build responsive body font-size CSS.
$responsive_css = '';
if ( $body_font_size_tablet || $body_font_size_mobile ) {
	$uid       = 'sgs-cta-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
	$classes[] = $uid;

	if ( $body_font_size_tablet ) {
		$responsive_css .= '@media (max-width:1023px){.' . $uid . ' .sgs-cta-section__body{font-size:' . sgs_font_size_value( $body_font_size_tablet ) . '}}';
	}
	if ( $body_font_size_mobile ) {
		$responsive_css .= '@media (max-width:599px){.' . $uid . ' .sgs-cta-section__body{font-size:' . sgs_font_size_value( $body_font_size_mobile ) . '}}';
	}
}

$wrapper_attr_args = array(
	'class' => implode( ' ', $classes ),
);
if ( $wrapper_styles ) {
	$wrapper_attr_args['style'] = implode( ';', $wrapper_styles ) . ';';
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_attr_args );

// Build background overlay.
$overlay_html = '';
if ( ! empty( $background_image['url'] ) ) {
	$overlay_html = sprintf(
		'<span class="sgs-cta-section__overlay" style="opacity:%s" aria-hidden="true"></span>',
		esc_attr( $background_image_opacity / 100 )
	);
}

// Build headline styles.
$h_classes          = array( 'sgs-cta-section__headline' );
$text_align_mobile  = $attributes['textAlignMobile'] ?? '';
$text_align_tablet  = $attributes['textAlignTablet'] ?? '';
$text_align_desktop = $attributes['textAlignDesktop'] ?? '';

if ( $text_align_mobile ) {
	$h_classes[] = 'sgs-text-align-m-' . $text_align_mobile; }
if ( $text_align_tablet ) {
	$h_classes[] = 'sgs-text-align-t-' . $text_align_tablet; }
if ( $text_align_desktop ) {
	$h_classes[] = 'sgs-text-align-d-' . $text_align_desktop; }

$h_styles = array();
if ( $headline_colour ) {
	$h_styles[] = 'color:' . sgs_colour_value( $headline_colour ); }
$headline_style_attr = $h_styles ? ' style="' . implode( ';', $h_styles ) . '"' : '';
$headline_class_attr = ' class="' . esc_attr( implode( ' ', $h_classes ) ) . '"';

// Build body styles.
$body_styles = array();
if ( $body_colour ) {
	$body_styles[] = 'color:' . sgs_colour_value( $body_colour );
}
if ( $body_font_size ) {
	$body_styles[] = 'font-size:' . sgs_font_size_value( $body_font_size );
}
$body_style_attr = $body_styles ? ' style="' . implode( ';', $body_styles ) . '"' : '';

// Build stats HTML.
$stats_html = '';
if ( ! empty( $stats ) ) {
	$stats_html .= '<div class="sgs-cta-section__stats">';
	foreach ( $stats as $stat ) {
		$stat_text = $stat['text'] ?? '';
		if ( ! $stat_text ) {
			continue;
		}
		$stats_html .= sprintf(
			'<span class="sgs-cta-section__stat">%s</span>',
			esc_html( $stat_text )
		);
	}
	$stats_html .= '</div>';
}

// Buttons are now rendered via sgs/multi-button + sgs/button InnerBlocks.
// $content is passed by WordPress and contains the rendered InnerBlocks output.
// Legacy buttons array attribute is handled by deprecated.js migration.
$buttons_html = '<div class="sgs-cta-section__buttons">' . $content . '</div>';

// Output responsive CSS if needed.
if ( $responsive_css ) {
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), wp_strip_all_tags( $responsive_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS generated from sanitised block attributes.
}

// Build ribbon HTML — content escaped with esc_html() at construction time.
$ribbon_html = '';
if ( $ribbon ) {
	$ribbon_html = '<span class="sgs-cta-section__ribbon" aria-hidden="true">' . esc_html( $ribbon ) . '</span>';
}

// Output. All variables are either pre-escaped (esc_html/esc_attr/esc_url at
// construction time) or passed through wp_kses_post(). The phpcs disable below
// silences the false-positive "not escaped inline" warnings on multi-arg printf.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
printf(
	'<section %s>%s%s<div class="sgs-cta-section__content"><h2%s%s>%s</h2><p class="sgs-cta-section__body"%s>%s</p>%s</div>%s</section>',
	$wrapper_attributes,
	$overlay_html,
	$ribbon_html,
	$headline_class_attr,
	$headline_style_attr,
	wp_kses_post( $headline ),
	$body_style_attr,
	wp_kses_post( $body ),
	$stats_html,
	$buttons_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
