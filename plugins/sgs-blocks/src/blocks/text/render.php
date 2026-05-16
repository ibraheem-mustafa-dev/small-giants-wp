<?php
/**
 * Server-side render for sgs/text.
 *
 * Single-element body-text block. Emits one configurable HTML tag with inline
 * styles derived from the flat SGS attribute set. Designed as a drop-in
 * replacement for core/paragraph in the converter pipeline so per-class
 * inline-style attrs reach the rendered DOM — core/paragraph is static and
 * its save.js output is frozen, making JSON attrs invisible to the renderer.
 *
 * Responsive per-viewport overrides are emitted as a scoped <style> block
 * using the block anchor id (or a generated unique id) so multiple instances
 * on the same page never collide.
 *
 * @since 2026-05-17  Phase 9 — sgs/text block
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — block is leaf-level).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Extract attributes with safe defaults.
// ---------------------------------------------------------------------------

$text                        = isset( $attributes['text'] ) ? (string) $attributes['text'] : '';
$tag_name                    = $attributes['tag'] ?? 'p';
$text_colour                 = $attributes['textColour'] ?? '';
$font_size                   = isset( $attributes['fontSize'] ) ? $attributes['fontSize'] : null;
$font_size_unit              = $attributes['fontSizeUnit'] ?? 'px';
$font_size_tablet            = isset( $attributes['fontSizeTablet'] ) ? $attributes['fontSizeTablet'] : null;
$font_size_mobile            = isset( $attributes['fontSizeMobile'] ) ? $attributes['fontSizeMobile'] : null;
$font_weight                 = $attributes['fontWeight'] ?? '';
$line_height                 = isset( $attributes['lineHeight'] ) ? $attributes['lineHeight'] : null;
$line_height_unit            = $attributes['lineHeightUnit'] ?? 'em';
$line_height_tablet          = isset( $attributes['lineHeightTablet'] ) ? $attributes['lineHeightTablet'] : null;
$line_height_mobile          = isset( $attributes['lineHeightMobile'] ) ? $attributes['lineHeightMobile'] : null;
$letter_spacing              = isset( $attributes['letterSpacing'] ) ? $attributes['letterSpacing'] : null;
$letter_spacing_unit         = $attributes['letterSpacingUnit'] ?? 'em';
$font_style                  = $attributes['fontStyle'] ?? '';
$text_decoration             = $attributes['textDecoration'] ?? '';
$text_transform              = $attributes['textTransform'] ?? '';
$font_family                 = $attributes['fontFamily'] ?? '';
$margin_top                  = isset( $attributes['marginTop'] ) ? $attributes['marginTop'] : null;
$margin_right                = isset( $attributes['marginRight'] ) ? $attributes['marginRight'] : null;
$margin_bottom               = isset( $attributes['marginBottom'] ) ? $attributes['marginBottom'] : null;
$margin_left                 = isset( $attributes['marginLeft'] ) ? $attributes['marginLeft'] : null;
$margin_unit                 = $attributes['marginUnit'] ?? 'px';
$margin_top_tablet           = isset( $attributes['marginTopTablet'] ) ? $attributes['marginTopTablet'] : null;
$margin_right_tablet         = isset( $attributes['marginRightTablet'] ) ? $attributes['marginRightTablet'] : null;
$margin_bottom_tablet        = isset( $attributes['marginBottomTablet'] ) ? $attributes['marginBottomTablet'] : null;
$margin_left_tablet          = isset( $attributes['marginLeftTablet'] ) ? $attributes['marginLeftTablet'] : null;
$margin_top_mobile           = isset( $attributes['marginTopMobile'] ) ? $attributes['marginTopMobile'] : null;
$margin_right_mobile         = isset( $attributes['marginRightMobile'] ) ? $attributes['marginRightMobile'] : null;
$margin_bottom_mobile        = isset( $attributes['marginBottomMobile'] ) ? $attributes['marginBottomMobile'] : null;
$margin_left_mobile          = isset( $attributes['marginLeftMobile'] ) ? $attributes['marginLeftMobile'] : null;
$padding_top                 = isset( $attributes['paddingTop'] ) ? $attributes['paddingTop'] : null;
$padding_right               = isset( $attributes['paddingRight'] ) ? $attributes['paddingRight'] : null;
$padding_bottom              = isset( $attributes['paddingBottom'] ) ? $attributes['paddingBottom'] : null;
$padding_left                = isset( $attributes['paddingLeft'] ) ? $attributes['paddingLeft'] : null;
$padding_unit                = $attributes['paddingUnit'] ?? 'px';
$padding_top_tablet          = isset( $attributes['paddingTopTablet'] ) ? $attributes['paddingTopTablet'] : null;
$padding_right_tablet        = isset( $attributes['paddingRightTablet'] ) ? $attributes['paddingRightTablet'] : null;
$padding_bottom_tablet       = isset( $attributes['paddingBottomTablet'] ) ? $attributes['paddingBottomTablet'] : null;
$padding_left_tablet         = isset( $attributes['paddingLeftTablet'] ) ? $attributes['paddingLeftTablet'] : null;
$padding_top_mobile          = isset( $attributes['paddingTopMobile'] ) ? $attributes['paddingTopMobile'] : null;
$padding_right_mobile        = isset( $attributes['paddingRightMobile'] ) ? $attributes['paddingRightMobile'] : null;
$padding_bottom_mobile       = isset( $attributes['paddingBottomMobile'] ) ? $attributes['paddingBottomMobile'] : null;
$padding_left_mobile         = isset( $attributes['paddingLeftMobile'] ) ? $attributes['paddingLeftMobile'] : null;
$text_align                  = $attributes['textAlign'] ?? '';
$max_width                   = isset( $attributes['maxWidth'] ) ? $attributes['maxWidth'] : null;
$max_width_unit              = $attributes['maxWidthUnit'] ?? 'px';
$drop_cap                    = ! empty( $attributes['dropCap'] );
$first_letter_colour         = $attributes['firstLetterColour'] ?? '';
$first_letter_font_size      = isset( $attributes['firstLetterFontSize'] ) ? $attributes['firstLetterFontSize'] : null;
$first_letter_font_size_unit = $attributes['firstLetterFontSizeUnit'] ?? 'em';
$first_letter_font_weight    = $attributes['firstLetterFontWeight'] ?? '';

// ---------------------------------------------------------------------------
// 2. Soft-fail: nothing to render if text is empty.
// ---------------------------------------------------------------------------

if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
	return;
}

// ---------------------------------------------------------------------------
// 3. Validate tag against allowlist.
// ---------------------------------------------------------------------------

$allowed_tags = array( 'p', 'span', 'div', 'blockquote', 'em', 'strong' );
if ( ! in_array( $tag_name, $allowed_tags, true ) ) {
	$tag_name = 'p';
}

// ---------------------------------------------------------------------------
// 4. Build desktop inline-style string.
// Mirrors sgs_heading_build_slot_style() but applied to the single element.
// ---------------------------------------------------------------------------

/**
 * Build an inline style string from an array of CSS declarations.
 * Returns empty string if no declarations are present.
 *
 * @param array $parts CSS declaration strings (e.g. 'color:red').
 * @return string Inline style attribute value (no surrounding quotes).
 */
