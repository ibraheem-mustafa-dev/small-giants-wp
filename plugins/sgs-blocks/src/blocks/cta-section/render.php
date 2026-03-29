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
$headline                = $attributes['headline'] ?? '';
$body                    = $attributes['body'] ?? '';
$buttons                 = $attributes['buttons'] ?? array();
$layout                  = $attributes['layout'] ?? 'centred';
$headline_colour         = $attributes['headlineColour'] ?? '';
$body_colour             = $attributes['bodyColour'] ?? '';
$body_font_size          = $attributes['bodyFontSize'] ?? '';
$body_font_size_tablet   = $attributes['bodyFontSizeTablet'] ?? '';
$body_font_size_mobile   = $attributes['bodyFontSizeMobile'] ?? '';
$button_colour           = $attributes['buttonColour'] ?? '';
$button_background       = $attributes['buttonBackground'] ?? '';
$button_border_colour    = $attributes['buttonBorderColour'] ?? '';
$button_border_width     = $attributes['buttonBorderWidth'] ?? null;
$button_border_radius    = $attributes['buttonBorderRadius'] ?? null;

// Block-level button style variant and size (#199, #200).
$allowed_button_styles = array( 'solid', 'outline', 'ghost', 'gradient', 'accent', 'primary' );
$block_button_style    = in_array( $attributes['buttonStyle'] ?? '', $allowed_button_styles, true )
	? sanitize_key( $attributes['buttonStyle'] )
	: 'solid';

$allowed_button_sizes  = array( 'xs', 'sm', 'md', 'lg', 'xl' );
$block_button_size     = in_array( $attributes['buttonSize'] ?? '', $allowed_button_sizes, true )
	? sanitize_key( $attributes['buttonSize'] )
	: 'md';
$background_image        = $attributes['backgroundImage'] ?? null;
$background_image_opacity = $attributes['backgroundImageOpacity'] ?? 30;
$stats                   = $attributes['stats'] ?? array();

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

// Build responsive body font-size CSS.
$responsive_css = '';
if ( $body_font_size_tablet || $body_font_size_mobile ) {
	$uid = 'sgs-cta-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
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
$h_classes = array('sgs-cta-section__headline');
$letter_spacing     = $attributes['letterSpacing'] ?? '';
$text_transform     = $attributes['textTransform'] ?? '';
$text_align_mobile  = $attributes['textAlignMobile'] ?? '';
$text_align_tablet  = $attributes['textAlignTablet'] ?? '';
$text_align_desktop = $attributes['textAlignDesktop'] ?? '';

if ( $text_align_mobile ) { $h_classes[] = 'sgs-text-align-m-' . $text_align_mobile; }
if ( $text_align_tablet ) { $h_classes[] = 'sgs-text-align-t-' . $text_align_tablet; }
if ( $text_align_desktop ) { $h_classes[] = 'sgs-text-align-d-' . $text_align_desktop; }

$h_styles = array();
if ( $headline_colour ) { $h_styles[] = 'color:' . sgs_colour_value( $headline_colour ); }
if ( $letter_spacing ) { $h_styles[] = 'letter-spacing:' . esc_attr($letter_spacing); }
if ( $text_transform ) { $h_styles[] = 'text-transform:' . esc_attr($text_transform); }

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

// Build buttons HTML.
$buttons_html = '';
if ( ! empty( $buttons ) ) {
	$buttons_html .= '<div class="sgs-cta-section__buttons">';
	foreach ( $buttons as $btn ) {
		$btn_text  = $btn['text'] ?? '';
		$btn_url   = $btn['url'] ?? '';
		$btn_style = $btn['style'] ?? 'accent';
		$btn_icon  = $btn['icon'] ?? '';

		if ( ! $btn_text || ! $btn_url ) {
			continue;
		}

		$btn_styles = array();
		if ( $button_colour ) {
			$btn_styles[] = 'color:' . sgs_colour_value( $button_colour );
		}
		if ( $button_background ) {
			$btn_styles[] = 'background-color:' . sgs_colour_value( $button_background );
		}
		if ( $button_border_colour ) {
			$btn_styles[] = 'border-color:' . sgs_colour_value( $button_border_colour );
			$btn_styles[] = 'border-style:solid';
		}
		if ( null !== $button_border_width ) {
			$btn_styles[] = 'border-width:' . absint( $button_border_width ) . 'px';
			if ( ! $button_border_colour ) {
				$btn_styles[] = 'border-style:solid';
			}
		}
		if ( null !== $button_border_radius ) {
			$btn_styles[] = 'border-radius:' . absint( $button_border_radius ) . 'px';
		}
		$btn_style_attr = $btn_styles ? ' style="' . implode( ';', $btn_styles ) . '"' : '';

		$icon_html = '';
		if ( $btn_icon ) {
			$icon_html = sprintf(
				'<span class="sgs-cta-section__btn-icon" aria-hidden="true">%s</span>',
				esc_html( $btn_icon )
			);
		}

		// Use block-level style as default; per-button style overrides when explicitly set.
		$effective_style = ! empty( $btn['style'] ) ? sanitize_key( $btn['style'] ) : $block_button_style;

		$buttons_html .= sprintf(
			'<a href="%s" class="sgs-cta-section__btn sgs-cta-section__btn--%s sgs-cta-section__btn--size-%s"%s>%s%s</a>',
			esc_url( $btn_url ),
			esc_attr( $effective_style ),
			esc_attr( $block_button_size ),
			$btn_style_attr,
			$icon_html,
			esc_html( $btn_text )
		);
	}
	$buttons_html .= '</div>';
}

// Output responsive CSS if needed.
if ( $responsive_css ) {
	printf( '<style id="%s">%s</style>', esc_attr( $uid ), $responsive_css );
}

// Output.
printf(
	'<section %s>%s<div class="sgs-cta-section__content"><h2%s%s>%s</h2><p class="sgs-cta-section__body"%s>%s</p>%s</div>%s</section>',
	$wrapper_attributes,
	$overlay_html,
	$headline_class_attr,
	$headline_style_attr,
	wp_kses_post( $headline ),
	$body_style_attr,
	wp_kses_post( $body ),
	$stats_html,
	$buttons_html
);
