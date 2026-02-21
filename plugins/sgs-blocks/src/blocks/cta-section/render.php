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
$headline          = $attributes['headline'] ?? '';
$body              = $attributes['body'] ?? '';
$buttons           = $attributes['buttons'] ?? array();
$layout            = $attributes['layout'] ?? 'centred';
$headline_colour   = $attributes['headlineColour'] ?? '';
$body_colour       = $attributes['bodyColour'] ?? '';
$body_font_size    = $attributes['bodyFontSize'] ?? '';
$button_colour     = $attributes['buttonColour'] ?? '';
$button_background = $attributes['buttonBackground'] ?? '';

// Build wrapper classes.
$classes = array(
	'sgs-cta-section',
	'sgs-cta-section--' . esc_attr( $layout ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build headline styles.
$headline_style_attr = '';
if ( $headline_colour ) {
	$headline_style_attr = ' style="color:' . sgs_colour_value( $headline_colour ) . '"';
}

// Build body styles.
$body_styles = array();
if ( $body_colour ) {
	$body_styles[] = 'color:' . sgs_colour_value( $body_colour );
}
if ( $body_font_size ) {
	$body_styles[] = 'font-size:' . sgs_font_size_value( $body_font_size );
}
$body_style_attr = $body_styles ? ' style="' . implode( ';', $body_styles ) . '"' : '';

// Build buttons HTML.
$buttons_html = '';
if ( ! empty( $buttons ) ) {
	$buttons_html .= '<div class="sgs-cta-section__buttons">';
	foreach ( $buttons as $btn ) {
		$btn_text  = $btn['text'] ?? '';
		$btn_url   = $btn['url'] ?? '';
		$btn_style = $btn['style'] ?? 'accent';

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
		$btn_style_attr = $btn_styles ? ' style="' . implode( ';', $btn_styles ) . '"' : '';

		$buttons_html .= sprintf(
			'<a href="%s" class="sgs-cta-section__btn sgs-cta-section__btn--%s"%s>%s</a>',
			esc_url( $btn_url ),
			esc_attr( $btn_style ),
			$btn_style_attr,
			esc_html( $btn_text )
		);
	}
	$buttons_html .= '</div>';
}

// Output.
printf(
	'<section %s><div class="sgs-cta-section__content"><h2 class="sgs-cta-section__headline"%s>%s</h2><p class="sgs-cta-section__body"%s>%s</p></div>%s</section>',
	$wrapper_attributes,
	$headline_style_attr,
	wp_kses_post( $headline ),
	$body_style_attr,
	wp_kses_post( $body ),
	$buttons_html
);