if ( ! function_exists( 'sgs_text_build_inline_style' ) ) {
	function sgs_text_build_inline_style( array $parts ): string {
		$parts = array_filter( $parts );
		return implode( ';', $parts );
	}
}

$style_parts = array();

if ( $text_colour ) {
	$style_parts[] = 'color:' . sgs_colour_value( $text_colour );
}

if ( null !== $font_size && '' !== $font_size ) {
	$style_parts[] = 'font-size:' . floatval( $font_size ) . esc_attr( $font_size_unit );
}

if ( $font_weight ) {
	$style_parts[] = 'font-weight:' . esc_attr( $font_weight );
}

if ( null !== $line_height && '' !== $line_height ) {
	$style_parts[] = 'line-height:' . floatval( $line_height ) . esc_attr( $line_height_unit );
}

if ( null !== $letter_spacing && '' !== $letter_spacing ) {
	$style_parts[] = 'letter-spacing:' . floatval( $letter_spacing ) . esc_attr( $letter_spacing_unit );
}

if ( $font_style ) {
	$style_parts[] = 'font-style:' . esc_attr( $font_style );
}

if ( $text_decoration ) {
	$style_parts[] = 'text-decoration:' . esc_attr( $text_decoration );
}

if ( $text_transform ) {
	$style_parts[] = 'text-transform:' . esc_attr( $text_transform );
}

if ( $font_family ) {
	$style_parts[] = 'font-family:' . esc_attr( $font_family );
}

if ( $text_align ) {
	$style_parts[] = 'text-align:' . esc_attr( $text_align );
}

