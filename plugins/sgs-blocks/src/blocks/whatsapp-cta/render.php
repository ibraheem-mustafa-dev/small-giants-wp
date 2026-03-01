<?php
/**
 * Server-side render for the SGS WhatsApp CTA block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$phone_number   = $attributes['phoneNumber'] ?? '';
$message        = $attributes['message'] ?? '';
$variant        = $attributes['variant'] ?? 'floating';
$label          = $attributes['label'] ?? '';
$show_mobile    = $attributes['showOnMobile'] ?? true;
$show_desktop   = $attributes['showOnDesktop'] ?? true;
$label_colour   = $attributes['labelColour'] ?? '';
$label_fontsize = $attributes['labelFontSize'] ?? '';
$bg_colour      = $attributes['backgroundColour'] ?? '';

// Nothing to render if no phone number is provided.
if ( ! $phone_number ) {
	return;
}

// Build visibility modifier classes.
$visibility_classes = array();
if ( ! $show_mobile ) {
	$visibility_classes[] = 'sgs-whatsapp-cta--hide-mobile';
}
if ( ! $show_desktop ) {
	$visibility_classes[] = 'sgs-whatsapp-cta--hide-desktop';
}

$classes = array_merge(
	array(
		'sgs-whatsapp-cta',
		'sgs-whatsapp-cta--' . esc_attr( $variant ),
	),
	$visibility_classes
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build button inline styles.
$btn_styles = array();
if ( $label_colour ) {
	$btn_styles[] = 'color:' . sgs_colour_value( $label_colour );
}
if ( $label_fontsize ) {
	$btn_styles[] = 'font-size:' . sgs_font_size_value( $label_fontsize );
}
if ( $bg_colour ) {
	$btn_styles[] = 'background-color:' . sgs_colour_value( $bg_colour );
}
$btn_style_attr = $btn_styles ? ' style="' . implode( ';', $btn_styles ) . '"' : '';

// Build the WhatsApp deep-link URL.
$encoded_message = $message ? rawurlencode( $message ) : '';
$wa_url          = 'https://wa.me/' . esc_attr( $phone_number );
if ( $encoded_message ) {
	$wa_url .= '?text=' . $encoded_message;
}

// WhatsApp logo SVG (official brand path — kept inline for zero dependency).
$wa_svg = '<svg class="sgs-whatsapp-cta__icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">'
	. '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>'
	. '</svg>';

// Build label content based on variant.
$label_html = '';
if ( 'floating' !== $variant && $label ) {
	$label_html = '<span class="sgs-whatsapp-cta__label">' . wp_kses_post( $label ) . '</span>';
} elseif ( 'floating' === $variant ) {
	// Screen-reader text for floating button (no visible label).
	$label_html = '<span class="sgs-sr-only">' . esc_html__( 'Chat on WhatsApp', 'sgs-blocks' ) . '</span>';
}

// Determine aria-label: only needed when there is no visible label.
$aria_label_attr = ( ! $label && 'floating' !== $variant )
	? ' aria-label="' . esc_attr__( 'Chat on WhatsApp', 'sgs-blocks' ) . '"'
	: '';

$btn_html = sprintf(
	'<a href="%s" class="sgs-whatsapp-cta__btn"%s target="_blank" rel="noopener noreferrer"%s>%s%s</a>',
	esc_url( $wa_url ),
	$btn_style_attr,
	$aria_label_attr,
	$wa_svg,
	$label_html
);

printf( '<div %s>%s</div>', $wrapper_attributes, $btn_html );
