<?php
/**
 * Server-side render for the SGS WhatsApp CTA block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused - no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$phone_number    = $attributes['phoneNumber'] ?? '';
$message         = $attributes['message'] ?? '';
$variant         = $attributes['variant'] ?? 'floating';
$label           = $attributes['label'] ?? '';
$show_on_mobile  = $attributes['showOnMobile'] ?? true;
$show_on_desktop = $attributes['showOnDesktop'] ?? true;
$label_colour    = sgs_colour_value( $attributes['labelColour'] ?? '' );
$label_font_size = sgs_font_size_value( $attributes['labelFontSize'] ?? '' );
$bg_colour       = sgs_colour_value( $attributes['backgroundColour'] ?? 'whatsapp' );

// Do not render if no phone number is set.
if ( ! $phone_number ) {
	return;
}

// Build WhatsApp URL — phone number contains only digits, rawurlencode the message.
$clean_phone     = preg_replace( '/[^0-9]/', '', $phone_number );
$encoded_message = $message ? rawurlencode( $message ) : '';
$wa_url          = 'https://wa.me/' . $clean_phone;
if ( $encoded_message ) {
	$wa_url .= '?text=' . $encoded_message;
}

// Visibility classes.
$visibility_classes = array();
if ( ! $show_on_mobile ) {
	$visibility_classes[] = 'sgs-whatsapp-cta--hide-mobile';
}
if ( ! $show_on_desktop ) {
	$visibility_classes[] = 'sgs-whatsapp-cta--hide-desktop';
}

// Wrapper classes.
$wrapper_classes = array_merge(
	array(
		'sgs-whatsapp-cta',
		'sgs-whatsapp-cta--' . sanitize_html_class( $variant ),
	),
	$visibility_classes
);

// Button inline styles.
$btn_styles = array();
if ( $label_colour ) {
	$btn_styles[] = 'color:' . $label_colour;
}
if ( $label_font_size ) {
	$btn_styles[] = 'font-size:' . $label_font_size;
}
if ( $bg_colour ) {
	$btn_styles[] = 'background-color:' . $bg_colour;
}
$btn_style_attr = $btn_styles
	? ' style="' . esc_attr( implode( ';', $btn_styles ) ) . '"'
	: '';

// Wrapper attributes from block supports (spacing, border, anchor, etc.).
$wrapper_attributes = get_block_wrapper_attributes(
	array( 'class' => implode( ' ', $wrapper_classes ) )
);

// Accessible label: use custom label, fall back to generic.
$accessible_label = $label ? $label : __( 'Chat on WhatsApp', 'sgs-blocks' );

// aria-label only needed when there is no visible text label (floating variant).
$aria_label_attr = ( 'floating' === $variant )
	? ' aria-label="' . esc_attr( $accessible_label ) . '"'
	: '';

/*
 * WhatsApp logo SVG — official brand path.
 * Uses fill="currentColor" so CSS controls the colour.
 * Split across variables to stay within the 120-character line limit.
 */
$svg_path_1 = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15';
$svg_path_1 .= '-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15';
$svg_path_1 .= '-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297';
$svg_path_1 .= '-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497';
$svg_path_1 .= '.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207';
$svg_path_1 .= '-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01';
$svg_path_1 .= '-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479';
$svg_path_1 .= ' 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487';
$svg_path_1 .= '.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118';
$svg_path_1 .= '.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413';
$svg_path_1 .= '-.074-.124-.272-.198-.57-.347';

$svg_path_2 = 'm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214';
$svg_path_2 .= '-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26';
$svg_path_2 .= 'c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898';
$svg_path_2 .= 'a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884';

$svg_path_3 = 'm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892';
$svg_path_3 .= 'c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654';
$svg_path_3 .= 'a11.882 11.882 0 0 0 5.683 1.448h.005';
$svg_path_3 .= 'c6.554 0 11.89-5.335 11.893-11.893';
$svg_path_3 .= 'a11.821 11.821 0 0 0-3.48-8.413';

$whatsapp_svg  = '<svg class="sgs-whatsapp-cta__icon" xmlns="http://www.w3.org/2000/svg"';
$whatsapp_svg .= ' viewBox="0 0 24 24" width="24" height="24"';
$whatsapp_svg .= ' fill="currentColor" aria-hidden="true" focusable="false">';
$whatsapp_svg .= '<path d="' . $svg_path_1 . $svg_path_2 . $svg_path_3 . '"/>';
$whatsapp_svg .= '</svg>';

?>
<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup. ?>>
	<a
		href="<?php echo esc_url( $wa_url ); ?>"
		class="sgs-whatsapp-cta__btn"
		<?php echo $btn_style_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- value is built from esc_attr()-wrapped output. ?>
		target="_blank"
		rel="noopener noreferrer"
		<?php echo $aria_label_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- value is built from esc_attr()-wrapped output. ?>
	>
		<?php echo $whatsapp_svg; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG is a hardcoded constant with no user input. ?>
		<?php if ( 'floating' !== $variant && $label ) : ?>
			<span class="sgs-whatsapp-cta__label"><?php echo esc_html( $label ); ?></span>
		<?php elseif ( 'floating' === $variant ) : ?>
			<span class="sgs-sr-only"><?php echo esc_html( $accessible_label ); ?></span>
		<?php endif; ?>
	</a>
</div>