if ( null !== $max_width && '' !== $max_width ) {
	$style_parts[] = 'max-width:' . floatval( $max_width ) . esc_attr( $max_width_unit );
}

// Margin — only emit each side when a non-null value is set.
if ( null !== $margin_top ) {
	$style_parts[] = 'margin-top:' . floatval( $margin_top ) . esc_attr( $margin_unit );
}
if ( null !== $margin_right ) {
	$style_parts[] = 'margin-right:' . floatval( $margin_right ) . esc_attr( $margin_unit );
}
if ( null !== $margin_bottom ) {
	$style_parts[] = 'margin-bottom:' . floatval( $margin_bottom ) . esc_attr( $margin_unit );
}
if ( null !== $margin_left ) {
	$style_parts[] = 'margin-left:' . floatval( $margin_left ) . esc_attr( $margin_unit );
}

// Padding.
if ( null !== $padding_top ) {
	$style_parts[] = 'padding-top:' . floatval( $padding_top ) . esc_attr( $padding_unit );
}
if ( null !== $padding_right ) {
	$style_parts[] = 'padding-right:' . floatval( $padding_right ) . esc_attr( $padding_unit );
}
if ( null !== $padding_bottom ) {
	$style_parts[] = 'padding-bottom:' . floatval( $padding_bottom ) . esc_attr( $padding_unit );
}
if ( null !== $padding_left ) {
	$style_parts[] = 'padding-left:' . floatval( $padding_left ) . esc_attr( $padding_unit );
}

$inline_style = sgs_text_build_inline_style( $style_parts );

// ---------------------------------------------------------------------------
// 5. Responsive scoped <style> block.
// Uses block anchor or a unique id to scope overrides so multiple
// instances on the same page never collide.
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
if ( ! $anchor ) {
	// Generate a unique id for this render; not persisted but consistent within a request.
	$anchor = 'sgs-text-' . wp_unique_id();
}
$scope = '#' . esc_attr( $anchor );

/**
 * Build a CSS declaration block for a single responsive breakpoint.
 *
 * @param string     $scope         CSS selector (e.g. '#sgs-text-1').
 * @param string     $media         Media query string (e.g. '@media (max-width:767px)').
 * @param float|null $fs            Font size override.
 * @param string     $fs_unit       Font size unit.
 * @param float|null $lh            Line-height override.
 * @param string     $lh_unit       Line-height unit.
 * @param float|null $mt            Margin-top override.
 * @param float|null $mr            Margin-right override.
 * @param float|null $mb            Margin-bottom override.
 * @param float|null $ml            Margin-left override.
 * @param string     $m_unit        Margin unit.
 * @param float|null $pt            Padding-top override.
 * @param float|null $pr            Padding-right override.
 * @param float|null $pb            Padding-bottom override.
 * @param float|null $pl            Padding-left override.
 * @param string     $p_unit        Padding unit.
 * @return string CSS string (empty when no overrides are set).
 */
if ( ! function_exists( 'sgs_text_responsive_css' ) ) {
function sgs_text_responsive_css(
	string $scope,
	string $media,
	?float $fs,
	string $fs_unit,
	?float $lh,
	string $lh_unit,
	?float $mt,
	?float $mr,
	?float $mb,
	?float $ml,
	string $m_unit,
	?float $pt,
	?float $pr,
	?float $pb,
	?float $pl,
	string $p_unit
): string {
	$decls = array();

	if ( null !== $fs ) {
		$decls[] = 'font-size:' . $fs . $fs_unit;
	}
	if ( null !== $lh ) {
		$decls[] = 'line-height:' . $lh . $lh_unit;
	}
	if ( null !== $mt ) {
		$decls[] = 'margin-top:' . $mt . $m_unit;
	}
	if ( null !== $mr ) {
		$decls[] = 'margin-right:' . $mr . $m_unit;
	}
	if ( null !== $mb ) {
		$decls[] = 'margin-bottom:' . $mb . $m_unit;
	}
	if ( null !== $ml ) {
		$decls[] = 'margin-left:' . $ml . $m_unit;
	}
	if ( null !== $pt ) {
		$decls[] = 'padding-top:' . $pt . $p_unit;
	}
	if ( null !== $pr ) {
		$decls[] = 'padding-right:' . $pr . $p_unit;
	}
	if ( null !== $pb ) {
		$decls[] = 'padding-bottom:' . $pb . $p_unit;
	}
	if ( null !== $pl ) {
		$decls[] = 'padding-left:' . $pl . $p_unit;
	}

	if ( empty( $decls ) ) {
		return '';
	}

	return $media . '{' . $scope . '{' . implode( ';', $decls ) . '}}';
}
}

