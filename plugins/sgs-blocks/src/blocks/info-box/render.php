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
 *   hoverBorderColour, hoverScale, hoverShadow, hoverGrayscale,
 *   transitionDuration, transitionEasing, blockLink, blockLinkTarget,
 *   sgsAnimation, sgsAnimationDuration, sgsAnimationEasing, staggerDelay.
 *
 * HC2 cleanup (2026-06-08): the responsive icon-size / heading-fs / subtitle-fs
 * data-attrs were removed. They were dead — their CSS selectors targeted
 * .sgs-info-box__icon / __heading / __subtitle, which no longer exist now that
 * those elements render as child blocks (sgs/icon, sgs/heading, sgs/text).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (all card content).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

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

$sgs_allowed_scales  = array( '1.02', '1.05', '1.1' );
$sgs_allowed_shadows = array( 'sm', 'md', 'lg', 'glow' );

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
// Render: wrapper shell + InnerBlocks content. R-22-14: no scalar fallback.
// All card content (icon/media, heading, subtitle, description, button)
// is rendered via InnerBlocks. Never read scalar content attrs here.
//
// WS-4: CONTENT kind — width/spacing layers only (no bg/overlay/grid).
// The block's own background/colour/border CSS rides on $sgs_classes via the
// existing sgs-info-box BEM classes. No double-emit risk for CONTENT kind.
// The block-link wrapper, if present, wraps the full SGS_Container_Wrapper
// output so the anchor encloses the block wrapper (including WP anchor attr).
// ---------------------------------------------------------------------------

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
$sgs_card_html = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => $sgs_classes,
		'extra_styles'  => $sgs_wrapper_styles,
	)
);

// Block link wraps the entire card in an <a> tag.
if ( $sgs_block_link ) {
	$sgs_block_target = $sgs_block_link_tgt ? ' target="_blank" rel="noopener noreferrer"' : '';
	// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_block_target is a hardcoded safe string; $sgs_card_html from SGS_Container_Wrapper::render() is pre-sanitised.
	echo '<a href="' . esc_url( $sgs_block_link ) . '" class="sgs-block-link-wrapper"' . $sgs_block_target . '>'
		. $sgs_card_html
		. '</a>';
	// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
} else {
	echo $sgs_card_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised.
}
