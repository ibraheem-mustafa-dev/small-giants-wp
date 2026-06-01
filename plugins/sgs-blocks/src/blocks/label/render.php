<?php
/**
 * Server-side render for sgs/label.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/label {attrs} /-->`) produce the
 * expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-section-heading__label`
 * className (and the label text) never reach the deployed page.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$text                = $attributes['text'] ?? '';
$tag_name            = $attributes['tag'] ?? 'span';
$text_colour         = $attributes['textColour'] ?? '';
$background_colour   = $attributes['backgroundColour'] ?? '';
$font_family         = $attributes['fontFamily'] ?? '';
$font_size           = $attributes['fontSize'] ?? '';
$font_size_unit      = $attributes['fontSizeUnit'] ?? 'px';
$font_weight         = $attributes['fontWeight'] ?? '';
$line_height         = $attributes['lineHeight'] ?? '';
$line_height_unit    = $attributes['lineHeightUnit'] ?? '';
$letter_spacing      = $attributes['letterSpacing'] ?? '';
$letter_spacing_unit = $attributes['letterSpacingUnit'] ?? 'px';
$text_transform      = $attributes['textTransform'] ?? '';
$text_decoration     = $attributes['textDecoration'] ?? '';
$padding_top         = $attributes['paddingTop'] ?? '';
$padding_right       = $attributes['paddingRight'] ?? '';
$padding_bottom      = $attributes['paddingBottom'] ?? '';
$padding_left        = $attributes['paddingLeft'] ?? '';
$border_radius       = $attributes['borderRadius'] ?? '';

// Whitelist HTML tag (parity with save.js + safety).
$allowed_tags = array( 'span', 'p', 'div', 'small', 'em', 'strong' );
if ( ! in_array( $tag_name, $allowed_tags, true ) ) {
	$tag_name = 'span';
}

// CSS custom-property map (parity with save.js buildStyle()).
$style_parts = array();
if ( $text_colour ) {
	$style_parts[] = '--sgs-label-colour:' . sgs_colour_value( $text_colour );
}
if ( $background_colour ) {
	$style_parts[] = '--sgs-label-bg:' . sgs_colour_value( $background_colour );
}
if ( '' !== $font_size && null !== $font_size ) {
	$style_parts[] = '--sgs-label-font-size:' . esc_attr( $font_size . $font_size_unit );
}
if ( $font_weight ) {
	$style_parts[] = '--sgs-label-font-weight:' . esc_attr( $font_weight );
}
if ( '' !== $line_height && null !== $line_height ) {
	$style_parts[] = '--sgs-label-line-height:' . esc_attr( $line_height . $line_height_unit );
}
if ( '' !== $letter_spacing && null !== $letter_spacing ) {
	$style_parts[] = '--sgs-label-letter-spacing:' . esc_attr( $letter_spacing . $letter_spacing_unit );
}
if ( $text_transform ) {
	$style_parts[] = '--sgs-label-text-transform:' . esc_attr( $text_transform );
}
if ( $text_decoration ) {
	$style_parts[] = '--sgs-label-text-decoration:' . esc_attr( $text_decoration );
}
if ( '' !== $border_radius && null !== $border_radius ) {
	$style_parts[] = '--sgs-label-border-radius:' . intval( $border_radius ) . 'px';
}
// Emit padding custom property for pill styles (derived from block-style className).
$extra_classes = isset( $attributes['className'] ) ? $attributes['className'] : '';
$is_pill       = ( false !== strpos( $extra_classes, 'is-style-pill-fill' ) )
	|| ( false !== strpos( $extra_classes, 'is-style-pill-wrap' ) );
if ( $is_pill ) {
	$style_parts[] = '--sgs-label-padding:' . intval( $padding_top ) . 'px ' . intval( $padding_right ) . 'px ' . intval( $padding_bottom ) . 'px ' . intval( $padding_left ) . 'px';
}
if ( $font_family ) {
	$style_parts[] = '--sgs-label-font-family:' . esc_attr( $font_family );
}

$style_attr = $style_parts ? implode( ';', $style_parts ) : '';

// Wrapper class — get_block_wrapper_attributes() automatically merges in
// the block's `className` attr (which carries `is-style-{value}` when a
// block-style is active), so no manual is-style-* construction is needed.
$wrapper_args = array(
	'class' => 'wp-block-sgs-label',
);
if ( $style_attr ) {
	$wrapper_args['style'] = $style_attr;
}
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

printf(
	'<%1$s %2$s>%3$s</%1$s>',
	tag_escape( $tag_name ),
	$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_kses_post( $text )
);
