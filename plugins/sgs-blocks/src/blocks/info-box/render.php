<?php
/**
 * Server-side render for the SGS Info Box block.
 *
 * FR-22-6 migration: renders the wrapper shell (card-style / hover / media-position
 * driven classes + CSS custom property vars for hover colours, scale, shadow) and
 * echoes $content (InnerBlocks) for all card content — icon/media, heading,
 * subtitle, text body, and button.
 *
 * Scalar CONTENT attributes (heading, subtitle, description, icon, mediaType,
 * image, boxMedia, mediaEmoji) are no longer read here. They are retained in
 * block.json for deprecated.js back-compat only. Rendering from those scalars
 * was removed in this FR-22-6 migration. R-22-14: NO legacy fallback hack.
 *
 * Scalar STYLING/LAYOUT attributes consumed here (wrapper-level only):
 *   cardStyle, hoverEffect, iconPosition, hoverBackgroundColour, hoverTextColour,
 *   hoverBorderColour, hoverScale, hoverShadow, hoverGrayscale, iconSizeTablet,
 *   iconSizeMobile, headingFontSizeTablet, headingFontSizeMobile,
 *   subtitleFontSizeTablet, subtitleFontSizeMobile, transitionDuration,
 *   transitionEasing, blockLink, blockLinkTarget, sgsAnimation,
 *   sgsAnimationDuration, sgsAnimationEasing, staggerDelay.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (all card content).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// Extract LAYOUT/STYLING scalar attributes with defaults.
// ---------------------------------------------------------------------------
$sgs_card_style     = isset( $attributes['cardStyle'] ) ? $attributes['cardStyle'] : 'elevated';
$sgs_hover_effect   = isset( $attributes['hoverEffect'] ) ? $attributes['hoverEffect'] : 'lift';
$sgs_icon_position  = isset( $attributes['iconPosition'] ) ? $attributes['iconPosition'] : 'top';
$sgs_hover_bg       = isset( $attributes['hoverBackgroundColour'] ) ? $attributes['hoverBackgroundColour'] : '';
$sgs_hover_text     = isset( $attributes['hoverTextColour'] ) ? $attributes['hoverTextColour'] : '';
$sgs_hover_border   = isset( $attributes['hoverBorderColour'] ) ? $attributes['hoverBorderColour'] : '';
$sgs_hover_scale    = isset( $attributes['hoverScale'] ) ? $attributes['hoverScale'] : '';
$sgs_hover_shadow   = isset( $attributes['hoverShadow'] ) ? $attributes['hoverShadow'] : '';
$sgs_hover_gray     = isset( $attributes['hoverGrayscale'] ) ? (bool) $attributes['hoverGrayscale'] : false;
$sgs_icon_sz_tablet = isset( $attributes['iconSizeTablet'] ) ? $attributes['iconSizeTablet'] : '';
$sgs_icon_sz_mobile = isset( $attributes['iconSizeMobile'] ) ? $attributes['iconSizeMobile'] : '';
$sgs_head_fs_tablet = isset( $attributes['headingFontSizeTablet'] ) ? $attributes['headingFontSizeTablet'] : '';
$sgs_head_fs_mobile = isset( $attributes['headingFontSizeMobile'] ) ? $attributes['headingFontSizeMobile'] : '';
$sgs_sub_fs_tablet  = isset( $attributes['subtitleFontSizeTablet'] ) ? $attributes['subtitleFontSizeTablet'] : '';
$sgs_sub_fs_mobile  = isset( $attributes['subtitleFontSizeMobile'] ) ? $attributes['subtitleFontSizeMobile'] : '';
$sgs_block_link     = isset( $attributes['blockLink'] ) ? $attributes['blockLink'] : '';
$sgs_block_link_tgt = isset( $attributes['blockLinkTarget'] ) ? (bool) $attributes['blockLinkTarget'] : false;

// ---------------------------------------------------------------------------
// Wrapper styles (CSS custom properties for hover/transition effects).
// ---------------------------------------------------------------------------
$sgs_wrapper_styles = array();
$sgs_wrapper_styles = array_merge( $sgs_wrapper_styles, sgs_transition_vars( $attributes ) );

if ( $sgs_hover_bg ) {
	$sgs_wrapper_styles[] = '--sgs-hover-bg:' . sgs_colour_value( $sgs_hover_bg );
}
if ( $sgs_hover_text ) {
	$sgs_wrapper_styles[] = '--sgs-hover-text:' . sgs_colour_value( $sgs_hover_text );
}
if ( $sgs_hover_border ) {
	$sgs_wrapper_styles[] = '--sgs-hover-border:' . sgs_colour_value( $sgs_hover_border );
}

$sgs_allowed_scales   = array( '1.02', '1.05', '1.1' );
$sgs_allowed_shadows  = array( 'sm', 'md', 'lg', 'glow' );
$sgs_valid_icon_sizes = array( 'small', 'medium', 'large' );
$sgs_valid_font_sizes = array( 'small', 'medium', 'large', 'x-large', 'xx-large' );

// ---------------------------------------------------------------------------
// Wrapper classes.
// ---------------------------------------------------------------------------
$sgs_classes = array(
	'sgs-info-box',
	'sgs-info-box--' . esc_attr( $sgs_card_style ),
	'sgs-info-box--hover-' . esc_attr( $sgs_hover_effect ),
	'sgs-info-box--media-' . esc_attr( $sgs_icon_position ),
);

if ( $sgs_hover_scale && in_array( $sgs_hover_scale, $sgs_allowed_scales, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $sgs_hover_scale );
	$sgs_classes[]        = 'sgs-has-hover-scale';
}
if ( $sgs_hover_shadow && in_array( $sgs_hover_shadow, $sgs_allowed_shadows, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $sgs_hover_shadow ) . ')';
	$sgs_classes[]        = 'sgs-has-hover';
}
if ( $sgs_hover_gray ) {
	$sgs_classes[] = 'sgs-has-grayscale';
}

// ---------------------------------------------------------------------------
// Build get_block_wrapper_attributes() args.
// ---------------------------------------------------------------------------
$sgs_wrapper_attr_args = array(
	'class' => implode( ' ', $sgs_classes ),
);
if ( $sgs_wrapper_styles ) {
	$sgs_wrapper_attr_args['style'] = implode( ';', $sgs_wrapper_styles ) . ';';
}

// Responsive data attrs (consumed by CSS via data-* attribute selectors).
if ( $sgs_icon_sz_tablet && in_array( $sgs_icon_sz_tablet, $sgs_valid_icon_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-icon-size-tablet'] = $sgs_icon_sz_tablet;
}
if ( $sgs_icon_sz_mobile && in_array( $sgs_icon_sz_mobile, $sgs_valid_icon_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-icon-size-mobile'] = $sgs_icon_sz_mobile;
}
if ( $sgs_head_fs_tablet && in_array( $sgs_head_fs_tablet, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-heading-fs-tablet'] = $sgs_head_fs_tablet;
}
if ( $sgs_head_fs_mobile && in_array( $sgs_head_fs_mobile, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-heading-fs-mobile'] = $sgs_head_fs_mobile;
}
if ( $sgs_sub_fs_tablet && in_array( $sgs_sub_fs_tablet, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-subtitle-fs-tablet'] = $sgs_sub_fs_tablet;
}
if ( $sgs_sub_fs_mobile && in_array( $sgs_sub_fs_mobile, $sgs_valid_font_sizes, true ) ) {
	$sgs_wrapper_attr_args['data-subtitle-fs-mobile'] = $sgs_sub_fs_mobile;
}

$sgs_wrapper_attributes = get_block_wrapper_attributes( $sgs_wrapper_attr_args );

// ---------------------------------------------------------------------------
// Render: wrapper shell + InnerBlocks content. R-22-14: no scalar fallback.
// All card content (icon/media, heading, subtitle, description, button)
// is rendered via InnerBlocks. Never read scalar content attrs here.
// ---------------------------------------------------------------------------
$sgs_inner_html = '<div ' . $sgs_wrapper_attributes . '>'
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
	. $content
	. '</div>';

// Block link wraps the entire card in an <a> tag.
if ( $sgs_block_link ) {
	$sgs_block_target = $sgs_block_link_tgt ? ' target="_blank" rel="noopener noreferrer"' : '';
	echo '<a href="' . esc_url( $sgs_block_link ) . '" class="sgs-block-link-wrapper"' . $sgs_block_target . '>' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_block_target is a hardcoded safe string.
		. $sgs_inner_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		. '</a>';
} else {
	echo $sgs_inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