// Tablet (768px – 1023px).
$css_tablet = sgs_text_responsive_css(
	$scope,
	'@media (min-width:768px) and (max-width:1023px)',
	null !== $font_size_tablet ? floatval( $font_size_tablet ) : null,
	$font_size_unit,
	null !== $line_height_tablet ? floatval( $line_height_tablet ) : null,
	$line_height_unit,
	null !== $margin_top_tablet ? floatval( $margin_top_tablet ) : null,
	null !== $margin_right_tablet ? floatval( $margin_right_tablet ) : null,
	null !== $margin_bottom_tablet ? floatval( $margin_bottom_tablet ) : null,
	null !== $margin_left_tablet ? floatval( $margin_left_tablet ) : null,
	$margin_unit,
	null !== $padding_top_tablet ? floatval( $padding_top_tablet ) : null,
	null !== $padding_right_tablet ? floatval( $padding_right_tablet ) : null,
	null !== $padding_bottom_tablet ? floatval( $padding_bottom_tablet ) : null,
	null !== $padding_left_tablet ? floatval( $padding_left_tablet ) : null,
	$padding_unit
);

// Mobile (≤ 767px).
$css_mobile = sgs_text_responsive_css(
	$scope,
	'@media (max-width:767px)',
	null !== $font_size_mobile ? floatval( $font_size_mobile ) : null,
	$font_size_unit,
	null !== $line_height_mobile ? floatval( $line_height_mobile ) : null,
	$line_height_unit,
	null !== $margin_top_mobile ? floatval( $margin_top_mobile ) : null,
	null !== $margin_right_mobile ? floatval( $margin_right_mobile ) : null,
	null !== $margin_bottom_mobile ? floatval( $margin_bottom_mobile ) : null,
	null !== $margin_left_mobile ? floatval( $margin_left_mobile ) : null,
	$margin_unit,
	null !== $padding_top_mobile ? floatval( $padding_top_mobile ) : null,
	null !== $padding_right_mobile ? floatval( $padding_right_mobile ) : null,
	null !== $padding_bottom_mobile ? floatval( $padding_bottom_mobile ) : null,
	null !== $padding_left_mobile ? floatval( $padding_left_mobile ) : null,
	$padding_unit
);

// Drop-cap ::first-letter CSS (scoped to instance id).
$css_drop_cap = '';
if ( $drop_cap ) {
	$fl_decls = array(
		'float:left',
		'font-size:' . ( null !== $first_letter_font_size ? floatval( $first_letter_font_size ) . esc_attr( $first_letter_font_size_unit ) : '3em' ),
		'line-height:0.8',
		'margin-right:0.1em',
		'margin-top:0.05em',
	);
	if ( $first_letter_font_weight ) {
		$fl_decls[] = 'font-weight:' . esc_attr( $first_letter_font_weight );
	}
	if ( $first_letter_colour ) {
		$fl_decls[] = 'color:' . sgs_colour_value( $first_letter_colour );
	}
	$css_drop_cap = $scope . '::first-letter{' . implode( ';', $fl_decls ) . '}';
}

$responsive_css = trim( $css_tablet . $css_mobile . $css_drop_cap );

// ---------------------------------------------------------------------------
// 6. Assemble wrapper attributes.
// get_block_wrapper_attributes() merges className + custom anchor so WP
// adds the block class, any editor-assigned custom class, and the anchor id.
// ---------------------------------------------------------------------------

$wrapper_args = array( 'class' => 'wp-block-sgs-text' );
if ( $inline_style ) {
	$wrapper_args['style'] = $inline_style;
}
// Pass anchor so get_block_wrapper_attributes() writes id="…" on the element —
// this is the same id used to scope the responsive <style> block.
if ( $anchor && isset( $attributes['anchor'] ) ) {
	$wrapper_args['id'] = esc_attr( $anchor );
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// ---------------------------------------------------------------------------
// 7. Output.
// ---------------------------------------------------------------------------

if ( $responsive_css ) {
	printf( '<style>%s</style>', $responsive_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

printf(
	'<%1$s %2$s>%3$s</%1$s>',
	tag_escape( $tag_name ),
	$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_kses_post( $text )
);
